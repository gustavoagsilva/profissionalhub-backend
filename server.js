const mongoose = require('mongoose');
const app = require('./app');
const { port, databaseUrl } = require('./config');
const User = require('./models/user');
const Location = require('./models/location');
const Student = require('./models/student');

async function start() {
  await mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Location.init(), Student.init()]);
  await new Promise((resolve, reject) => {
    const server = app.listen(port, resolve);
    server.on('error', reject);
  });
  process.stdout.write(`ProfissionalHub API disponível na porta ${port}.\n`);
}

start().catch(async () => {
  process.stderr.write('Não foi possível iniciar a API. Confira o MongoDB e se a porta está livre.\n');
  await mongoose.disconnect();
  process.exitCode = 1;
});
