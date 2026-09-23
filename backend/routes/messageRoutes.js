const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getAllMessages, getMessageableParents } = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, sendMessage);
router.get('/', protect, getAllMessages);
router.get('/contacts', protect, getMessageableParents); // Must be before /:userId
router.get('/:userId', protect, getMessages);

module.exports = router;
