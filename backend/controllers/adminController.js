const Student = require('../models/Student');
const Batch = require('../models/Batch');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Fee = require('../models/Fee');
const PDFDocument = require('pdfkit');
const { syncFeesAndPayments } = require('./feeController');

// Helper email validator
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// @desc    Get Admin Dashboard Summary KPIs
// @route   GET /api/admin/dashboard/summary
// @access  Private (Admin)
const getDashboardSummary = async (req, res) => {
    try {
        if (typeof syncFeesAndPayments === 'function') {
            await syncFeesAndPayments();
        }

        // 1. Active Students Count
        const activeStudents = await Student.countDocuments({ isDeleted: { $ne: true } });

        // 2. Today's Attendance Percentage across all batches
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const todayAttendanceRecords = await Attendance.find({
            date: { $gte: startOfToday, $lte: endOfToday },
            isDeleted: { $ne: true }
        });

        let todayAttendancePercent = 0;
        if (todayAttendanceRecords.length > 0) {
            const presentCount = todayAttendanceRecords.filter(
                r => ['present', 'late'].includes((r.status || '').toLowerCase())
            ).length;
            todayAttendancePercent = Math.round((presentCount / todayAttendanceRecords.length) * 100 * 10) / 10;
        }

        // 3. Fees Collected This Month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

        let feesCollectedThisMonth = 0;

        // Sum from Fee paymentHistory
        const feesWithPayments = await Fee.find({
            isDeleted: { $ne: true },
            'paymentHistory.date': { $gte: startOfMonth, $lte: endOfMonth }
        });
        for (const f of feesWithPayments) {
            for (const p of f.paymentHistory) {
                const pDate = new Date(p.date);
                if (pDate >= startOfMonth && pDate <= endOfMonth) {
                    feesCollectedThisMonth += (p.amount || 0);
                }
            }
        }

        // Sum from Payment collection
        const paymentsThisMonth = await Payment.find({
            date: { $gte: startOfMonth, $lte: endOfMonth },
            status: { $in: ['Paid', 'PAID', 'paid', 'COMPLETED', 'completed', 'Success', 'SUCCESS'] },
            isDeleted: { $ne: true }
        });
        for (const pay of paymentsThisMonth) {
            const alreadyCounted = feesWithPayments.some(f => 
                f.paymentHistory?.some(p => p.amount === pay.amount && Math.abs(new Date(p.date) - new Date(pay.date)) < 60000)
            );
            if (!alreadyCounted) {
                feesCollectedThisMonth += (pay.amount || 0);
            }
        }

        // 4. Students at Risk (High or Medium)
        const studentsAtRisk = await Student.countDocuments({
            isDeleted: { $ne: true },
            riskLevel: { $in: ['HIGH', 'MEDIUM', 'high', 'medium'] }
        });

        // 5. Running Batches
        const runningBatches = await Batch.countDocuments({
            isDeleted: { $ne: true },
            status: { $ne: 'completed' }
        });

        // 6. Number of Teachers
        const totalTeachers = await User.countDocuments({
            role: 'TEACHER',
            isDeleted: { $ne: true }
        });

        res.json({
            activeStudents,
            todayAttendancePercent,
            feesCollectedThisMonth,
            studentsAtRisk,
            runningBatches,
            totalTeachers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Student & Auto-create Parent User
// @route   POST /api/admin/students
// @access  Private (Admin)
const createStudent = async (req, res) => {
    try {
        const { name, email, parentEmail, batchId } = req.body;

        // Validations
        if (!name || !email || !parentEmail || !batchId) {
            return res.status(400).json({ message: 'Name, email, parentEmail, and batchId are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid student email format' });
        }

        if (!isValidEmail(parentEmail)) {
            return res.status(400).json({ message: 'Invalid parent email format' });
        }

        // Verify Batch exists & fetch default fees
        const batchExists = await Batch.findById(batchId);
        if (!batchExists || batchExists.isDeleted) {
            return res.status(400).json({ message: 'Assigned batch does not exist' });
        }

        // Check unique student email
        const existingStudent = await Student.findOne({ email, isDeleted: { $ne: true } });
        if (existingStudent) {
            return res.status(400).json({ message: 'Student email already exists' });
        }

        // Auto-create or find Parent User
        let parentUser = await User.findOne({ email: parentEmail, role: 'PARENT' });
        if (!parentUser) {
            parentUser = await User.create({
                name: `Parent of ${name}`,
                email: parentEmail,
                password: 'Temp@1234',
                role: 'PARENT',
                firstLogin: true
            });
        }

        const defaultFeeAmount = Number(batchExists.defaultFeeAmount) || Number(batchExists.fees) || 0;
        const numberOfInstallments = Number(batchExists.numberOfInstallments) || 3;

        // Create Student
        const student = await Student.create({
            name,
            email,
            parentEmail,
            parent: parentUser._id,
            batch: batchId,
            totalFees: defaultFeeAmount,
            fees: {
                totalAmount: defaultFeeAmount,
                paidAmount: 0,
                status: 'pending'
            },
            riskLevel: 'LOW',
            attendancePercentage: 0
        });

        // Auto-generate Fee installment documents from batch settings
        if (defaultFeeAmount > 0 && numberOfInstallments > 0) {
            const baseInstallment = Math.floor(defaultFeeAmount / numberOfInstallments);
            const remainder = defaultFeeAmount - (baseInstallment * numberOfInstallments);

            const feeDocs = [];
            for (let i = 0; i < numberOfInstallments; i++) {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (i * 30));

                const amount = (i === 0) ? (baseInstallment + remainder) : baseInstallment;

                feeDocs.push({
                    student: student._id,
                    batch: batchId,
                    installmentNumber: i + 1,
                    amount,
                    amountPaid: 0,
                    status: 'pending',
                    dueDate
                });
            }
            await Fee.insertMany(feeDocs);
        }

        // Push studentId into assigned Batch's students array
        await Batch.findByIdAndUpdate(batchId, { $addToSet: { students: student._id } });

        const populatedStudent = await Student.findById(student._id)
            .populate('batch', 'name timing')
            .populate('parent', 'name email');

        res.status(201).json(populatedStudent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    List & Filter Students
// @route   GET /api/admin/students
// @access  Private (Admin)
const getStudents = async (req, res) => {
    try {
        const { batch, feeStatus, riskLevel, search, page = 1, limit = 10 } = req.query;

        let query = { isDeleted: { $ne: true } };

        if (batch) {
            query.batch = batch;
        }

        if (feeStatus) {
            query.$or = [
                { 'fees.status': feeStatus.toLowerCase() },
                { 'fees.status': feeStatus.toUpperCase() }
            ];
        }

        if (riskLevel) {
            query.riskLevel = { $in: [riskLevel.toUpperCase(), riskLevel.toLowerCase()] };
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;

        const total = await Student.countDocuments(query);
        const students = await Student.find(query)
            .populate('batch', 'name timing')
            .populate('parent', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const formattedStudents = students.map(s => ({
            _id: s._id,
            name: s.name,
            studentName: s.name,
            email: s.email,
            parentEmail: s.parentEmail,
            batch: s.batch,
            batchName: s.batch ? s.batch.name : 'Unassigned',
            attendancePercentage: s.attendancePercentage || 0,
            fees: s.fees || { totalAmount: s.totalFees, paidAmount: 0, status: 'pending' },
            riskLevel: s.riskLevel || 'LOW',
            createdAt: s.createdAt,
            isNew: s.createdAt ? new Date(s.createdAt) >= fourteenDaysAgo : false
        }));

        res.json({
            students: formattedStudents,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Teacher Account
// @route   POST /api/admin/teachers
// @access  Private (Admin)
const createTeacher = async (req, res) => {
    try {
        const { name, email, batchIds = [] } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        // Create teacher account with default temporary password and firstLogin: true
        const teacher = await User.create({
            name,
            email,
            password: 'Temp@1234',
            role: 'TEACHER',
            firstLogin: true,
            batches: batchIds
        });

        // Push teacher ID into assigned Batches
        if (batchIds && batchIds.length > 0) {
            await Batch.updateMany(
                { _id: { $in: batchIds } },
                { $set: { teacher: teacher._id } }
            );
        }

        res.status(201).json({
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
            batches: teacher.batches,
            message: 'Teacher account created successfully with default temporary password'
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    List Teachers
// @route   GET /api/admin/teachers
// @access  Private (Admin)
const getTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'TEACHER', isDeleted: { $ne: true } })
            .select('-password')
            .populate('batches', 'name timing students');

        const teacherList = await Promise.all(teachers.map(async (t) => {
            const assignedBatches = await Batch.find({ teacher: t._id, isDeleted: { $ne: true } }).select('name students');
            const batchNames = assignedBatches.map(b => b.name);
            const batchIds = assignedBatches.map(b => b._id);
            const totalStudentsCount = await Student.countDocuments({ batch: { $in: batchIds }, isDeleted: { $ne: true } });

            return {
                _id: t._id,
                name: t.name,
                email: t.email,
                role: t.role,
                assignedBatches: batchNames,
                batches: assignedBatches,
                studentCount: totalStudentsCount,
                firstLogin: t.firstLogin
            };
        }));

        res.json(teacherList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Batch
// @route   POST /api/admin/batches
// @access  Private (Admin)
const createBatch = async (req, res) => {
    try {
        const { name, teacherId, timing, defaultFeeAmount, numberOfInstallments } = req.body;

        if (!name || !timing || defaultFeeAmount === undefined || defaultFeeAmount === null) {
            return res.status(400).json({ message: 'Batch name, timing, and defaultFeeAmount are required' });
        }

        const feeNum = Number(defaultFeeAmount);
        if (isNaN(feeNum) || feeNum <= 0) {
            return res.status(400).json({ message: 'defaultFeeAmount must be a positive number' });
        }

        const installmentsNum = Number(numberOfInstallments) || 3;

        if (teacherId) {
            const teacherExists = await User.findOne({ _id: teacherId, role: 'TEACHER', isDeleted: { $ne: true } });
            if (!teacherExists) {
                return res.status(400).json({ message: 'Assigned teacherId does not exist' });
            }
        }

        const batch = await Batch.create({
            name,
            timing,
            teacher: teacherId || null,
            defaultFeeAmount: feeNum,
            numberOfInstallments: installmentsNum,
            status: 'active'
        });

        if (teacherId) {
            await User.findByIdAndUpdate(teacherId, { $addToSet: { batches: batch._id } });
        }

        res.status(201).json(batch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    List Batches with aggregated attendance percentage
// @route   GET /api/admin/batches
// @access  Private (Admin)
const getBatches = async (req, res) => {
    try {
        const batches = await Batch.find({ isDeleted: { $ne: true } })
            .populate('teacher', 'name email');

        const batchList = await Promise.all(batches.map(async (batch) => {
            // Aggregation for batch attendance percentage
            const attendanceRecords = await Attendance.find({
                batch: batch._id,
                isDeleted: { $ne: true }
            });

            let batchAttendancePercentage = 0;
            if (attendanceRecords.length > 0) {
                const presentCount = attendanceRecords.filter(
                    r => r.status === 'Present' || r.status === 'PRESENT' || r.status === 'Late' || r.status === 'LATE'
                ).length;
                batchAttendancePercentage = Math.round((presentCount / attendanceRecords.length) * 100 * 10) / 10;
            }

            // Accurate active enrolled students count directly from Student collection
            const activeStudentsCount = await Student.countDocuments({
                batch: batch._id,
                isDeleted: { $ne: true }
            });

            return {
                _id: batch._id,
                name: batch.name,
                teacherName: batch.teacher ? batch.teacher.name : 'Unassigned',
                teacher: batch.teacher,
                timing: batch.timing,
                defaultFeeAmount: batch.defaultFeeAmount,
                numberOfInstallments: batch.numberOfInstallments || 3,
                studentsEnrolled: activeStudentsCount,
                studentsCount: activeStudentsCount,
                attendancePercentage: batchAttendancePercentage,
                status: batch.status || 'active'
            };
        }));

        res.json(batchList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Attendance KPI strip data for Attendance Overview page
// @route   GET /api/admin/attendance/kpi
// @access  Private (Admin)
const getAttendanceKPI = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // 1. Today's Overall Attendance % across all batches
        const todayRecords = await Attendance.find({
            date: { $gte: startOfToday, $lte: endOfToday },
            isDeleted: { $ne: true }
        });

        let todayOverallPercent = 0;
        if (todayRecords.length > 0) {
            const presentCount = todayRecords.filter(
                r => r.status === 'Present' || r.status === 'PRESENT' || r.status === 'Late' || r.status === 'LATE'
            ).length;
            todayOverallPercent = Math.round((presentCount / todayRecords.length) * 100 * 10) / 10;
        }

        // 2. Batches Not Yet Marked Today
        const activeBatches = await Batch.find({ status: 'active', isDeleted: { $ne: true } });
        const batchesMarkedToday = new Set(
            todayRecords.map(r => r.batch?.toString()).filter(Boolean)
        );
        const batchesNotMarkedCount = activeBatches.filter(
            b => !batchesMarkedToday.has(b._id.toString())
        ).length;

        // 3. Chronic Absentees — students absent 3+ consecutive recent days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const recentRecords = await Attendance.find({
            date: { $gte: threeDaysAgo },
            isDeleted: { $ne: true }
        }).sort({ student: 1, date: 1 });

        // Group by student
        const studentRecordMap = {};
        for (const rec of recentRecords) {
            const sid = rec.student?.toString();
            if (!sid) continue;
            if (!studentRecordMap[sid]) studentRecordMap[sid] = [];
            studentRecordMap[sid].push(rec);
        }

        let chronicAbsenteesCount = 0;
        for (const sid of Object.keys(studentRecordMap)) {
            const records = studentRecordMap[sid];
            // Check if all recent records are absent
            if (records.length >= 3) {
                const lastThree = records.slice(-3);
                const allAbsent = lastThree.every(r =>
                    r.status === 'Absent' || r.status === 'ABSENT'
                );
                if (allAbsent) chronicAbsenteesCount++;
            }
        }

        res.json({
            todayOverallPercent,
            batchesNotMarkedCount,
            chronicAbsenteesCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Monthly Attendance PDF Report
// @route   GET /api/admin/reports/attendance-pdf
// @access  Private (Admin)
const getAttendancePDFReport = async (req, res) => {
    try {
        const doc = new PDFDocument({ margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Monthly_Attendance_Report_${Date.now()}.pdf`);

        doc.pipe(res);

        doc.fontSize(20).text('EduPredict AI — Monthly Attendance Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1.5);

        const students = await Student.find({ isDeleted: { $ne: true } }).populate('batch', 'name');

        doc.fontSize(14).text('Student Attendance Summary', { underline: true });
        doc.moveDown(0.5);

        students.forEach((s, index) => {
            doc.fontSize(10).text(
                `${index + 1}. ${s.name} | Batch: ${s.batch ? s.batch.name : 'Unassigned'} | Attendance: ${s.attendancePercentage || 0}%`
            );
            doc.moveDown(0.2);
        });

        doc.end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Batch Performance PDF Report
// @route   GET /api/admin/reports/batch-performance-pdf
// @access  Private (Admin)
const getBatchPerformancePDFReport = async (req, res) => {
    try {
        const doc = new PDFDocument({ margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Batch_Performance_Report_${Date.now()}.pdf`);

        doc.pipe(res);

        doc.fontSize(20).text('EduPredict AI — Batch Performance Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1.5);

        const batches = await Batch.find({ isDeleted: { $ne: true } }).populate('teacher', 'name').populate('students');

        doc.fontSize(14).text('Batch Analytics Summary', { underline: true });
        doc.moveDown(0.5);

        batches.forEach((b, index) => {
            doc.fontSize(10).text(
                `${index + 1}. Batch: ${b.name} | Teacher: ${b.teacher ? b.teacher.name : 'Unassigned'} | Timing: ${b.timing || '-'} | Enrolled: ${b.students ? b.students.length : 0}`
            );
            doc.moveDown(0.2);
        });

        doc.end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Teacher Account
// @route   PUT /api/admin/teachers/:id
// @access  Private (Admin)
const updateTeacher = async (req, res) => {
    try {
        const { name, batchIds = [] } = req.body;
        const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER', isDeleted: { $ne: true } });

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (name) teacher.name = name;
        teacher.batches = batchIds;
        await teacher.save();

        // Update batches: remove this teacher from batches they are no longer assigned to
        await Batch.updateMany(
            { teacher: teacher._id },
            { $unset: { teacher: "" } }
        );

        // Assign teacher to the new selected batches
        if (batchIds.length > 0) {
            await Batch.updateMany(
                { _id: { $in: batchIds } },
                { $set: { teacher: teacher._id } }
            );
        }

        res.json(teacher);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update Batch
// @route   PUT /api/admin/batches/:id
// @access  Private (Admin)
const updateBatch = async (req, res) => {
    try {
        const { name, teacherId, timing, defaultFeeAmount, numberOfInstallments } = req.body;
        const batch = await Batch.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (name) batch.name = name;
        if (timing) batch.timing = timing;
        
        let feeChanged = false;
        if (defaultFeeAmount !== undefined && defaultFeeAmount !== null) {
            const feeNum = Number(defaultFeeAmount);
            if (!isNaN(feeNum) && feeNum > 0) {
                if (batch.defaultFeeAmount !== feeNum) feeChanged = true;
                batch.defaultFeeAmount = feeNum;
            }
        }
        
        let installmentsChanged = false;
        if (numberOfInstallments) {
            const instNum = Number(numberOfInstallments);
            if (batch.numberOfInstallments !== instNum) installmentsChanged = true;
            batch.numberOfInstallments = instNum;
        }

        // Handle teacher assignment
        if (teacherId) {
            const teacherExists = await User.findOne({ _id: teacherId, role: 'TEACHER', isDeleted: { $ne: true } });
            if (!teacherExists) {
                return res.status(400).json({ message: 'Assigned teacher does not exist' });
            }
            if (batch.teacher && batch.teacher.toString() !== teacherId.toString()) {
                await User.findByIdAndUpdate(batch.teacher, { $pull: { batches: batch._id } });
            }
            batch.teacher = teacherId;
            await User.findByIdAndUpdate(teacherId, { $addToSet: { batches: batch._id } });
        } else if (teacherId === null || teacherId === '') {
            // Remove teacher from batch if empty
            if (batch.teacher) {
                await User.findByIdAndUpdate(batch.teacher, { $pull: { batches: batch._id } });
            }
            batch.teacher = null;
        }

        await batch.save();

        // When batch fee amount or installments change, sync enrolled students and their fee records!
        if (feeChanged || installmentsChanged) {
            const newFeeAmount = batch.defaultFeeAmount;
            const newInstCount = batch.numberOfInstallments || 1;
            
            const enrolledStudents = await Student.find({ batch: batch._id, isDeleted: { $ne: true } });
            
            for (const student of enrolledStudents) {
                const studentFees = await Fee.find({ student: student._id, isDeleted: { $ne: true } });
                const totalPaidSoFar = studentFees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);

                if (totalPaidSoFar === 0) {
                    await Fee.deleteMany({ student: student._id });
                    
                    const feeDocs = [];
                    const baseInst = Math.floor(newFeeAmount / newInstCount);
                    const remainder = newFeeAmount - (baseInst * newInstCount);

                    for (let i = 0; i < newInstCount; i++) {
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + (i * 30));
                        const amt = (i === 0) ? (baseInst + remainder) : baseInst;

                        feeDocs.push({
                            student: student._id,
                            batch: batch._id,
                            installmentNumber: i + 1,
                            amount: amt,
                            amountPaid: 0,
                            status: 'pending',
                            dueDate
                        });
                    }
                    if (feeDocs.length > 0) {
                        await Fee.insertMany(feeDocs);
                    }
                } else if (studentFees.length === 1) {
                    studentFees[0].amount = newFeeAmount;
                    studentFees[0].batch = batch._id;
                    studentFees[0].recomputeStatus();
                    await studentFees[0].save();
                } else if (studentFees.length > 0) {
                    const currentTotal = studentFees.reduce((sum, f) => sum + (f.amount || 0), 0);
                    if (currentTotal > 0 && currentTotal !== newFeeAmount) {
                        const ratio = newFeeAmount / currentTotal;
                        for (const f of studentFees) {
                            f.amount = Math.round(f.amount * ratio);
                            f.batch = batch._id;
                            f.recomputeStatus();
                            await f.save();
                        }
                    }
                }

                student.totalFees = newFeeAmount;
                if (!student.fees) student.fees = {};
                student.fees.totalAmount = newFeeAmount;
                student.fees.paidAmount = totalPaidSoFar;
                student.fees.status = totalPaidSoFar >= newFeeAmount && newFeeAmount > 0 ? 'paid' : (totalPaidSoFar > 0 ? 'partially_paid' : 'pending');
                await student.save();
            }
        }

        res.json(batch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete Student (Soft delete)
// @route   DELETE /api/admin/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        await Student.findByIdAndUpdate(req.params.id, { isDeleted: true });

        // Remove student from Batch students array
        if (student.batch) {
            await Batch.findByIdAndUpdate(student.batch, { $pull: { students: student._id } });
        }

        // Soft delete associated Fee documents
        await Fee.updateMany({ student: student._id }, { $set: { isDeleted: true } });

        // Soft delete associated Attendance documents
        await Attendance.updateMany({ student: student._id }, { $set: { isDeleted: true } });

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Teacher (Soft delete)
// @route   DELETE /api/admin/teachers/:id
// @access  Private (Admin)
const deleteTeacher = async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER', isDeleted: { $ne: true } });
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        teacher.isDeleted = true;
        await teacher.save();

        // Unassign teacher from any batches
        await Batch.updateMany(
            { teacher: teacher._id },
            { $unset: { teacher: "" } }
        );

        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Batch (Soft delete)
// @route   DELETE /api/admin/batches/:id
// @access  Private (Admin)
const deleteBatch = async (req, res) => {
    try {
        const batch = await Batch.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        batch.isDeleted = true;
        await batch.save();

        // Remove batch reference from teacher
        if (batch.teacher) {
            await User.findByIdAndUpdate(batch.teacher, { $pull: { batches: batch._id } });
        }

        // Unassign batch from enrolled students
        await Student.updateMany(
            { batch: batch._id },
            { $unset: { batch: "" } }
        );

        res.json({ message: 'Batch deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardSummary,
    getAttendanceKPI,
    createStudent,
    getStudents,
    deleteStudent,
    createTeacher,
    getTeachers,
    updateTeacher,
    deleteTeacher,
    createBatch,
    getBatches,
    updateBatch,
    deleteBatch,
    getAttendancePDFReport,
    getBatchPerformancePDFReport
};
