require('dotenv').config({ quiet: true });

const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.MONGODB_URI || !process.env.JWT_SECRET
  || process.env.JWT_SECRET.length < 32 || !process.env.ALLOWED_ORIGINS)) {
  throw new Error('Configure MONGODB_URI, JWT_SECRET (mínimo 32 caracteres) e ALLOWED_ORIGINS.');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/profissionalhub',
  jwtSecret: process.env.JWT_SECRET || 'profissionalhub-development-only-secret',
  allowedOrigins: (process.env.ALLOWED_ORIGINS
    || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()),
};
