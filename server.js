const mongoose = require('mongoose');
const app = require('./app');
const { port, databaseUrl } = require('./config');
const User = require('./models/user');
const Location = require('./models/location');
const Student = require('./models/student');
const Session = require('./models/session');
const startupError = require('./utils/startupError');

async function start() {
  await mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 30000 });
  await Promise.all([User.init(), Location.init(), Student.init(), Session.init()]);
  await new Promise((resolve, reject) => {
    const server = app.listen(port, resolve);
    server.on('error', reject);
  });
  process.stdout.write(`ProfissionalHub API disponível na porta ${port}.\n`);
}

start().catch(async (error) => {
  process.stderr.write(`Não foi possível iniciar a API. ${startupError(error)}\n`);
  await mongoose.disconnect();
  process.exitCode = 1;
});
