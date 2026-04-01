const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: ['Admin', 'Employee'],
    default: 'Employee',
  },
  // Profile fields for automated payslips
  employeeCode: { type: String, unique: true, sparse: true },
  designation: { type: String },
  location: { type: String },
  pan: { type: String },
  sex: { type: String },
  accountNumber: { type: String },
  bankName: { type: String },
  pfAccountNumber: { type: String },
  pfUAN: { type: String },
  esiNumber: { type: String },
  joiningDate: { type: String },
  leavingDate: { type: String },
  taxRegime: { type: String },
  // Leave Balances
  casualLeaveBalance: {
    type: Number,
    default: 2, // New users start with 2
  },
  sickLeaveBalance: {
    type: Number,
    default: 2, // New users start with 2
  },
  lastLeaveAccrualDate: {
    type: String,
    default: '2026-04', // Set to current month for initialization
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deletedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
