const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { allowedOrigins } = require('./config');
const { logRequest } = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(logRequest);
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));
app.use(routes);
app.use(errorHandler);

module.exports = app;
