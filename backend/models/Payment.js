const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['Pending', 'Paid', 'COMPLETED', 'completed', 'PAID', 'paid', 'PENDING', 'pending', 'SUCCESS', 'success', 'FAILED', 'failed'],
            default: 'Paid',
        },
        paymentMethod: {
            type: String,
            enum: ['CASH', 'ONLINE', 'CHEQUE', 'CARD', 'UPI', 'BANK_TRANSFER', 'cash', 'online', 'cheque', 'card', 'upi', 'bank_transfer'],
            default: 'cash',
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

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
