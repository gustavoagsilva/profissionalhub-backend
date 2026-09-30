const { celebrate, Joi, Segments } = require('celebrate');
const { isCalendarDate, TIME_PATTERN } = require('../utils/sessionTime');

const fields = {
  studentId: Joi.string().hex().length(24),
  date: Joi.string().custom((value, helpers) => (
    isCalendarDate(value) ? value : helpers.error('any.invalid')
  )),
  time: Joi.string().pattern(TIME_PATTERN),
  end: Joi.string().pattern(TIME_PATTERN),
  location: Joi.string().trim().min(1).max(500),
  locationId: Joi.string().hex().length(24),
};

module.exports = {
  validateSessionId: celebrate({
    [Segments.PARAMS]: Joi.object({ sessionId: Joi.string().hex().length(24).required() }),
  }),
  validateSessionCreation: celebrate({
    [Segments.BODY]: Joi.object({
      ...fields,
      studentId: fields.studentId.required(),
      date: fields.date.required(),
      time: fields.time.required(),
      end: fields.end.required(),
    }).xor('location', 'locationId').required(),
  }),
  validateSessionUpdate: celebrate({
    [Segments.BODY]: Joi.object(fields).oxor('location', 'locationId').min(1).required(),
  }),
  validateSessionStatus: celebrate({
    [Segments.BODY]: Joi.object({
      status: Joi.string().valid('completed', 'missed', 'cancelled').required(),
      cancelledBy: Joi.when('status', {
        is: 'cancelled',
        then: Joi.string().valid('professional', 'student').required(),
        otherwise: Joi.forbidden(),
      }),
    }).required(),
  }),
};
