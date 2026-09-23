const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const sendEmail = require('../utils/sendEmail');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private (Admin)
const recordPayment = async (req, res) => {
    const { student, amount, paymentDate } = req.body;

    try {
        const studentObj = await Student.findById(student).populate('parent');
        if (!studentObj) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const payment = await Payment.create({
            student,
            amount,
            date: paymentDate || Date.now(),
            paymentMethod: req.body.paymentMethod || 'CASH',
            status: 'Paid',
        });


        // Check total paid vs total fees
        const allPayments = await Payment.find({ student: studentObj._id, isDeleted: false });
        const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
        const pendingAmount = studentObj.totalFees - totalPaid;

        // Status Logic (just for response/email, not stored on Student unless we add a field)
        let feeStatus = pendingAmount <= 0 ? 'PAID' : 'PARTIAL';
        if (pendingAmount > 0 && new Date() > new Date('2025-12-31')) feeStatus = 'OVERDUE'; // Mock overdue logic

        // Generate PDF Receipt (Simulated Stream)
        // In a real app, we'd pipe this to a file or cloud storage. 
        // Here we will just log that we created it.
        const doc = new PDFDocument();
        // doc.pipe(fs.createWriteStream(`receipt_${payment._id}.pdf`)); // Uncomment to actually save locally
        doc.fontSize(25).text('Payment Receipt', 100, 100);
        doc.fontSize(15).text(`Student: ${studentObj.name}`);
        doc.text(`Amount: ₹${amount}`);
        doc.text(`Date: ${payment.date}`);
        doc.text(`Status: Success`);
        doc.end();

        // Email Receipt
        if (studentObj.parent && studentObj.parent.email) {
            const subject = `Payment Receipt for ${studentObj.name}`;
            const text = `Dear Parent,\n\nReceived payment of ₹${amount}.\nTotal Paid: ₹${totalPaid}\nRemaining Due: ₹${pendingAmount}\n\nThank you.\n\n(A PDF receipt has been generated internally)`;
            // In real app, attach the PDF stream/buffer here
            await sendEmail(studentObj.parent.email, subject, text);
        }

        const populatedPayment = await Payment.findById(payment._id).populate('student', 'name email');

        res.status(201).json({
            payment: populatedPayment,
            totalFees: studentObj.totalFees,
            totalPaid,
            pendingAmount,
            status: feeStatus
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get pending fees list
// @route   GET /api/payments/pending
// @access  Private (Admin)
const getPendingFees = async (req, res) => {
    try {
        const students = await Student.find({ isDeleted: false });
        const pendingList = [];

        for (const student of students) {
            const payments = await Payment.find({ student: student._id, isDeleted: false });
            const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

            if (totalPaid < student.totalFees) {
                pendingList.push({
                    student,
                    totalFees: student.totalFees,
                    totalPaid,
                    pendingAmount: student.totalFees - totalPaid,
                    status: 'PARTIAL' // or OVERDUE based on date logic
                });
            }
        }

        res.json(pendingList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private (Admin)
const getPayments = async (req, res) => {
    try {
        const { studentId } = req.query;
        let query = { isDeleted: false };

        if (req.user.role === 'PARENT') {
            const children = await Student.find({ parent: req.user._id });
            const childIds = children.map(c => c._id.toString());

            if (studentId) {
                if (!childIds.includes(studentId)) {
                    return res.status(403).json({ message: 'Not authorized to view payments for this student' });
                }
                query.student = studentId;
            } else {
                query.student = { $in: childIds };
            }
        } else if (req.user.role === 'TEACHER') {
            const batches = await Batch.find({ teacher: req.user._id });
            const batchIds = batches.map(b => b._id.toString());
            const students = await Student.find({ batch: { $in: batchIds } });
            const studentIds = students.map(s => s._id.toString());

            if (studentId) {
                if (!studentIds.includes(studentId)) {
                    return res.status(403).json({ message: 'Not authorized for this student' });
                }
                query.student = studentId;
            } else {
                query.student = { $in: studentIds };
            }
        } else if (req.user.role === 'ADMIN') {
            if (studentId) query.student = studentId;
        }

        const payments = await Payment.find(query)
            .populate('student', 'name email')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a payment
// @route   PUT /api/payments/:id
// @access  Private (Admin)
const updatePayment = async (req, res) => {
    const { amount, paymentMethod, date } = req.body;

    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.amount = amount || payment.amount;
        payment.paymentMethod = paymentMethod || payment.paymentMethod;
        payment.date = date || payment.date;

        const updatedPayment = await payment.save();
        const populatedPayment = await Payment.findById(updatedPayment._id).populate('student', 'name email');

        res.json(populatedPayment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a payment (Soft delete)
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (payment) {
            payment.isDeleted = true;
            await payment.save();
            res.json({ message: 'Payment removed' });
        } else {
            res.status(404).json({ message: 'Payment not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    recordPayment,
    getPayments,
    getPendingFees,
    updatePayment,
    deletePayment,
};

