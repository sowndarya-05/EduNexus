const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance, bulkAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, authorize('ADMIN', 'TEACHER'), markAttendance)
    .get(protect, getAttendance);

router.post('/bulk', protect, authorize('ADMIN', 'TEACHER'), bulkAttendance);


module.exports = router;
