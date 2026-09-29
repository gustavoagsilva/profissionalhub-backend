const path = require('path');
const winston = require('winston');

const requestLogger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: path.join(__dirname, '../logs/request.log') })],
});
const errorLogger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log') })],
});

const logRequest = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // Não registrar corpos, cabeçalhos ou query strings: podem conter credenciais.
    requestLogger.info('request', {
      method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start,
    });
  });
  next();
};

module.exports = { logRequest, requestLogger, errorLogger };
