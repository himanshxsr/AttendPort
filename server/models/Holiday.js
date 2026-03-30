const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: String, // "YYYY-MM-DD"
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Holiday', holidaySchema);
