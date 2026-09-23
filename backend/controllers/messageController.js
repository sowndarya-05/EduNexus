const Message = require('../models/Message');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private (Parent, Teacher)
const sendMessage = async (req, res) => {
    const { receiverId, text } = req.body;
    const senderId = req.user._id;
    try {
        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: 'User not found' });

        let isAuthorized = false;
        if (req.user.role === 'ADMIN' || receiver.role === 'ADMIN') {
            isAuthorized = true;
        } else if (req.user.role === 'PARENT' && receiver.role === 'TEACHER') {
            const students = await Student.find({ $or: [{ parent: senderId }, { parentEmail: req.user.email }] });
            const batchIds = students.map(s => s.batch).filter(Boolean);
            const count = await Batch.countDocuments({ _id: { $in: batchIds }, teacher: receiverId });
            if (count > 0) isAuthorized = true;
        } else if (req.user.role === 'TEACHER' && receiver.role === 'PARENT') {
            const teacherBatches = await Batch.find({ teacher: senderId });
            const batchIds = teacherBatches.map(b => b._id);
            const count = await Student.countDocuments({
                batch: { $in: batchIds },
                $or: [{ parent: receiverId }, { parentEmail: receiver.email }]
            });
            if (count > 0) isAuthorized = true;
        }

        if (!isAuthorized) return res.status(403).json({ message: 'Not authorized to message this user' });

        const message = await Message.create({ sender: senderId, receiver: receiverId, text });
        await message.populate('sender', 'name email role');
        await message.populate('receiver', 'name email role');
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get conversation with a user
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [{ sender: myId, receiver: userId }, { sender: userId, receiver: myId }],
            isDeleted: false
        })
            .populate('sender', 'name email role')
            .populate('receiver', 'name email role')
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all messages for current user
// @route   GET /api/messages
// @access  Private
const getAllMessages = async (req, res) => {
    try {
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [{ sender: myId }, { receiver: myId }],
            isDeleted: false
        })
            .populate('sender', 'name email role')
            .populate('receiver', 'name email role')
            .sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all parents the teacher can message
// @route   GET /api/messages/contacts
// @access  Private (Teacher)
const getMessageableParents = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const batches = await Batch.find({ teacher: teacherId }).select('_id name subject');
        const batchIds = batches.map(b => b._id);

        const students = await Student.find({ batch: { $in: batchIds }, isDeleted: { $ne: true } })
            .populate('parent', 'name email role')
            .populate('batch', 'name subject');

        // For students with only parentEmail (no linked parent User), look up by email
        const orphanEmails = students
            .filter(s => !s.parent || !s.parent._id)
            .map(s => s.parentEmail)
            .filter(Boolean);

        const emailParents = orphanEmails.length > 0
            ? await User.find({ email: { $in: orphanEmails }, role: 'PARENT' }).select('name email role')
            : [];

        const emailParentMap = {};
        emailParents.forEach(p => { emailParentMap[p.email] = p; });

        const parentMap = {};
        students.forEach(student => {
            let parentUser = null;
            if (student.parent && student.parent._id) {
                parentUser = student.parent;
            } else if (student.parentEmail && emailParentMap[student.parentEmail]) {
                parentUser = emailParentMap[student.parentEmail];
            }

            if (parentUser) {
                const parentId = parentUser._id.toString();
                if (!parentMap[parentId]) {
                    parentMap[parentId] = {
                        _id: parentUser._id,
                        name: parentUser.name,
                        email: parentUser.email,
                        role: parentUser.role,
                        children: []
                    };
                }
                parentMap[parentId].children.push({
                    studentName: student.name,
                    batchName: student.batch ? student.batch.name : '',
                    subject: student.batch ? student.batch.subject : ''
                });
            }
        });

        res.json(Object.values(parentMap));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { sendMessage, getMessages, getAllMessages, getMessageableParents };
