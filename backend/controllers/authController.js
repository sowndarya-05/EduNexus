const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const AuditLog = require('../models/AuditLog');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (user.isDeleted) {
                return res.status(401).json({ message: 'Account disabled' });
            }

            // Audit Log
            await AuditLog.create({
                user: user._id,
                action: 'LOGIN',
                details: 'User logged in',
                ip: req.ip
            });

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                firstLogin: user.firstLogin || false,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Admin only)
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password: password || 'Temp@1234',
            role, // 'ADMIN', 'TEACHER', 'PARENT'
            firstLogin: true
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                firstLogin: user.firstLogin,
                message: 'User registered successfully',
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user (Public Signup - DISABLED by Admin)
// @route   POST /api/auth/signup
// @access  Public
const registerPublic = async (req, res) => {
    return res.status(403).json({ message: 'Public signup is disabled. Please contact Admin for account creation.' });
};

// @desc    Change password (First Login or regular update)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword;
        user.firstLogin = false;
        await user.save();

        res.json({
            message: 'Password updated successfully',
            firstLogin: false
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password Request
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email, isDeleted: { $ne: true } });
        if (!user) {
            return res.status(404).json({ message: 'There is no account associated with this email' });
        }

        // Generate 6-digit reset code for user convenience & demo token
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedToken = crypto.createHash('sha256').update(resetCode).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
        await user.save();

        res.json({
            message: 'Password reset code generated and sent to email',
            resetCode,
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password with Code/Token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({ message: 'Email, reset code, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const hashedToken = crypto.createHash('sha256').update(resetCode).digest('hex');

        const user = await User.findOne({
            email,
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        user.password = newPassword;
        user.firstLogin = false;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    authUser,
    registerUser,
    registerPublic,
    changePassword,
    forgotPassword,
    resetPassword
};
