const mongoose = require('mongoose');
const { Joi } = require('celebrate');
const { normalizeStudentPhone, isStudentPhone } = require('../utils/studentPhone');

const studentSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true, minlength: 2, maxlength: 60, immutable: true,
  },
  phone: {
    type: String, required: true, set: normalizeStudentPhone, validate: isStudentPhone,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    validate: (value) => value === '' || !Joi.string().email({ tlds: { allow: false } }).validate(value).error,
  },
  goal: {
    type: String, trim: true, maxlength: 120, default: '',
  },
  active: { type: Boolean, default: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, select: false, immutable: true,
  },
}, { versionKey: false, timestamps: true });

// Inclui inativos e garante exclusividade mesmo em cadastros simultâneos.
studentSchema.index({ owner: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
