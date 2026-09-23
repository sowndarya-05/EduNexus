const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');

const {
    recordPayment,
    bulkMarkPaid,
    undoPaymentEntry,
    editPaymentEntry,
    deleteFee,
    getFeeAnalytics,
    getUpcomingDues,
    getFees,
    exportFees,
    getFeeStatusBreakdown
} = require('../controllers/feeController');

const { getRiskBreakdown } = require('../controllers/analyticsController');
const {
    getBatchAttendanceSummary,
    getBatchAbsentees,
    getChronicAbsentees
} = require('../controllers/attendanceController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// All admin routes protected by JWT auth middleware + role check (role === 'ADMIN' or 'admin')
router.use(protect);
router.use(authorize('ADMIN', 'admin'));

// 1. Dashboard Summary
router.get('/dashboard/summary', getDashboardSummary);

// Quick Reports PDF Downloads
router.get('/reports/attendance-pdf', getAttendancePDFReport);
router.get('/reports/batch-performance-pdf', getBatchPerformancePDFReport);

// 2. Students Section
router.post('/students', createStudent);
router.get('/students', getStudents);
router.delete('/students/:id', deleteStudent);

// 3. Teachers Section
router.post('/teachers', createTeacher);
router.get('/teachers', getTeachers);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);

// 4. Batches Section
router.post('/batches', createBatch);
router.get('/batches', getBatches);
router.put('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);

// 5. Attendance Section
router.get('/attendance/kpi', getAttendanceKPI);
router.get('/attendance/batches', getBatchAttendanceSummary);
router.get('/attendance/batch/:batchId/absentees', getBatchAbsentees);
router.get('/attendance/chronic-absentees', getChronicAbsentees);

// 6. Fees Section
router.get('/fees/analytics', getFeeAnalytics);
router.get('/fees/status-breakdown', getFeeStatusBreakdown);
router.get('/fees/upcoming', getUpcomingDues);
router.get('/fees/export', exportFees);
router.get('/fees', getFees);
router.delete('/fees/:feeId', deleteFee);
router.patch('/fees/bulk-mark-paid', bulkMarkPaid);
router.patch('/fees/:feeId/record-payment', recordPayment);
router.delete('/fees/:feeId/payment/:paymentHistoryId', undoPaymentEntry);
router.patch('/fees/:feeId/payment/:paymentHistoryId', editPaymentEntry);

// 7. AI Insights Section
router.get('/insights/risk-breakdown', getRiskBreakdown);

module.exports = router;
