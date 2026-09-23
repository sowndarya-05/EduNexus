const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Message = require('../models/Message');
const sendEmail = require('../utils/sendEmail');

// @desc    Mark attendance for a list of students
// @route   POST /api/attendance
// @access  Private (Teacher, Admin)
const markAttendance = async (req, res) => {
    const { batchId, date, records } = req.body;
    // records: [{ studentId, status }]

    try {
        // Optional: Validate that the teacher owns the batch (if teacher)
        if (req.user.role === 'TEACHER') {
            const batch = await Batch.findById(batchId);
            if (batch.teacher.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized for this batch' });
            }
        }

        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(0, 0, 0, 0); // Normalize time

        const results = [];
        const emailPromises = [];

        for (const record of records) {
            const { studentId, status } = record;

            // Upsert attendance record
            let attendance = await Attendance.findOne({
                student: studentId,
                date: attendanceDate,
            });

            if (attendance) {
                attendance.status = status;
                await attendance.save();
            } else {
                attendance = await Attendance.create({
                    student: studentId,
                    batch: batchId,
                    date: attendanceDate,
                    status,
                });
            }
            results.push(attendance);

            // Recalculate and update student attendancePercentage
            const allRecords = await Attendance.find({ student: studentId, isDeleted: false });
            const total = allRecords.length;
            const present = allRecords.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            await Student.findByIdAndUpdate(studentId, { attendancePercentage: percentage });

            // Internal Message Logic for Absence
            const isAbsentStatus = ['absent', 'late'].includes((status || '').toLowerCase());
            if (isAbsentStatus) {
                const student = await Student.findById(studentId).populate('parent');
                if (student && student.parent) {
                    const alertText = `Attendance Alert: ${student.name} was marked ${status} for the class on ${attendanceDate.toDateString()} by Teacher ${req.user.name}.`;

                    // Create internal message for parent
                    await Message.create({
                        sender: req.user._id,
                        receiver: student.parent._id || student.parent,
                        text: alertText
                    });
                }
            }
        }

        await Promise.all(emailPromises);

        res.status(201).json({ message: 'Attendance marked', results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper to safely parse YYYY-MM-DD or date object into local start/end of day
const parseDateRange = (dateStr) => {
    if (!dateStr) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const start = new Date(y, m, d, 0, 0, 0, 0);
            const end = new Date(y, m, d, 23, 59, 59, 999);
            return { start, end };
        }
    }
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// @desc    Get attendance history
// @route   GET /api/attendance
// @access  Private (Admin, Teacher, Parent)
const getAttendance = async (req, res) => {
    try {
        const { studentId, batchId, date, month, year } = req.query;
        let query = { isDeleted: { $ne: true } };

        if (month && year) {
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
            const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
            query.date = { $gte: startOfMonth, $lte: endOfMonth };
        } else if (date) {
            const { start, end } = parseDateRange(date);
            query.date = { $gte: start, $lte: end };
        }

        // Role-based filters
        if (req.user.role === 'PARENT') {
            // Find children of this parent
            const students = await Student.find({ parent: req.user._id, isDeleted: { $ne: true } });
            const studentIds = students.map(s => s._id);

            // Use studentId query param if provided and valid (is one of their kids), otherwise all kids
            if (studentId && studentIds.some(id => id.toString() === studentId)) {
                query.student = studentId;
            } else {
                query.student = { $in: studentIds };
            }
        } else if (req.user.role === 'TEACHER') {
            const teacherBatches = await Batch.find({ teacher: req.user._id, isDeleted: { $ne: true } });
            const teacherBatchIds = teacherBatches.map(b => b._id.toString());

            if (batchId) {
                if (!teacherBatchIds.includes(batchId)) {
                    return res.status(403).json({ message: 'Not authorized for this batch' });
                }
                query.batch = batchId;
            } else {
                query.batch = { $in: teacherBatchIds };
            }
        } else if (req.user.role === 'ADMIN') {
            if (studentId) query.student = studentId;
            if (batchId) query.batch = batchId;
        }

        const attendance = await Attendance.find(query)
            .populate('student', 'name')
            .populate('batch', 'name')
            .sort({ date: -1 });

        // Filter out records where student is null (student was hard deleted)
        const validAttendance = attendance.filter(record => record.student);

        res.json(validAttendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk mark attendance
// @route   POST /api/attendance/bulk
const bulkAttendance = async (req, res) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Invalid records' });
        }

        const results = [];
        for (const record of records) {
            const { student, batch, date, status } = record;
            const { start, end } = parseDateRange(date);

            let attendance = await Attendance.findOne({
                student,
                date: { $gte: start, $lte: end },
            });

            if (attendance) {
                attendance.status = status;
                attendance.batch = batch || attendance.batch;
                await attendance.save();
            } else {
                attendance = await Attendance.create({
                    student,
                    batch,
                    date: start,
                    status,
                });
            }
            results.push(attendance);

            // Recalculate and update student attendancePercentage
            const allRecords = await Attendance.find({ student: student, isDeleted: { $ne: true } });
            const total = allRecords.length;
            const present = allRecords.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            await Student.findByIdAndUpdate(student, { attendancePercentage: percentage });

            // Internal Message Logic for Absence in Bulk
            const isAbsent = ['absent', 'late'].includes((status || '').toLowerCase());
            if (isAbsent) {
                const studentDoc = await Student.findById(student).populate('parent');
                if (studentDoc && studentDoc.parent) {
                    const alertText = `Attendance Alert: ${studentDoc.name} was marked ${status} for the class on ${start.toDateString()} by Teacher ${req.user.name}.`;
                    await Message.create({
                        sender: req.user._id,
                        receiver: studentDoc.parent._id || studentDoc.parent,
                        text: alertText
                    });
                }
            }
        }

        res.status(201).json({ message: 'Bulk attendance marked', results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get batch attendance summary per batch for a given date or month
// @route   GET /api/admin/attendance/batches?date=&month=&year=
// @access  Private (Admin)
const getBatchAttendanceSummary = async (req, res) => {
    try {
        const { date, month, year } = req.query;
        let startDate, endDate;

        if (month && year) {
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
            endDate = new Date(y, m, 0, 23, 59, 59, 999);
        } else {
            const range = parseDateRange(date);
            startDate = range.start;
            endDate = range.end;
        }

        const batches = await Batch.find({ isDeleted: { $ne: true } }).populate('students');

        const summaries = await Promise.all(batches.map(async (batch) => {
            const records = await Attendance.find({
                batch: batch._id,
                date: { $gte: startDate, $lte: endDate },
                isDeleted: { $ne: true }
            });

            const marked = records.length > 0;
            const totalStudents = batch.students ? batch.students.filter(s => !s.isDeleted).length : 0;
            const presentCount = records.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
            const absentCount = records.filter(r => (r.status || '').toLowerCase() === 'absent').length;

            let attendancePercent = 0;
            if (marked) {
                const totalMarked = presentCount + absentCount;
                attendancePercent = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;
            }

            return {
                batchId: batch._id,
                batchName: batch.name,
                timing: batch.timing,
                totalStudents,
                presentCount,
                absentCount,
                attendancePercent,
                marked
            };
        }));

        res.json(summaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get list of absent students for a specific batch and date
// @route   GET /api/admin/attendance/batch/:batchId/absentees?date=
// @access  Private (Admin)
const getBatchAbsentees = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const endOfTargetDate = new Date(targetDate);
        endOfTargetDate.setHours(23, 59, 59, 999);

        const absenteesRecords = await Attendance.find({
            batch: batchId,
            date: { $gte: targetDate, $lte: endOfTargetDate },
            isDeleted: { $ne: true }
        }).populate('student', 'name email parentEmail');

        const absentees = absenteesRecords
            .filter(r => r.student && (r.status || '').toLowerCase() === 'absent')
            .map(r => ({
                _id: r.student._id,
                studentId: r.student._id,
                name: r.student.name,
                email: r.student.email,
                parentEmail: r.student.parentEmail || r.student.email
            }));

        res.json(absentees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get list of chronic absentees
// @route   GET /api/admin/attendance/chronic-absentees
// @access  Private (Admin)
const getChronicAbsentees = async (req, res) => {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 30); // Look at last 30 days for pattern
        threeDaysAgo.setHours(0, 0, 0, 0);

        const recentRecords = await Attendance.find({
            date: { $gte: threeDaysAgo },
            isDeleted: { $ne: true }
        }).populate('student', 'name email parentEmail').populate('batch', 'name').sort({ student: 1, date: 1 });

        const studentRecordMap = {};
        for (const rec of recentRecords) {
            if (!rec.student) continue;
            const sid = rec.student._id.toString();
            if (!studentRecordMap[sid]) {
                studentRecordMap[sid] = {
                    student: rec.student,
                    batch: rec.batch,
                    records: []
                };
            }
            studentRecordMap[sid].records.push(rec);
        }

        const chronicAbsentees = [];
        for (const sid of Object.keys(studentRecordMap)) {
            const entry = studentRecordMap[sid];
            if (entry.records.length >= 3) {
                const lastThree = entry.records.slice(-3);
                const allAbsent = lastThree.every(r => (r.status || '').toLowerCase() === 'absent');
                if (allAbsent) {
                    chronicAbsentees.push({
                        _id: entry.student._id,
                        studentId: entry.student._id,
                        name: entry.student.name,
                        email: entry.student.email,
                        parentEmail: entry.student.parentEmail || entry.student.email,
                        batchName: entry.batch ? entry.batch.name : 'Unassigned',
                        consecutiveDays: lastThree.length,
                        consecutiveAbsences: lastThree.length,
                        absences: lastThree.length
                    });
                }
            }
        }

        res.json(chronicAbsentees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    markAttendance,
    getAttendance,
    bulkAttendance,
    getBatchAttendanceSummary,
    getBatchAbsentees,
    getChronicAbsentees
};

