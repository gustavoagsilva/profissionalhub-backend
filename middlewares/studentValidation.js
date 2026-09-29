const { celebrate, Joi, Segments } = require('celebrate');
const { normalizeStudentPhone, isStudentPhone } = require('../utils/studentPhone');

const phone = Joi.string().max(30).custom((value, helpers) => {
  const normalized = normalizeStudentPhone(value);
  return isStudentPhone(normalized) ? normalized : helpers.error('any.invalid');
});
const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } })
  .allow('');
const goal = Joi.string().trim().max(120).allow('');

module.exports = {
  validateStudentCreation: celebrate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().trim().min(2).max(60)
        .required(),
      phone: phone.required(),
      email,
      goal,
    }).required(),
  }),
  validateStudentUpdate: celebrate({
    // name e owner não fazem parte dos campos permitidos na edição.
    [Segments.BODY]: Joi.object({
      phone, email, goal, active: Joi.boolean().strict(),
    })
      .min(1).required(),
  }),
  validateStudentId: celebrate({
    [Segments.PARAMS]: Joi.object({ studentId: Joi.string().hex().length(24).required() }),
  }),
};
