const { celebrate, Joi, Segments } = require('celebrate');

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } })
  .required();
// bcrypt utiliza até 72 bytes; limite em bytes também para senhas com acentos.
const password = Joi.string().min(8).custom((value, helpers) => (
  Buffer.byteLength(value, 'utf8') <= 72 ? value : helpers.error('any.invalid')
)).required();

module.exports = {
  validateSignup: celebrate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().trim().min(2).max(30)
        .required(),
      email,
      password,
    }).required(),
  }),
  validateSignin: celebrate({
    [Segments.BODY]: Joi.object({ email, password }).required(),
  }),
  validateLocation: celebrate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().trim().min(1).max(200)
        .required(),
      address: Joi.string().trim().min(1).max(500)
        .required(),
      category: Joi.string().trim().min(1).max(100)
        .required(),
      placeId: Joi.string().trim().min(1).max(1000),
      coordinates: Joi.array().ordered(
        Joi.number().min(-180).max(180).required(),
        Joi.number().min(-90).max(90).required(),
      ).length(2),
    }).required(),
  }),
  validateLocationId: celebrate({
    [Segments.PARAMS]: Joi.object({ locationId: Joi.string().hex().length(24).required() }),
  }),
};
