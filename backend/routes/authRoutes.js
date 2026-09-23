const express = require('express');
const router = express.Router();

const {
    authUser,
    registerUser,
    registerPublic,
    changePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');


const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/login', authUser);
router.post('/signup', registerPublic); // Public signup
router.post('/register', protect, authorize('ADMIN'), registerUser); // Admin-only

router.post('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
