const mongoose = require('mongoose');

const paymentHistorySchema = mongoose.Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        mode: {
            type: String,
            enum: ['cash', 'upi', 'card', 'online', 'cheque', 'bank_transfer', 'CASH', 'UPI', 'CARD', 'ONLINE', 'CHEQUE', 'BANK_TRANSFER'],
            default: 'cash',
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        note: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

const feeSchema = mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
        },
        installmentNumber: {
            type: Number,
            default: 1,
        },
        amount: {
            type: Number,
            required: true,
        },
        amountPaid: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'partially_paid', 'paid', 'overdue'],
            default: 'pending',
        },
        dueDate: {
            type: Date,
            required: true,
        },
        paidDate: {
            type: Date,
            default: null,
        },
        paymentHistory: [paymentHistorySchema],
        receiptId: {
            type: String,
            default: null,
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

// Helper function to re-calculate status, amountPaid, receiptId, paidDate
feeSchema.methods.recomputeStatus = function () {
    const totalPaid = this.paymentHistory.reduce((sum, item) => sum + (item.amount || 0), 0);
    this.amountPaid = totalPaid;

    if (this.amountPaid >= this.amount) {
        this.status = 'paid';
        if (!this.paidDate) {
            const lastPayment = this.paymentHistory[this.paymentHistory.length - 1];
            this.paidDate = lastPayment ? lastPayment.date : new Date();
        }
        if (!this.receiptId) {
            const year = new Date().getFullYear();
            const randomNum = Math.floor(10000 + Math.random() * 90000);
            this.receiptId = `RCPT-${year}-${randomNum}`;
        }
    } else if (this.amountPaid > 0 && this.amountPaid < this.amount) {
        this.status = 'partially_paid';
        this.paidDate = null;
        this.receiptId = null;
    } else {
        // amountPaid === 0
        const now = new Date();
        const due = new Date(this.dueDate);
        this.status = due < now ? 'overdue' : 'pending';
        this.paidDate = null;
        this.receiptId = null;
    }
};

const Fee = mongoose.model('Fee', feeSchema);

module.exports = Fee;
