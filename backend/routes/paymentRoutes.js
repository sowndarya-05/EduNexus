const express = require('express');
const router = express.Router();
const {
    recordPayment,
    getPayments,
    getPendingFees,
    updatePayment,
    deletePayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, authorize('ADMIN'), recordPayment)
    .get(protect, authorize('ADMIN', 'TEACHER', 'PARENT'), getPayments);

router.get('/pending', protect, authorize('ADMIN'), getPendingFees);

router.route('/:id')
    .put(protect, authorize('ADMIN'), updatePayment)
    .delete(protect, authorize('ADMIN'), deletePayment);


module.exports = router;
