const { isCelebrateError } = require('celebrate');
const { errorLogger } = require('./logger');
const { INVALID_DATA, CONFLICT, INTERNAL_ERROR } = require('../utils/messages');

module.exports = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  let status = error.statusCode || 500;
  let { message } = error;
  if (isCelebrateError(error) || ['ValidationError', 'CastError'].includes(error.name)
    || error.type === 'entity.parse.failed') {
    status = 400;
    message = INVALID_DATA;
  } else if (error.code === 11000) {
    status = 409;
    message = CONFLICT;
  }
  if (status >= 500) message = INTERNAL_ERROR;
  errorLogger.error('request failed', {
    method: req.method, path: req.path, status, message,
  });
  res.status(status).send({ message });
};
