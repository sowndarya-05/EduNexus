const express = require('express');
const router = express.Router();
const {
    createAssessment,
    getBatchAssessments,
    getAssessmentById,
    saveBulkScores,
    publishAssessment,
    deleteAssessment,
} = require('../controllers/assessmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, authorize('ADMIN', 'TEACHER'), createAssessment);

router.route('/batch/:batchId')
    .get(protect, authorize('ADMIN', 'TEACHER'), getBatchAssessments);

router.route('/:id')
    .get(protect, getAssessmentById)
    .delete(protect, authorize('ADMIN', 'TEACHER'), deleteAssessment);

router.route('/:id/scores/bulk')
    .post(protect, authorize('ADMIN', 'TEACHER'), saveBulkScores);

router.route('/:id/publish')
    .post(protect, authorize('ADMIN', 'TEACHER'), publishAssessment);

module.exports = router;
