const express = require('express');
const router = express.Router();
const { calculateRisk, getRiskAnalytics, recalculateStudentMetrics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/calculate', protect, authorize('ADMIN'), calculateRisk);
router.post('/calculate-risk', protect, authorize('ADMIN'), calculateRisk);
router.post('/recalculate-metrics', protect, authorize('ADMIN'), recalculateStudentMetrics);
router.get('/', protect, authorize('ADMIN'), getRiskAnalytics);

module.exports = router;
