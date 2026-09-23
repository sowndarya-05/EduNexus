const express = require('express');
const router = express.Router();
const { recordScore, getStudentScores, getBatchScores } = require('../controllers/scoreController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, authorize('ADMIN', 'TEACHER'), recordScore);

router.get('/student/:studentId', protect, getStudentScores);
router.get('/batch/:batchId', protect, authorize('ADMIN', 'TEACHER'), getBatchScores);

module.exports = router;
