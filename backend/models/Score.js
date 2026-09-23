const mongoose = require('mongoose');

const scoreSchema = mongoose.Schema(
    {
        assessment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assessment',
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
            required: true,
        },
        marksObtained: {
            type: Number,
        },
        maxMarks: {
            type: Number,
        },
        percentage: {
            type: Number,
        },
        grade: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['PASS', 'FAIL'],
            default: 'PASS',
        },
        date: {
            type: Date,
            default: Date.now,
        },
        remark: {
            type: String,
            default: '',
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

scoreSchema.index({ assessment: 1, student: 1 });
scoreSchema.index({ student: 1, isDeleted: 1 });
scoreSchema.index({ batch: 1, isDeleted: 1 });

const Score = mongoose.model('Score', scoreSchema);

module.exports = Score;
