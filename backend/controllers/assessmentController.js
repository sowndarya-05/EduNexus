const Assessment = require('../models/Assessment');
const Score = require('../models/Score');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');
const { 
    getGradingScale, 
    calculateScoreDetails, 
    calculateAssessmentAnalytics 
} = require('../utils/gradingEngine');

// @desc    Create a new assessment
// @route   POST /api/assessments
// @access  Private (Teacher, Admin)
const createAssessment = async (req, res) => {
    try {
        const { 
            title, 
            subject, 
            batch, 
            maxMarks, 
            passingMarks, 
            date, 
            gradingSystem, 
            gradingScale 
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Test Name / Title is required' });
        }
        if (!batch) {
            return res.status(400).json({ message: 'Batch is required' });
        }

        const max = Number(maxMarks) || 100;
        const pass = Number(passingMarks) || 40;

        if (max <= 0) {
            return res.status(400).json({ message: 'Maximum marks must be greater than 0' });
        }
        if (pass < 0 || pass > max) {
            return res.status(400).json({ message: `Passing marks must be between 0 and ${max}` });
        }

        const batchDoc = await Batch.findById(batch);
        if (!batchDoc || batchDoc.isDeleted) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (req.user.role === 'TEACHER' && batchDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to create assessments for this batch' });
        }

        const selectedGradingSystem = gradingSystem || 'PERCENTAGE_STANDARD';
        const finalScale = getGradingScale(selectedGradingSystem, gradingScale);

        const assessment = await Assessment.create({
            title: title.trim(),
            subject: subject ? subject.trim() : (batchDoc.subject || ''),
            batch: batchDoc._id,
            teacher: req.user._id,
            maxMarks: max,
            passingMarks: pass,
            date: date ? new Date(date) : new Date(),
            gradingSystem: selectedGradingSystem,
            gradingScale: finalScale,
            status: 'DRAFT',
        });

        await AuditLog.create({
            user: req.user._id,
            action: 'ASSESSMENT_CREATE',
            details: `Created assessment "${assessment.title}" for batch "${batchDoc.name}" with max marks ${max}`,
            ip: req.ip,
        });

        res.status(201).json(assessment);
    } catch (error) {
        console.error('Error creating assessment:', error);
        res.status(400).json({ message: error.message || 'Failed to create assessment' });
    }
};

// @desc    Get all assessments for a batch
// @route   GET /api/assessments/batch/:batchId
// @access  Private (Teacher, Admin)
const getBatchAssessments = async (req, res) => {
    try {
        const { batchId } = req.params;
        const batchDoc = await Batch.findById(batchId).populate('students');
        if (!batchDoc || batchDoc.isDeleted) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (req.user.role === 'TEACHER' && batchDoc.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized for this batch' });
        }

        const assessments = await Assessment.find({ batch: batchId, isDeleted: false })
            .sort({ date: -1, createdAt: -1 });

        const activeStudentsCount = (batchDoc.students || []).filter(s => s && !s.isDeleted).length;

        // Fetch score stats for each assessment
        const enrichedAssessments = await Promise.all(
            assessments.map(async (ass) => {
                const scores = await Score.find({ assessment: ass._id, isDeleted: false });
                const analytics = calculateAssessmentAnalytics(scores, ass.maxMarks, ass.passingMarks);

                return {
                    ...ass.toObject(),
                    totalBatchStudents: activeStudentsCount,
                    evaluatedCount: analytics.totalEvaluated,
                    averagePercentage: analytics.averagePercentage,
                    passRate: analytics.passRate,
                    highestScore: analytics.highestScore,
                    lowestScore: analytics.lowestScore,
                };
            })
        );

        res.json(enrichedAssessments);
    } catch (error) {
        console.error('Error fetching batch assessments:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch assessments' });
    }
};

// @desc    Get single assessment with all student scores and analytics
// @route   GET /api/assessments/:id
// @access  Private (Teacher, Admin, Parent)
const getAssessmentById = async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id)
            .populate('batch', 'name subject teacher students')
            .populate('teacher', 'name email');

        if (!assessment || assessment.isDeleted) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Authorization check
        if (req.user.role === 'TEACHER' && assessment.teacher._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this assessment' });
        }

        // Fetch all active students in batch
        const batch = await Batch.findById(assessment.batch._id).populate({
            path: 'students',
            match: { isDeleted: false },
            select: 'name email parent parentEmail attendancePercentage latestGrade',
        });

        const students = batch?.students || [];

        // Fetch all scores for this assessment
        const scores = await Score.find({ assessment: assessment._id, isDeleted: false });
        const scoreMap = new Map();
        scores.forEach(s => scoreMap.set(s.student.toString(), s));

        // Format student score roster
        const roster = students.map(student => {
            const existingScore = scoreMap.get(student._id.toString());
            return {
                student: {
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    parent: student.parent,
                    parentEmail: student.parentEmail,
                    latestGrade: student.latestGrade,
                    attendancePercentage: student.attendancePercentage,
                },
                scoreId: existingScore?._id || null,
                marksObtained: existingScore !== undefined && existingScore.marksObtained !== undefined ? existingScore.marksObtained : '',
                percentage: existingScore?.percentage !== undefined ? existingScore.percentage : null,
                grade: existingScore?.grade || '',
                status: existingScore?.status || '',
                remark: existingScore?.remark || '',
                isPublished: existingScore?.isPublished || false,
            };
        });

        const analytics = calculateAssessmentAnalytics(scores, assessment.maxMarks, assessment.passingMarks);

        res.json({
            assessment,
            roster,
            analytics,
        });
    } catch (error) {
        console.error('Error fetching assessment details:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch assessment' });
    }
};

// @desc    Bulk save scores for an assessment (Draft mode)
// @route   POST /api/assessments/:id/scores/bulk
// @access  Private (Teacher, Admin)
const saveBulkScores = async (req, res) => {
    try {
        const { id } = req.params;
        const { scores: entries } = req.body; // array of { studentId, marksObtained, remark }

        if (!Array.isArray(entries)) {
            return res.status(400).json({ message: 'Scores payload must be an array' });
        }

        const assessment = await Assessment.findById(id);
        if (!assessment || assessment.isDeleted) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (req.user.role === 'TEACHER' && assessment.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized for this assessment' });
        }

        const scale = assessment.gradingScale && assessment.gradingScale.length > 0
            ? assessment.gradingScale
            : getGradingScale(assessment.gradingSystem);

        const savedScores = [];
        const errors = [];

        for (const entry of entries) {
            const { studentId, marksObtained, remark } = entry;

            // Allow blank/skipped students without throwing error
            if (marksObtained === '' || marksObtained === null || marksObtained === undefined) {
                continue;
            }

            const numMarks = Number(marksObtained);
            if (isNaN(numMarks) || numMarks < 0 || numMarks > assessment.maxMarks) {
                errors.push(`Invalid marks for student ${studentId}: must be between 0 and ${assessment.maxMarks}`);
                continue;
            }

            const calculated = calculateScoreDetails(
                numMarks,
                assessment.maxMarks,
                assessment.passingMarks,
                scale
            );

            const scoreDoc = await Score.findOneAndUpdate(
                { assessment: assessment._id, student: studentId },
                {
                    assessment: assessment._id,
                    student: studentId,
                    batch: assessment.batch,
                    marksObtained: calculated.marksObtained,
                    maxMarks: calculated.maxMarks,
                    percentage: calculated.percentage,
                    grade: calculated.grade,
                    status: calculated.status,
                    remark: remark || '',
                    date: assessment.date || new Date(),
                    isPublished: assessment.status === 'PUBLISHED',
                    isDeleted: false,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            savedScores.push(scoreDoc);
        }

        if (errors.length > 0 && savedScores.length === 0) {
            return res.status(400).json({ message: errors.join(', ') });
        }

        // Recalculate fresh analytics
        const allAssessmentScores = await Score.find({ assessment: assessment._id, isDeleted: false });
        const analytics = calculateAssessmentAnalytics(
            allAssessmentScores,
            assessment.maxMarks,
            assessment.passingMarks
        );

        res.json({
            message: `Successfully saved ${savedScores.length} score records`,
            savedCount: savedScores.length,
            errors,
            analytics,
        });
    } catch (error) {
        console.error('Error saving bulk scores:', error);
        res.status(400).json({ message: error.message || 'Failed to save scores' });
    }
};

// @desc    Publish assessment results and send automated parent messages
// @route   POST /api/assessments/:id/publish
// @access  Private (Teacher, Admin)
const publishAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const assessment = await Assessment.findById(id).populate('batch');

        if (!assessment || assessment.isDeleted) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (req.user.role === 'TEACHER' && assessment.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to publish this assessment' });
        }

        // Update all score records for this assessment to isPublished: true
        await Score.updateMany(
            { assessment: assessment._id, isDeleted: false },
            { isPublished: true }
        );

        const scores = await Score.find({ assessment: assessment._id, isDeleted: false })
            .populate({
                path: 'student',
                select: 'name email parent parentEmail',
            });

        if (scores.length === 0) {
            return res.status(400).json({ message: 'Cannot publish assessment with zero entered scores. Please enter scores first.' });
        }

        let messagesSent = 0;
        const now = new Date();

        for (const score of scores) {
            const student = score.student;
            if (!student) continue;

            // Sync student's latestGrade
            await Student.findByIdAndUpdate(student._id, {
                latestGrade: score.grade,
            });

            // Automatically notify parent if student has a linked parent account
            if (student.parent) {
                const messageSubjectPrefix = `📚 Assessment Result\n${student.name}'s ${assessment.title} result has been published.\n\nScore: ${score.marksObtained}/${assessment.maxMarks}\nPercentage: ${score.percentage}%\nGrade: ${score.grade}\nStatus: ${score.status}`;

                // Check if identical result message was already sent to avoid duplicate spam
                const existingMsg = await Message.findOne({
                    sender: req.user._id,
                    receiver: student.parent,
                    text: new RegExp(`${assessment.title}.*Score: ${score.marksObtained}/${assessment.maxMarks}`, 's'),
                });

                if (!existingMsg) {
                    await Message.create({
                        sender: req.user._id,
                        receiver: student.parent,
                        text: messageSubjectPrefix,
                    });
                    messagesSent++;
                }
            }
        }

        assessment.status = 'PUBLISHED';
        assessment.publishedAt = now;
        assessment.publishedMessageCount = (assessment.publishedMessageCount || 0) + messagesSent;
        await assessment.save();

        await AuditLog.create({
            user: req.user._id,
            action: 'ASSESSMENT_PUBLISH',
            details: `Published results for assessment "${assessment.title}". Sent ${messagesSent} parent notifications.`,
            ip: req.ip,
        });

        res.json({
            message: `Assessment successfully published! Sent ${messagesSent} parent notification(s).`,
            assessment,
            notificationsSent: messagesSent,
        });
    } catch (error) {
        console.error('Error publishing assessment:', error);
        res.status(500).json({ message: error.message || 'Failed to publish assessment' });
    }
};

// @desc    Delete an assessment (Soft delete)
// @route   DELETE /api/assessments/:id
// @access  Private (Teacher, Admin)
const deleteAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment || assessment.isDeleted) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (req.user.role === 'TEACHER' && assessment.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this assessment' });
        }

        assessment.isDeleted = true;
        await assessment.save();

        // Soft delete associated scores
        await Score.updateMany({ assessment: assessment._id }, { isDeleted: true });

        await AuditLog.create({
            user: req.user._id,
            action: 'ASSESSMENT_DELETE',
            details: `Deleted assessment "${assessment.title}"`,
            ip: req.ip,
        });

        res.json({ message: 'Assessment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assessment:', error);
        res.status(500).json({ message: error.message || 'Failed to delete assessment' });
    }
};

module.exports = {
    createAssessment,
    getBatchAssessments,
    getAssessmentById,
    saveBulkScores,
    publishAssessment,
    deleteAssessment,
};
