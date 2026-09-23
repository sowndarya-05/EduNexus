const mongoose = require('mongoose');

const gradingScaleItemSchema = new mongoose.Schema({
    minPercent: { type: Number, required: true },
    maxPercent: { type: Number, required: true },
    grade: { type: String, required: true },
    label: { type: String, default: '' },
}, { _id: false });

const assessmentSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Assessment title is required'],
            trim: true,
        },
        subject: {
            type: String,
            trim: true,
            default: '',
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
            required: [true, 'Batch reference is required'],
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Teacher reference is required'],
        },
        maxMarks: {
            type: Number,
            required: [true, 'Maximum marks is required'],
            min: [1, 'Maximum marks must be greater than 0'],
            default: 100,
        },
        passingMarks: {
            type: Number,
            required: [true, 'Passing marks is required'],
            min: [0, 'Passing marks cannot be negative'],
            default: 40,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        gradingSystem: {
            type: String,
            enum: ['PERCENTAGE_STANDARD', 'PERCENTAGE_10_POINT', 'CUSTOM'],
            default: 'PERCENTAGE_STANDARD',
        },
        gradingScale: [gradingScaleItemSchema],
        status: {
            type: String,
            enum: ['DRAFT', 'PUBLISHED'],
            default: 'DRAFT',
        },
        publishedAt: {
            type: Date,
        },
        publishedMessageCount: {
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
    }
);

assessmentSchema.index({ batch: 1, isDeleted: 1 });
assessmentSchema.index({ teacher: 1, isDeleted: 1 });

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;
