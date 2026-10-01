const mongoose = require('mongoose');
const { isCalendarDate, TIME_PATTERN } = require('../utils/sessionTime');

const sessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: String, required: true, validate: isCalendarDate },
  time: { type: String, required: true, match: TIME_PATTERN },
  end: { type: String, required: true, match: TIME_PATTERN },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  location: {
    type: String, required: true, trim: true, maxlength: 500,
  },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  status: {
    type: String, enum: ['scheduled', 'completed', 'missed', 'cancelled'], default: 'scheduled',
  },
  cancelledBy: { type: String, enum: ['professional', 'student'] },
  owner: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, select: false,
  },
}, { versionKey: false, timestamps: true });

sessionSchema.index({ owner: 1, startsAt: 1 });
sessionSchema.index({ owner: 1, studentId: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
