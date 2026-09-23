const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Fee = require('../models/Fee');

// @desc    Create a batch
// @route   POST /api/batches
// @access  Private (Admin)
const createBatch = async (req, res) => {
    const { name, timing, teacher, subject, defaultFeeAmount, numberOfInstallments } = req.body;

    try {
        const batch = await Batch.create({
            name,
            timing,
            teacher,
            subject,
            defaultFeeAmount: Number(defaultFeeAmount) || 0,
            numberOfInstallments: Number(numberOfInstallments) || 3,
        });

        res.status(201).json(batch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private (Admin)
const getBatches = async (req, res) => {
    try {
        const batches = await Batch.find({ isDeleted: false })
            .populate('teacher', 'name email')
            .populate({
                path: 'students',
                match: { isDeleted: false },
                select: 'name'
            });
        const sanitized = batches.map(b => {
            const obj = b.toObject();
            obj.students = (obj.students || []).filter(Boolean);
            return obj;
        });
        res.json(sanitized);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get teacher's batches
// @route   GET /api/batches/my-batches
// @access  Private (Teacher)
const getMyBatches = async (req, res) => {
    try {
        const batches = await Batch.find({ teacher: req.user._id, isDeleted: false })
            .populate({
                path: 'students',
                match: { isDeleted: false },
                select: 'name email attendancePercentage latestGrade latestScore riskLevel riskReason isDeleted'
            });
        const sanitized = batches.map(b => {
            const obj = b.toObject();
            obj.students = (obj.students || []).filter(Boolean);
            return obj;
        });
        res.json(sanitized);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get batch by ID
// @route   GET /api/batches/:id
// @access  Private
const getBatchById = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id)
            .populate('teacher', 'name email')
            .populate({
                path: 'students',
                match: { isDeleted: false },
                select: 'name'
            });

        if (batch) {
            const obj = batch.toObject();
            obj.students = (obj.students || []).filter(Boolean);
            res.json(obj);
        } else {
            res.status(404).json({ message: 'Batch not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
// @access  Private (Admin)
const updateBatch = async (req, res) => {
    const { name, timing, teacher, subject, defaultFeeAmount, numberOfInstallments } = req.body;

    try {
        const batch = await Batch.findById(req.params.id);

        if (batch) {
            batch.name = name || batch.name;
            batch.timing = timing || batch.timing;
            batch.teacher = teacher || batch.teacher;
            batch.subject = subject || batch.subject;

            let feeChanged = false;
            let installmentsChanged = false;

            if (defaultFeeAmount !== undefined && defaultFeeAmount !== null) {
                const feeNum = Number(defaultFeeAmount);
                if (!isNaN(feeNum) && feeNum > 0) {
                    if (batch.defaultFeeAmount !== feeNum) feeChanged = true;
                    batch.defaultFeeAmount = feeNum;
                }
            }
            if (numberOfInstallments !== undefined && numberOfInstallments !== null) {
                const instNum = Number(numberOfInstallments);
                if (!isNaN(instNum) && instNum > 0) {
                    if (batch.numberOfInstallments !== instNum) installmentsChanged = true;
                    batch.numberOfInstallments = instNum;
                }
            }

            const updatedBatch = await batch.save();

            // Sync enrolled students fee records if fee changed
            if (feeChanged || installmentsChanged) {
                const newFeeAmount = updatedBatch.defaultFeeAmount;
                const newInstCount = updatedBatch.numberOfInstallments || 1;
                const enrolledStudents = await Student.find({ batch: updatedBatch._id, isDeleted: { $ne: true } });

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
                                batch: updatedBatch._id,
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
                        studentFees[0].batch = updatedBatch._id;
                        studentFees[0].recomputeStatus();
                        await studentFees[0].save();
                    } else if (studentFees.length > 0) {
                        const currentTotal = studentFees.reduce((sum, f) => sum + (f.amount || 0), 0);
                        if (currentTotal > 0 && currentTotal !== newFeeAmount) {
                            const ratio = newFeeAmount / currentTotal;
                            for (const f of studentFees) {
                                f.amount = Math.round(f.amount * ratio);
                                f.batch = updatedBatch._id;
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

            res.json(updatedBatch);
        } else {
            res.status(404).json({ message: 'Batch not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete batch
// @route   DELETE /api/batches/:id
// @access  Private (Admin)
const deleteBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);

        if (batch) {
            batch.isDeleted = true;
            await batch.save();
            res.json({ message: 'Batch removed' });
        } else {
            res.status(404).json({ message: 'Batch not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get students in a batch
// @route   GET /api/batches/:id/students
// @access  Private
const getStudentsInBatch = async (req, res) => {
    try {
        const Student = require('../models/Student'); // Import here to avoid circular dependency if any
        const students = await Student.find({ batch: req.params.id, isDeleted: false })
            .select('name email attendancePercentage latestGrade latestScore riskLevel riskReason')
            .populate('parent', 'name email mobile');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createBatch,
    getBatches,
    getMyBatches,
    getBatchById,
    updateBatch,
    deleteBatch,
    getStudentsInBatch,
};

