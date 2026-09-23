const express = require('express');
const router = express.Router();
const {
    createStudent,
    getStudents,
    updateStudent,
    deleteStudent,
    getStudentById,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, authorize('ADMIN'), createStudent)
    .get(protect, authorize('ADMIN', 'TEACHER', 'PARENT'), getStudents); // Teacher sees only their batch students, Parent sees their children

router.route('/:id')
    .get(protect, authorize('ADMIN', 'TEACHER', 'PARENT'), getStudentById)
    .put(protect, authorize('ADMIN'), updateStudent)
    .delete(protect, authorize('ADMIN'), deleteStudent);


module.exports = router;
