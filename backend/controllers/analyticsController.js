const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Score = require('../models/Score');
const Fee = require('../models/Fee');

// @desc    Calculate risk scores for all students
// @route   POST /api/analytics/calculate
// @access  Private (Admin)
const calculateRisk = async (req, res) => {
    try {
        const students = await Student.find({ isDeleted: false });
        const results = [];

        for (const student of students) {
            let score = 0;
            let reasons = [];

            // 1. Attendance Logic (Last 30 days & Overall)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const attendanceRecords = await Attendance.find({
                student: student._id,
                date: { $gte: thirtyDaysAgo },
                isDeleted: false
            }).sort({ date: 1 });

            const totalDays = attendanceRecords.length;
            if (totalDays > 0) {
                const absentCount = attendanceRecords.filter(a => (a.status || '').toLowerCase() === 'absent').length;
                const attendancePercentage = Math.round(((totalDays - absentCount) / totalDays) * 100);

                if (attendancePercentage < 75) {
                    score += 40;
                    reasons.push('Low Attendance (<75%)');
                }

                // Consecutive Absences check (last 3 records)
                if (attendanceRecords.length >= 3) {
                    const lastThree = attendanceRecords.slice(-3);
                    const allAbsent = lastThree.every(a => (a.status || '').toLowerCase() === 'absent');
                    if (allAbsent) {
                        score += 30;
                        reasons.push('Consecutive Absences (3+)');
                    }
                }
            }

            // Sync overall attendance percentage on student
            const allAttendance = await Attendance.find({ student: student._id, isDeleted: false });
            if (allAttendance.length > 0) {
                const totalAll = allAttendance.length;
                const presentAll = allAttendance.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
                student.attendancePercentage = Math.round((presentAll / totalAll) * 100);
            }

            // 2. Fee Logic — Check Fee model and pending balance
            const feeDocs = await Fee.find({ student: student._id, isDeleted: false });
            let totalFeeAmount = 0;
            let totalPaidAmount = 0;
            let hasOverdueFee = false;

            if (feeDocs.length > 0) {
                totalFeeAmount = feeDocs.reduce((sum, f) => sum + (f.amount || 0), 0);
                totalPaidAmount = feeDocs.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
                hasOverdueFee = feeDocs.some(f => f.status === 'overdue' || (f.amountPaid < f.amount && new Date(f.dueDate) < new Date()));
            } else {
                totalFeeAmount = student.fees?.totalAmount || student.totalFees || 0;
                const payments = await Payment.find({ student: student._id, isDeleted: false });
                totalPaidAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0) || (student.fees?.paidAmount || 0);
            }

            const pendingFees = Math.max(0, totalFeeAmount - totalPaidAmount);
            if (pendingFees > 0) {
                if (hasOverdueFee) {
                    score += 30;
                    reasons.push('Overdue Fees');
                } else {
                    score += 15;
                    reasons.push('Pending Fee Balance');
                }
            }

            // Update student fee cache
            if (!student.fees) student.fees = {};
            student.fees.totalAmount = totalFeeAmount;
            student.fees.paidAmount = totalPaidAmount;
            student.fees.status = pendingFees <= 0 && totalFeeAmount > 0 ? 'paid' : (hasOverdueFee ? 'overdue' : (totalPaidAmount > 0 ? 'partially_paid' : 'pending'));

            // 3. Academic Logic (Fresh Grade Check from Score collection)
            const latestScoreRecord = await Score.findOne({ student: student._id, isDeleted: false })
                .sort({ date: -1, createdAt: -1 });
            const latestGrade = (latestScoreRecord ? latestScoreRecord.grade : (student.latestGrade || '')).toUpperCase().trim();
            student.latestGrade = latestGrade;

            if (latestGrade === 'F') {
                score += 40;
                reasons.push('Critical Academic Performance (Grade F)');
            } else if (latestGrade === 'C') {
                score += 25;
                reasons.push('Poor Academic Performance (Grade C)');
            } else if (latestGrade === 'B' || latestGrade === 'B+') {
                score += 10;
                reasons.push('Average Academic Performance (Grade B/B+)');
            }

            // 4. Update Student Risk
            let level = 'LOW';
            if (score >= 60) level = 'HIGH';
            else if (score >= 25) level = 'MEDIUM';

            student.riskScore = Math.min(score, 100); // Cap at 100
            student.riskLevel = level;
            student.riskReason = reasons;
            await student.save();

            results.push({
                name: student.name,
                score: student.riskScore,
                level: student.riskLevel,
                reasons: student.riskReason
            });
        }

        // If triggered manually via API, return results
        if (res) {
            res.json({ message: 'Risk calculation complete', count: results.length, start_sample: results.slice(0, 3) });
        } else {
            return results; // For Cron
        }

    } catch (error) {
        if (res) res.status(500).json({ message: error.message });
        else console.error('Cron Risk Calc Error:', error.message);
    }
};

// @desc    Get students sorted by risk
// @route   GET /api/analytics
// @access  Private (Admin)
const getRiskAnalytics = async (req, res) => {
    try {
        // Automatically perform fresh risk calculation on fetch
        await calculateRisk();

        const students = await Student.find({ isDeleted: false })
            .sort({ riskScore: -1 }) // Highest risk first
            .select('name riskScore riskLevel riskReason email parent batch attendancePercentage latestGrade fees totalFees')
            .populate('parent', 'name email mobile')
            .populate('batch', 'name subject');

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Recalculate attendance and latest score for all students
// @route   POST /api/analytics/recalculate-metrics
// @access  Private (Admin)
const recalculateStudentMetrics = async (req, res) => {
    try {
        const Score = require('../models/Score');
        const Attendance = require('../models/Attendance');
        const students = await Student.find({ isDeleted: false });
        const results = [];

        for (const student of students) {
            // 1. Attendance Summary
            const attendanceRecords = await Attendance.find({ student: student._id, isDeleted: false });
            const total = attendanceRecords.length;
            const present = attendanceRecords.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
            const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;

            // 2. Latest Grade
            const latestScoreRecord = await Score.findOne({ student: student._id, isDeleted: false })
                .sort({ date: -1, createdAt: -1 });
            const latestGrade = latestScoreRecord ? latestScoreRecord.grade : '';

            // 3. Update Student
            student.attendancePercentage = attendancePercentage;
            student.latestGrade = latestGrade;
            await student.save();

            results.push({
                name: student.name,
                attendancePercentage,
                latestGrade
            });
        }

        res.json({ message: 'Metrics recalculated', count: results.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get risk level breakdown aggregation
// @route   GET /api/admin/insights/risk-breakdown
// @access  Private (Admin)
const getRiskBreakdown = async (req, res) => {
    try {
        const aggregated = await Student.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: { $toUpper: '$riskLevel' }, count: { $sum: 1 } } }
        ]);

        const breakdown = { safe: 0, medium: 0, high: 0 };
        aggregated.forEach(item => {
            const lvl = (item._id || '').toUpperCase();
            if (lvl === 'LOW' || !lvl) breakdown.safe += item.count;
            else if (lvl === 'MEDIUM') breakdown.medium += item.count;
            else if (lvl === 'HIGH') breakdown.high += item.count;
        });

        res.json(breakdown);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    calculateRisk,
    getRiskAnalytics,
    recalculateStudentMetrics,
    getRiskBreakdown,
};
