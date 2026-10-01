const mongoose = require('mongoose');
const { Joi } = require('celebrate');

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true, minlength: 2, maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: (email) => !Joi.string().email({ tlds: { allow: false } }).validate(email).error,
  },
  password: { type: String, required: true, select: false },
}, { versionKey: false });

module.exports = mongoose.model('User', userSchema);
