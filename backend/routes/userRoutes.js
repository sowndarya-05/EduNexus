const express = require('express');
const router = express.Router();
const { getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .get(protect, authorize('ADMIN'), getUsers);

router.route('/:id')
    .put(protect, authorize('ADMIN'), updateUser)
    .delete(protect, authorize('ADMIN'), deleteUser);

module.exports = router;
