const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const User = require('../models/User');

// @desc    Create a student
// @route   POST /api/students
// @access  Private (Admin)
const createStudent = async (req, res) => {
    const { name, email, parentEmail, parentPassword, batch, totalFees } = req.body;

    try {
        // Find or Create/Update parent by email
        let parentId = null;
        if (parentEmail) {
            let parentUser = await User.findOne({ email: parentEmail, role: 'PARENT' });

            if (!parentUser && parentPassword) {
                // Auto-create parent account
                parentUser = await User.create({
                    name: 'Parent of ' + name,
                    email: parentEmail,
                    password: parentPassword,
                    role: 'PARENT'
                });
            } else if (parentUser && parentPassword) {
                // Update password if provided
                parentUser.password = parentPassword;
                await parentUser.save();
            }

            if (parentUser) parentId = parentUser._id;
        }

        let assignedBatch = null;
        let feeTotal = Number(totalFees) || 0;
        let installments = 3;

        if (batch) {
            assignedBatch = await Batch.findById(batch);
            if (assignedBatch) {
                if (!totalFees && assignedBatch.defaultFeeAmount) {
                    feeTotal = assignedBatch.defaultFeeAmount;
                }
                if (assignedBatch.numberOfInstallments) {
                    installments = assignedBatch.numberOfInstallments;
                }
            }
        }

        const student = await Student.create({
            name,
            email,
            parentEmail,
            parent: parentId,
            batch: batch || null,
            totalFees: feeTotal,
            fees: {
                totalAmount: feeTotal,
                paidAmount: 0,
                status: 'pending'
            },
            attendancePercentage: 0,
            riskLevel: 'LOW',
            riskScore: 0
        });

        // Add student to batch.students array
        if (batch) {
            await Batch.findByIdAndUpdate(batch, { $addToSet: { students: student._id } });
        }

        // Auto-create Fee Installment documents if feeTotal > 0
        if (feeTotal > 0) {
            const installmentAmount = Math.round(feeTotal / installments);
            const feeDocs = [];
            for (let i = 1; i <= installments; i++) {
                const dueDate = new Date();
                dueDate.setMonth(dueDate.getMonth() + (i - 1));
                const amt = i === installments ? feeTotal - (installmentAmount * (installments - 1)) : installmentAmount;
                feeDocs.push({
                    student: student._id,
                    batch: batch || null,
                    installmentNumber: i,
                    amount: amt,
                    amountPaid: 0,
                    status: 'pending',
                    dueDate,
                    paymentHistory: []
                });
            }
            await Fee.insertMany(feeDocs);
        }

        res.status(201).json(student);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin), Teacher (Students in their batch)
const getStudents = async (req, res) => {
    try {
        let query = {};
        if (req.query.includeDiscontinued !== 'true') {
            query.isDeleted = { $ne: true };
        }

        // If Teacher, only show students in their Batches
        if (req.user.role === 'TEACHER') {
            const teacherBatches = await Batch.find({ teacher: req.user._id });
            const batchIds = teacherBatches.map(b => b._id);
            query.batch = { $in: batchIds };
        }

        // If Parent, only show their own children
        if (req.user.role === 'PARENT') {
            query.$or = [
                { parent: req.user._id },
                { parentEmail: req.user.email }
            ];
        }

        const students = await Student.find(query)
            .populate('parent', 'name email mobile')
            .populate({
                path: 'batch',
                select: 'name timing subject',
                populate: {
                    path: 'teacher',
                    select: 'name email'
                }
            });

        const studentsWithAttendance = await Promise.all(students.map(async (student) => {
            const attendanceRecords = await Attendance.find({ student: student._id, isDeleted: false });
            const totalSessions = attendanceRecords.length;
            const presentSessions = attendanceRecords.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;

            const attendancePercentage = totalSessions > 0
                ? Math.round((presentSessions / totalSessions) * 100)
                : (student.attendancePercentage || 0);

            const studentObj = student.toObject();
            studentObj.attendancePercentage = attendancePercentage;
            return studentObj;
        }));

        res.json(studentsWithAttendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update student (Assign Parent/Batch)
// @route   PUT /api/students/:id
// @access  Private (Admin)
const updateStudent = async (req, res) => {
    try {
        const { name, email, parentEmail, parentPassword, batch, totalFees } = req.body;
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let parentId = student.parent;
        if (parentId) {
            // Update existing parent if they are already linked
            const parentUser = await User.findById(parentId);
            if (parentUser) {
                if (parentEmail) parentUser.email = parentEmail;
                if (parentPassword) parentUser.password = parentPassword;
                await parentUser.save();
            }
        } else if (parentEmail) {
            // If student didn't have a parent linked, try to find or create one
            let parentUser = await User.findOne({ email: parentEmail, role: 'PARENT' });

            if (!parentUser && parentPassword) {
                parentUser = await User.create({
                    name: 'Parent of ' + (name || student.name),
                    email: parentEmail,
                    password: parentPassword,
                    role: 'PARENT'
                });
            } else if (parentUser && parentPassword) {
                parentUser.password = parentPassword;
                await parentUser.save();
            }

            if (parentUser) parentId = parentUser._id;
        }

        const oldBatch = student.batch ? student.batch.toString() : null;
        const newBatch = batch ? batch.toString() : null;

        if (oldBatch && oldBatch !== newBatch) {
            await Batch.findByIdAndUpdate(oldBatch, { $pull: { students: student._id } });
        }
        if (newBatch && oldBatch !== newBatch) {
            await Batch.findByIdAndUpdate(newBatch, { $addToSet: { students: student._id } });
        }

        student.name = name || student.name;
        student.email = email || student.email;
        student.parentEmail = parentEmail || student.parentEmail;
        student.parent = parentId;
        student.batch = batch !== undefined ? (batch || null) : student.batch;
        if (totalFees !== undefined) student.totalFees = totalFees;

        const updatedStudent = await student.save();
        res.json(updatedStudent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete student (Soft delete)
// @route   DELETE /api/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        await Student.findByIdAndUpdate(req.params.id, { isDeleted: true });

        if (student.batch) {
            await Batch.findByIdAndUpdate(student.batch, { $pull: { students: student._id } });
        }

        await Fee.updateMany({ student: student._id }, { $set: { isDeleted: true } });
        await Attendance.updateMany({ student: student._id }, { $set: { isDeleted: true } });

        res.json({ message: 'Student removed (soft delete)' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private (Admin, Teacher)
const getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('parent', 'name email mobile')
            .populate('batch', 'name');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const attendanceRecords = await Attendance.find({ student: student._id, isDeleted: false });
        const totalSessions = attendanceRecords.length;
        const presentSessions = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
        const attendancePercentage = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

        res.json({
            ...student._doc,
            attendancePercentage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
};

