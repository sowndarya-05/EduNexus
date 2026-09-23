const express = require('express');
const router = express.Router();
const {
    createBatch,
    getBatches,
    getMyBatches,
    getBatchById,
    updateBatch,
    deleteBatch,
} = require('../controllers/batchController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, authorize('ADMIN'), createBatch)
    .get(protect, authorize('ADMIN'), getBatches);

router.get('/my-batches', protect, authorize('TEACHER'), getMyBatches);

router.route('/:id')
    .get(protect, getBatchById)
    .put(protect, authorize('ADMIN'), updateBatch)
    .delete(protect, authorize('ADMIN'), deleteBatch);

router.get('/:id/students', protect, require('../controllers/batchController').getStudentsInBatch);


module.exports = router;
