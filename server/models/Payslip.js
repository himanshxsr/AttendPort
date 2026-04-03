const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: {
    type: String, // e.g., "November"
    required: true,
  },
  year: {
    type: Number, // e.g., 2024
    required: true,
  },
  // Employee details snapshot for permanent record
  employeeDetails: {
    pan: String,
    sex: String,
    designation: String,
    accountNumber: String,
    location: String,
    pfAccountNumber: String,
    joiningDate: String,
    pfUan: String,
    leavingDate: String,
    esiNumber: String,
    taxRegime: String,
    salaryCreditedDate: String,
  },
  attendanceSummary: {
    payDays: { type: Number, default: 0 },
    attendanceArrearDays: { type: Number, default: 0 },
    incrementArrearDays: { type: Number, default: 0 },
  },
  earnings: [{
    label: { type: String, required: true },
    rate: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 },
    arrear: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  }],
  deductions: [{
    label: { type: String, required: true },
    total: { type: Number, default: 0 },
  }],
  leaveBalances: [{
    type: { type: String, required: true },
    opening: { type: Number, default: 0 },
    availed: { type: Number, default: 0 },
    closing: { type: Number, default: 0 },
  }],
  totalEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
  netPayInWords: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure only one payslip per user per month/year
payslipSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
