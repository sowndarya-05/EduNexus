const mongoose = require('mongoose');

const studentSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        parentEmail: {
            type: String,
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
        },
        totalFees: {
            type: Number,
            default: 0,
        },
        fees: {
            totalAmount: { type: Number, default: 0 },
            paidAmount: { type: Number, default: 0 },
            status: { type: String, enum: ['paid', 'pending', 'overdue', 'partially_paid', 'unpaid', 'PAID', 'PENDING', 'OVERDUE', 'PARTIALLY_PAID', 'UNPAID'], default: 'pending' }
        },
        riskScore: {
            type: Number,
            default: 0,
        },
        riskLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'low', 'medium', 'high'],
            default: 'LOW',
        },
        riskReason: [String],
        latestGrade: {
            type: String,
            enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'F', ''],
            default: '',
        },
        attendancePercentage: {
            type: Number,
            default: 0,
        },
        isDeleted: {

            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

studentSchema.virtual('isNew').get(function () {
    if (!this.createdAt) return false;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return new Date(this.createdAt) >= fourteenDaysAgo;
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
