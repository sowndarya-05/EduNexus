const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Payment = require('../models/Payment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ExcelJS = require('exceljs');

// Status rank helper for sorting (most urgent first: overdue -> partially_paid -> pending -> paid)
const STATUS_RANK = {
    overdue: 1,
    partially_paid: 2,
    pending: 3,
    paid: 4
};

// @desc    Record partial or full payment for a fee record
// @route   PATCH /api/admin/fees/:feeId/record-payment
// @access  Private (Admin)
const recordPayment = async (req, res) => {
    try {
        const { feeId } = req.params;
        const { amount, paymentMode = 'cash', note = '' } = req.body;

        const payAmount = Number(amount);
        if (isNaN(payAmount) || payAmount <= 0) {
            return res.status(400).json({ message: 'Payment amount must be a number greater than 0' });
        }

        const fee = await Fee.findById(feeId);
        if (!fee || fee.isDeleted) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const remainingBalance = fee.amount - fee.amountPaid;
        if (payAmount > remainingBalance) {
            return res.status(400).json({
                message: `Payment amount of ₹${payAmount} exceeds remaining balance of ₹${remainingBalance}`
            });
        }

        // Push new entry to paymentHistory
        fee.paymentHistory.push({
            amount: payAmount,
            date: new Date(),
            mode: paymentMode.toLowerCase(),
            recordedBy: req.user ? req.user._id : null,
            note
        });

        // Recompute status, amountPaid, receiptId, paidDate
        fee.recomputeStatus();
        await fee.save();

        // Create Payment record for legacy sync and parent portal
        await Payment.create({
            student: fee.student,
            amount: payAmount,
            date: new Date(),
            paymentMethod: paymentMode.toLowerCase(),
            status: 'COMPLETED'
        });

        // Update Student fees cache
        const allStudentFees = await Fee.find({ student: fee.student, isDeleted: { $ne: true } });
        const totalAmount = allStudentFees.reduce((s, f) => s + (f.amount || 0), 0);
        const totalPaid = allStudentFees.reduce((s, f) => s + (f.amountPaid || 0), 0);
        await Student.findByIdAndUpdate(fee.student, {
            'fees.totalAmount': totalAmount,
            'fees.paidAmount': totalPaid,
            'fees.status': totalPaid >= totalAmount && totalAmount > 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending'),
            totalFees: totalAmount
        });

        const updatedFee = await Fee.findById(fee._id)
            .populate('student', 'name email parentEmail')
            .populate('batch', 'name');

        res.json(updatedFee);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Bulk mark fees as fully paid
// @route   PATCH /api/admin/fees/bulk-mark-paid
// @access  Private (Admin)
const bulkMarkPaid = async (req, res) => {
    try {
        const { feeIds, paymentMode = 'cash' } = req.body;

        if (!Array.isArray(feeIds) || feeIds.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of feeIds' });
        }

        const updatedFees = [];
        for (const id of feeIds) {
            const fee = await Fee.findById(id);
            if (fee && !fee.isDeleted) {
                const remaining = fee.amount - fee.amountPaid;
                if (remaining > 0) {
                    fee.paymentHistory.push({
                        amount: remaining,
                        date: new Date(),
                        mode: paymentMode.toLowerCase(),
                        recordedBy: req.user ? req.user._id : null,
                        note: 'Bulk cash collection'
                    });
                    fee.recomputeStatus();
                    await fee.save();

                    // Create Payment record for parent portal sync
                    await Payment.create({
                        student: fee.student,
                        amount: remaining,
                        date: new Date(),
                        paymentMethod: paymentMode.toLowerCase(),
                        status: 'COMPLETED'
                    });

                    // Update Student fees cache
                    const allStudentFees = await Fee.find({ student: fee.student, isDeleted: { $ne: true } });
                    const totalAmount = allStudentFees.reduce((s, f) => s + (f.amount || 0), 0);
                    const totalPaid = allStudentFees.reduce((s, f) => s + (f.amountPaid || 0), 0);
                    await Student.findByIdAndUpdate(fee.student, {
                        'fees.totalAmount': totalAmount,
                        'fees.paidAmount': totalPaid,
                        'fees.status': totalPaid >= totalAmount && totalAmount > 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending'),
                        totalFees: totalAmount
                    });

                    updatedFees.push(fee._id);
                }
            }
        }

        res.json({
            message: `Successfully processed ${updatedFees.length} fee records`,
            count: updatedFees.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Undo a specific payment entry from paymentHistory
// @route   DELETE /api/admin/fees/:feeId/payment/:paymentHistoryId
// @access  Private (Admin / 48h limit)
const undoPaymentEntry = async (req, res) => {
    try {
        const { feeId, paymentHistoryId } = req.params;

        const fee = await Fee.findById(feeId);
        if (!fee || fee.isDeleted) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const entry = fee.paymentHistory.id(paymentHistoryId);
        if (!entry) {
            return res.status(404).json({ message: 'Payment history entry not found' });
        }

        // 48-hour window check for non-admin roles
        const hoursPassed = (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60);
        const userRole = (req.user?.role || '').toUpperCase();
        if (hoursPassed > 48 && userRole !== 'ADMIN') {
            return res.status(403).json({
                message: 'Payment undo window expired (48 hours) and requires admin authorization'
            });
        }

        const removedAmount = entry.amount;
        const entryDate = entry.date;

        // Remove subdocument entry
        entry.deleteOne();

        // Recompute status
        fee.recomputeStatus();
        await fee.save();

        // Also mark corresponding Payment record as deleted
        await Payment.updateMany(
            { student: fee.student, amount: removedAmount, isDeleted: { $ne: true } },
            { $set: { isDeleted: true } }
        );

        // Update Student fees cache
        const allActiveFees = await Fee.find({ student: fee.student, isDeleted: { $ne: true } });
        const newTotal = allActiveFees.reduce((s, f) => s + (f.amount || 0), 0);
        const newPaid = allActiveFees.reduce((s, f) => s + (f.amountPaid || 0), 0);
        const hasOverdue = allActiveFees.some(f => f.status === 'overdue' || (f.amountPaid < f.amount && new Date(f.dueDate) < new Date()));
        await Student.findByIdAndUpdate(fee.student, {
            'fees.totalAmount': newTotal,
            'fees.paidAmount': newPaid,
            'fees.status': newPaid >= newTotal && newTotal > 0 ? 'paid' : (newPaid > 0 ? (hasOverdue ? 'overdue' : 'partially_paid') : (hasOverdue ? 'overdue' : 'pending')),
            totalFees: newTotal
        });

        // Audit Log entry
        await AuditLog.create({
            user: req.user ? req.user._id : null,
            action: 'payment_undo',
            details: `Undid payment entry of ₹${removedAmount} recorded on ${new Date(entryDate).toLocaleString()} for Fee ID ${fee._id}`,
            ip: req.ip
        });

        const updatedFee = await Fee.findById(fee._id)
            .populate('student', 'name email parentEmail')
            .populate('batch', 'name');

        res.json(updatedFee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete / Soft-delete a Fee record
// @route   DELETE /api/admin/fees/:feeId
// @access  Private (Admin)
const deleteFee = async (req, res) => {
    try {
        const { feeId } = req.params;
        const fee = await Fee.findById(feeId);
        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        fee.isDeleted = true;
        await fee.save();

        // Mark associated Payment collection items as deleted
        if (fee.paymentHistory && fee.paymentHistory.length > 0) {
            for (const ph of fee.paymentHistory) {
                await Payment.updateMany(
                    { student: fee.student, amount: ph.amount, isDeleted: { $ne: true } },
                    { $set: { isDeleted: true } }
                );
            }
        }

        // Recalculate Student fees
        const remainingFees = await Fee.find({ student: fee.student, isDeleted: { $ne: true } });
        const newTotal = remainingFees.reduce((sum, f) => sum + (f.amount || 0), 0);
        const newPaid = remainingFees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
        const hasOverdue = remainingFees.some(f => f.status === 'overdue' || (f.amountPaid < f.amount && new Date(f.dueDate) < new Date()));

        await Student.findByIdAndUpdate(fee.student, {
            'fees.totalAmount': newTotal,
            'fees.paidAmount': newPaid,
            'fees.status': newPaid >= newTotal && newTotal > 0 ? 'paid' : (newPaid > 0 ? (hasOverdue ? 'overdue' : 'partially_paid') : (hasOverdue ? 'overdue' : 'pending')),
            totalFees: newTotal
        });

        res.json({ message: 'Fee record deleted successfully', feeId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Edit an existing payment entry
// @route   PATCH /api/admin/fees/:feeId/payment/:paymentHistoryId
// @access  Private (Admin)
const editPaymentEntry = async (req, res) => {
    try {
        const { feeId, paymentHistoryId } = req.params;
        const { amount, paymentMode, note } = req.body;

        const fee = await Fee.findById(feeId);
        if (!fee || fee.isDeleted) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const entry = fee.paymentHistory.id(paymentHistoryId);
        if (!entry) {
            return res.status(404).json({ message: 'Payment history entry not found' });
        }

        if (amount !== undefined) {
            const newAmount = Number(amount);
            if (isNaN(newAmount) || newAmount <= 0) {
                return res.status(400).json({ message: 'Amount must be greater than 0' });
            }
            entry.amount = newAmount;
        }

        if (paymentMode) {
            entry.mode = paymentMode.toLowerCase();
        }

        if (note !== undefined) {
            entry.note = note;
        }

        fee.recomputeStatus();

        if (fee.amountPaid > fee.amount) {
            return res.status(400).json({
                message: `Edited payment total of ₹${fee.amountPaid} exceeds total fee amount of ₹${fee.amount}`
            });
        }

        await fee.save();

        const updatedFee = await Fee.findById(fee._id)
            .populate('student', 'name email parentEmail')
            .populate('batch', 'name');

        res.json(updatedFee);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Helper to sync fees from Student and Payment records so nothing is ever lost or missing
const syncFeesAndPayments = async () => {
    try {
        const students = await Student.find({ isDeleted: { $ne: true } });
        for (const s of students) {
            const allFees = await Fee.find({ student: s._id });
            let activeFees = allFees.filter(f => !f.isDeleted);

            // Ensure every active student has an active fee record
            if (activeFees.length === 0) {
                const feeAmount = s.fees?.totalAmount || s.totalFees || 15000;
                const paidAmount = s.fees?.paidAmount || 0;
                const newFee = await Fee.create({
                    student: s._id,
                    batch: s.batch || null,
                    installmentNumber: 1,
                    amount: feeAmount,
                    amountPaid: paidAmount,
                    status: (paidAmount >= feeAmount && feeAmount > 0) ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'pending'),
                    dueDate: new Date()
                });
                activeFees = [newFee];
            }

            // Sync payments from Payment collection only into active non-deleted fee records
            const payments = await Payment.find({
                student: s._id,
                status: { $in: ['Paid', 'PAID', 'paid', 'COMPLETED', 'completed', 'Success', 'SUCCESS'] },
                isDeleted: { $ne: true }
            });

            if (payments.length > 0 && activeFees.length > 0) {
                for (const p of payments) {
                    const existsInHistory = activeFees.some(f => 
                        f.paymentHistory?.some(ph => ph.amount === p.amount && Math.abs(new Date(ph.date) - new Date(p.date)) < 60000)
                    );
                    if (!existsInHistory) {
                        const targetFee = activeFees.find(f => f.amountPaid < f.amount) || activeFees[0];
                        targetFee.paymentHistory.push({
                            amount: p.amount,
                            date: p.date || new Date(),
                            mode: (p.paymentMethod || 'cash').toLowerCase(),
                            note: 'Synced payment'
                        });
                        targetFee.recomputeStatus();
                        await targetFee.save();
                    }
                }
            }

            // Recalculate Student fees from active fees
            const totalFeeSum = activeFees.reduce((sum, f) => sum + (f.amount || 0), 0);
            const totalPaidSum = activeFees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
            const hasOverdue = activeFees.some(f => f.status === 'overdue' || (f.amountPaid < f.amount && new Date(f.dueDate) < new Date()));

            let studentStatus = 'pending';
            if (totalFeeSum === 0) {
                studentStatus = 'pending';
            } else if (totalPaidSum >= totalFeeSum && totalFeeSum > 0) {
                studentStatus = 'paid';
            } else if (totalPaidSum > 0) {
                studentStatus = hasOverdue ? 'overdue' : 'partially_paid';
            } else if (hasOverdue) {
                studentStatus = 'overdue';
            }

            if (!s.fees || s.fees.paidAmount !== totalPaidSum || s.fees.totalAmount !== totalFeeSum || s.fees.status !== studentStatus) {
                s.totalFees = totalFeeSum;
                s.fees = {
                    totalAmount: totalFeeSum,
                    paidAmount: totalPaidSum,
                    status: studentStatus
                };
                await s.save();
            }
        }
    } catch (err) {
        console.error('Error syncing fees:', err);
    }
};

// @desc    Batch-wise Monthly Fee Analytics
// @route   GET /api/admin/fees/analytics?month=&year=
// @access  Private (Admin)
const getFeeAnalytics = async (req, res) => {
    try {
        await syncFeesAndPayments();

        const isAllMonths = req.query.month === 'all';
        const selectedMonth = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
        const selectedYear = parseInt(req.query.year, 10) || new Date().getFullYear();

        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

        // Fetch all active batches
        const batches = await Batch.find({ isDeleted: { $ne: true } });

        const batchAnalytics = await Promise.all(batches.map(async (b) => {
            const students = await Student.find({ batch: b._id, isDeleted: { $ne: true } });
            const studentIds = students.map(s => s._id);
            const fees = await Fee.find({ 
                $or: [{ batch: b._id }, { student: { $in: studentIds } }],
                isDeleted: { $ne: true } 
            });

            let totalCollected = 0;
            let totalPending = 0;
            let studentsPaid = 0;
            let studentsPending = 0;
            let studentsUnpaid = 0;

            if (isAllMonths) {
                // All-time batch totals
                for (const fee of fees) {
                    totalCollected += (fee.amountPaid || 0);
                    totalPending += Math.max(0, (fee.amount || 0) - (fee.amountPaid || 0));
                }

                for (const s of students) {
                    const studentFees = fees.filter(f => f.student?.toString() === s._id.toString());
                    if (studentFees.length === 0) continue;

                    const totalAmount = studentFees.reduce((sum, f) => sum + (f.amount || 0), 0);
                    const paidAmount = studentFees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);

                    if (paidAmount >= totalAmount && totalAmount > 0) {
                        studentsPaid++;
                    } else if (paidAmount > 0) {
                        studentsPending++;
                    } else {
                        studentsUnpaid++;
                    }
                }
            } else {
                // 1. Total Collected strictly in this selected month:
                for (const fee of fees) {
                    for (const p of (fee.paymentHistory || [])) {
                        const pDate = new Date(p.date);
                        if (pDate >= startOfMonth && pDate <= endOfMonth) {
                            totalCollected += (p.amount || 0);
                        }
                    }
                }

                // Also check Payment collection for payments strictly in this month
                const paymentsInMonth = await Payment.find({
                    student: { $in: studentIds },
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $in: ['Paid', 'PAID', 'paid', 'COMPLETED', 'completed', 'Success', 'SUCCESS'] },
                    isDeleted: { $ne: true }
                });
                for (const p of paymentsInMonth) {
                    const alreadyCounted = fees.some(f => 
                        f.paymentHistory?.some(ph => ph.amount === p.amount && Math.abs(new Date(ph.date) - new Date(p.date)) < 60000)
                    );
                    if (!alreadyCounted) {
                        totalCollected += (p.amount || 0);
                    }
                }

                // 2. Fees due or active in this specific month:
                for (const s of students) {
                    const studentFees = fees.filter(f => f.student?.toString() === s._id.toString());
                    
                    const monthFees = studentFees.filter(f => {
                        const d = new Date(f.dueDate);
                        const dueInMonth = d >= startOfMonth && d <= endOfMonth;
                        const paidInMonth = (f.paymentHistory || []).some(p => new Date(p.date) >= startOfMonth && new Date(p.date) <= endOfMonth);
                        return dueInMonth || paidInMonth;
                    });

                    if (monthFees.length === 0) {
                        continue;
                    }

                    const monthTotal = monthFees.reduce((sum, f) => sum + (f.amount || 0), 0);
                    const monthPaid = monthFees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
                    const remaining = Math.max(0, monthTotal - monthPaid);
                    totalPending += remaining;

                    if (monthPaid >= monthTotal && monthTotal > 0) {
                        studentsPaid++;
                    } else if (monthPaid > 0) {
                        studentsPending++;
                    } else {
                        studentsUnpaid++;
                    }
                }
            }

            return {
                batchId: b._id,
                batchName: b.name,
                totalCollected,
                totalPending,
                studentsPaid,
                studentsPending,
                studentsUnpaid
            };
        }));

        const overall = batchAnalytics.reduce((acc, curr) => {
            acc.totalCollected += curr.totalCollected;
            acc.totalPending += curr.totalPending;
            acc.totalStudentsPaid += curr.studentsPaid;
            acc.totalStudentsPending += curr.studentsPending;
            acc.totalStudentsUnpaid += curr.studentsUnpaid;
            return acc;
        }, {
            totalCollected: 0,
            totalPending: 0,
            totalStudentsPaid: 0,
            totalStudentsPending: 0,
            totalStudentsUnpaid: 0
        });

        res.json({
            month: isAllMonths ? 'all' : selectedMonth,
            year: selectedYear,
            batches: batchAnalytics,
            overall
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upcoming Dues (Next N Days)
// @route   GET /api/admin/fees/upcoming?days=7
// @access  Private (Admin)
const getUpcomingDues = async (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 7;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        const fees = await Fee.find({
            isDeleted: { $ne: true },
            status: { $in: ['pending', 'partially_paid', 'overdue'] }
        })
            .populate('student', 'name email parentEmail')
            .populate('batch', 'name')
            .sort({ dueDate: 1 });

        const formatted = fees
            .filter(f => (f.amount - f.amountPaid) > 0)
            .map(f => ({
                _id: f._id,
                studentName: f.student ? f.student.name : 'Unknown Student',
                batchName: f.batch ? f.batch.name : 'Unassigned',
                amount: f.amount,
                amountPaid: f.amountPaid,
                remainingAmount: f.amount - f.amountPaid,
                status: f.status,
                dueDate: f.dueDate,
                installmentNumber: f.installmentNumber
            }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    List & Filter Fees with Custom Priority Sorting
// @route   GET /api/admin/fees?status=&batch=&search=&month=&year=&page=&limit=
// @access  Private (Admin)
const getFees = async (req, res) => {
    try {
        await syncFeesAndPayments();

        const { status, batch, search, month, year, page = 1, limit = 10 } = req.query;

        let query = { isDeleted: { $ne: true } };

        if (status && status !== 'all') {
            query.status = status.toLowerCase();
        }

        if (batch) {
            query.batch = batch;
        }

        if (month && year && month !== 'all') {
            const selectedMonth = parseInt(month, 10);
            const selectedYear = parseInt(year, 10);
            const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
            const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

            query.$or = [
                { dueDate: { $gte: startOfMonth, $lte: endOfMonth } },
                { 'paymentHistory.date': { $gte: startOfMonth, $lte: endOfMonth } },
                { paidDate: { $gte: startOfMonth, $lte: endOfMonth } }
            ];
        }

        // Auto-update overdue statuses for past due dates
        const overdueUpdateQuery = {
            isDeleted: { $ne: true },
            amountPaid: 0,
            dueDate: { $lt: new Date() },
            status: 'pending'
        };
        await Fee.updateMany(overdueUpdateQuery, { $set: { status: 'overdue' } });

        let fees = await Fee.find(query)
            .populate('student', 'name email parentEmail')
            .populate('batch', 'name');

        if (search) {
            const term = search.toLowerCase();
            fees = fees.filter(f =>
                f.student?.name?.toLowerCase().includes(term) ||
                f.receiptId?.toLowerCase().includes(term)
            );
        }

        // Custom Sort: overdue -> partially_paid -> pending -> paid
        fees.sort((a, b) => {
            const rankA = STATUS_RANK[a.status] || 99;
            const rankB = STATUS_RANK[b.status] || 99;
            if (rankA !== rankB) return rankA - rankB;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const total = fees.length;
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedFees = fees.slice(startIndex, startIndex + limitNum);

        res.json({
            fees: paginatedFees,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export Fees as Excel (.xlsx) file using ExcelJS
// @route   GET /api/admin/fees/export?status=&batch=&month=&year=
// @access  Private (Admin)
const exportFees = async (req, res) => {
    try {
        const { status, batch, month, year } = req.query;

        let query = { isDeleted: { $ne: true } };
        if (status && status !== 'all') {
            query.status = status.toLowerCase();
        }
        if (batch) {
            query.batch = batch;
        }

        let fees = await Fee.find(query)
            .populate('student', 'name email parentEmail')
            .populate('batch', 'name');

        if (month && year) {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);
            fees = fees.filter(f => {
                const dateToCheck = f.paidDate || f.dueDate;
                return dateToCheck >= startOfMonth && dateToCheck <= endOfMonth;
            });
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'EduPredict AI';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Fee Records');

        worksheet.columns = [
            { header: 'Student Name', key: 'studentName', width: 25 },
            { header: 'Batch', key: 'batchName', width: 18 },
            { header: 'Installment #', key: 'installmentNumber', width: 14 },
            { header: 'Total Amount (₹)', key: 'amount', width: 18 },
            { header: 'Amount Paid (₹)', key: 'amountPaid', width: 18 },
            { header: 'Balance (₹)', key: 'balance', width: 16 },
            { header: 'Status', key: 'status', width: 16 },
            { header: 'Due Date', key: 'dueDate', width: 16 },
            { header: 'Last Payment Date', key: 'lastPaymentDate', width: 20 },
            { header: 'Payment Mode', key: 'paymentMode', width: 16 },
            { header: 'Receipt ID', key: 'receiptId', width: 22 },
        ];

        // Format Header Row
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' } // Indigo header
        };

        fees.forEach(f => {
            const lastPayment = f.paymentHistory && f.paymentHistory.length > 0
                ? f.paymentHistory[f.paymentHistory.length - 1]
                : null;

            worksheet.addRow({
                studentName: f.student ? f.student.name : 'Unknown',
                batchName: f.batch ? f.batch.name : 'Unassigned',
                installmentNumber: f.installmentNumber || 1,
                amount: f.amount,
                amountPaid: f.amountPaid,
                balance: f.amount - f.amountPaid,
                status: (f.status || '').toUpperCase(),
                dueDate: new Date(f.dueDate).toLocaleDateString(),
                lastPaymentDate: f.paidDate ? new Date(f.paidDate).toLocaleDateString() : (lastPayment ? new Date(lastPayment.date).toLocaleDateString() : '-'),
                paymentMode: lastPayment ? (lastPayment.mode || '').toUpperCase() : '-',
                receiptId: f.receiptId || '-'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Fee_Report_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Fee status breakdown aggregation
// @route   GET /api/admin/fees/status-breakdown?month=&year=
// @access  Private (Admin)
const getFeeStatusBreakdown = async (req, res) => {
    try {
        await syncFeesAndPayments();
        const { month, year } = req.query;

        const breakdown = { paid: 0, partiallyPaid: 0, pending: 0, overdue: 0 };
        const now = new Date();

        if (month && year && month !== 'all') {
            const selectedMonth = parseInt(month, 10);
            const selectedYear = parseInt(year, 10);
            const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
            const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

            // Fetch fees that are relevant to this specific month/year
            const fees = await Fee.find({
                isDeleted: { $ne: true },
                $or: [
                    { dueDate: { $gte: startOfMonth, $lte: endOfMonth } },
                    { 'paymentHistory.date': { $gte: startOfMonth, $lte: endOfMonth } },
                    { paidDate: { $gte: startOfMonth, $lte: endOfMonth } }
                ]
            });

            for (const fee of fees) {
                const paidInMonth = (fee.paymentHistory || [])
                    .filter(p => new Date(p.date) >= startOfMonth && new Date(p.date) <= endOfMonth)
                    .reduce((sum, p) => sum + (p.amount || 0), 0);

                const totalPaidEver = fee.amountPaid || 0;

                if (paidInMonth >= fee.amount || (totalPaidEver >= fee.amount && fee.amount > 0)) {
                    breakdown.paid++;
                } else if (paidInMonth > 0 || totalPaidEver > 0) {
                    breakdown.partiallyPaid++;
                } else if (new Date(fee.dueDate) < now) {
                    breakdown.overdue++;
                } else {
                    breakdown.pending++;
                }
            }
        } else {
            const fees = await Fee.find({ isDeleted: { $ne: true } });
            for (const fee of fees) {
                const st = (fee.status || '').toLowerCase();
                const isPastDue = new Date(fee.dueDate) < now;
                if (st === 'paid' || (fee.amountPaid >= fee.amount && fee.amount > 0)) {
                    breakdown.paid++;
                } else if (st === 'partially_paid' || fee.amountPaid > 0) {
                    breakdown.partiallyPaid++;
                } else if (st === 'overdue' || isPastDue) {
                    breakdown.overdue++;
                } else {
                    breakdown.pending++;
                }
            }
        }

        res.json(breakdown);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    recordPayment,
    bulkMarkPaid,
    undoPaymentEntry,
    editPaymentEntry,
    deleteFee,
    getFeeAnalytics,
    getUpcomingDues,
    getFees,
    exportFees,
    getFeeStatusBreakdown,
    syncFeesAndPayments
};
