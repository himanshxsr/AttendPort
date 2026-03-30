const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: {
    type: String, // "January", "February", etc.
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  earnings: [{
    label: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  deductions: [{
    label: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  totalEarnings: {
    type: Number,
    required: true,
  },
  totalDeductions: {
    type: Number,
    required: true,
  },
  netPay: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Paid', 'Generated'],
    default: 'Generated',
  },
  attendanceInfo: {
    presentDays: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure uniqueness per user/month/year
payslipSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
