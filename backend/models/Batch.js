const mongoose = require('mongoose');

const batchSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        timing: {
            type: String,
            required: true,
        },
        fees: {
            type: Number,
        },
        defaultFeeAmount: {
            type: Number,
            required: true,
        },
        numberOfInstallments: {
            type: Number,
            default: 3,
        },
        subject: {
            type: String,
        },
        teacher: {

            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        students: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Student',
            },
        ],
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active',
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

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
