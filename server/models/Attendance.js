const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // "YYYY-MM-DD"
    required: true,
  },
  checkIn: {
    type: Date,
  },
  checkOut: {
    type: Date,
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave', ''],
    default: '',
  },
});

// Compound index to ensure uniqueness per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
