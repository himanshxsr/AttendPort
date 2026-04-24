const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Sick', 'Casual', 'Medical', 'Other', 'Half Day (Casual)'],
    required: true,
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: true,
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: {
    type: Date,
  },
  attendanceBackup: [{
    date: { type: String, required: true },
    existed: { type: Boolean, default: false },
    data: { type: Object, default: null }
  }]
});

module.exports = mongoose.model('Leave', leaveSchema);
