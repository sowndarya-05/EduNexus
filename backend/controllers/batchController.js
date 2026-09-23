const Batch = require('../models/Batch');

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
            if (defaultFeeAmount !== undefined) batch.defaultFeeAmount = Number(defaultFeeAmount);
            if (numberOfInstallments !== undefined) batch.numberOfInstallments = Number(numberOfInstallments);

            const updatedBatch = await batch.save();
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

