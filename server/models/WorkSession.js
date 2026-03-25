const mongoose = require('mongoose');

const workSessionSchema = new mongoose.Schema({
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  taskDescription: {
    type: String,
  },
});

module.exports = mongoose.model('WorkSession', workSessionSchema);
