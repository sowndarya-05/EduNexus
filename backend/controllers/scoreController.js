const Score = require('../models/Score');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');
const Message = require('../models/Message');

// Grade rank map — lower number = better grade
const GRADE_RANK = { O: 1, 'A+': 2, A: 3, 'B+': 4, B: 5, C: 6, F: 7 };

// Grade → descriptive label for messages
const GRADE_LABEL = {
    O: 'Outstanding (O)',
    'A+': 'Excellent (A+)',
    A: 'Very Good (A)',
    'B+': 'Good (B+)',
    B: 'Average (B)',
    C: 'Needs Improvement (C)',
    F: 'Fail (F)',
};

// @desc    Add or update a student grade
// @route   POST /api/scores
// @access  Private (Teacher, Admin)
const recordScore = async (req, res) => {
    const { student, batch, grade, remark, date } = req.body;

    try {
        // Validate grade value
        if (!GRADE_RANK[grade]) {
            return res.status(400).json({ message: 'Invalid grade. Must be one of: O, A+, A, B+, B, C, F' });
        }

        const batchObj = await Batch.findById(batch);
        if (req.user.role === 'TEACHER' && batchObj.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized for this batch' });
        }

        const scoreDate = date ? new Date(date) : new Date();
        scoreDate.setHours(0, 0, 0, 0);

        const newScore = await Score.create({
            student,
            batch,
            grade,
            remark: remark || 'Teacher Grade Entry',
            date: scoreDate,
        });

        // Update student's latestGrade field
        const studentDoc = await Student.findByIdAndUpdate(
            student,
            { latestGrade: grade },
            { new: false }
        );

        // Create Audit Log
        if (studentDoc) {
            await AuditLog.create({
                user: req.user._id,
                action: 'SCORE_UPDATE',
                details: `Assigned grade ${grade} (${GRADE_LABEL[grade]}) for ${studentDoc.name} in batch ${batchObj.name}`,
                ip: req.ip,
            });

            // Notify Parent (Internal Message)
            if (studentDoc.parent) {
                const messageText = `Grade Update: ${studentDoc.name} received grade ${grade} — ${GRADE_LABEL[grade]} in ${batchObj.name} for the assessment on ${scoreDate.toDateString()}.`;
                await Message.create({
                    sender: req.user._id,
                    receiver: studentDoc.parent,
                    text: messageText,
                });
            }
        }

        res.status(201).json(newScore);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get grades for a student
// @route   GET /api/scores/student/:studentId
// @access  Private (Parent, Teacher, Admin)
const getStudentScores = async (req, res) => {
    try {
        const query = { student: req.params.studentId, isDeleted: false };
        
        // If parent, only show published scores if linked to an assessment
        if (req.user.role === 'PARENT') {
            query.$or = [
                { assessment: { $exists: false } },
                { isPublished: true }
            ];
        }

        const scores = await Score.find(query)
            .populate('batch', 'name subject')
            .populate('assessment', 'title subject maxMarks passingMarks date status')
            .sort({ date: -1, createdAt: -1 });
        res.json(scores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get grades for a batch
// @route   GET /api/scores/batch/:batchId
// @access  Private (Teacher, Admin)
const getBatchScores = async (req, res) => {
    try {
        const scores = await Score.find({ batch: req.params.batchId, isDeleted: false })
            .populate('student', 'name email')
            .sort({ date: -1 });
        res.json(scores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    recordScore,
    getStudentScores,
    getBatchScores,
};
