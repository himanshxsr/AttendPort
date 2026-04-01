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

// Virtual to link all related work sessions
attendanceSchema.virtual('workSessions', {
  ref: 'WorkSession',
  localField: '_id',
  foreignField: 'attendanceId'
});

// Ensure virtuals are included in the results
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
