const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';

const app = require('../app');
const User = require('../models/user');
const Location = require('../models/location');
const Student = require('../models/student');
const { jwtSecret } = require('../config');
const { requestLogger, errorLogger } = require('../middlewares/logger');

// Banco exclusivo desta execução; nunca usa o banco definido no .env.
const databaseName = `profissionalhub_test_${process.pid}_${Date.now()}`;
const account = { name: 'Ana Silva', email: 'ana@example.com', password: 'test-password-123' };
const place = {
  name: 'Parque',
  address: 'Rua do Parque, 10',
  category: 'leisure.park',
  placeId: 'test-park',
  coordinates: [-46.63, -23.55],
};

before(async () => {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`, {
    serverSelectionTimeoutMS: 5000,
  });
  await Promise.all([User.init(), Location.init(), Student.init()]);
});

after(async () => {
  if (mongoose.connection.name === databaseName) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  requestLogger.close();
  errorLogger.close();
});

test('alunos: validação, edição, exclusividade e acesso por profissional', async () => {
  const first = await User.create({ ...account, email: 'students-first@example.com' });
  const second = await User.create({ ...account, email: 'students-second@example.com' });
  const token = `Bearer ${jwt.sign({ _id: first._id.toString() }, jwtSecret)}`;
  const otherToken = `Bearer ${jwt.sign({ _id: second._id.toString() }, jwtSecret)}`;
  const data = { name: 'Maria Silva', phone: '+55 (11) 99999-9999' };
  const create = (body, auth = token) => request(app).post('/students')
    .set('Authorization', auth).send(body);

  await request(app).get('/students').expect(401);
  await request(app).post('/students').send(data).expect(401);
  await create({ name: data.name }).expect(400);
  await create({ phone: data.phone }).expect(400);
  await create({ ...data, phone: '1199999999' }).expect(400);
  await create({ ...data, phone: '+1 202 555 0100' }).expect(400);
  await create({ ...data, phone: '+55 (20) 99999-9999' }).expect(400);
  await create({ ...data, phone: 'abc11999999999' }).expect(400);
  await create({ ...data, phone: 11999999999 }).expect(400);
  await create({ ...data, owner: second._id }).expect(400);
  await create({ ...data, active: false }).expect(400);
  await create({ ...data, email: 'invalid' }).expect(400);

  const created = await create(data).expect(201);
  const studentId = created.body._id;
  const edit = (body, auth = token) => request(app).patch(`/students/${studentId}`)
    .set('Authorization', auth).send(body);
  assert.equal(created.body.phone, '+5511999999999');
  assert.equal(created.body.active, true);
  assert.equal(created.body.email, '');
  assert.equal(created.body.goal, '');
  assert.equal(created.body.owner, undefined);
  assert.ok(await Student.findById(studentId));
  const duplicate = await create({ ...data, phone: '11999999999' }).expect(409);
  assert.equal(duplicate.body.message, 'Já existe um aluno cadastrado com este telefone');
  await create(data, otherToken).expect(201);
  await request(app).get(`/students/${studentId}`).set('Authorization', token).expect(200);
  await request(app).get(`/students/${studentId}`).set('Authorization', otherToken).expect(404);
  await edit({ goal: 'Alteração indevida' }, otherToken).expect(404);
  const ownList = await request(app).get('/students').set('Authorization', token).expect(200);
  assert.deepEqual(ownList.body.map((student) => student._id), [studentId]);
  assert.equal(ownList.body[0].owner, undefined);
  const otherList = await request(app).get('/students').set('Authorization', otherToken).expect(200);
  assert.equal(otherList.body.length, 1);
  assert.notEqual(otherList.body[0]._id, studentId);

  await edit({ name: 'Outro nome' }).expect(400);
  await edit({ owner: second._id }).expect(400);
  await edit({}).expect(400);
  await edit({ active: 'false' }).expect(400);
  await edit({ phone: '' }).expect(400);
  const changed = await edit({
    phone: '11 99999-9999', email: 'MARIA@example.com', goal: 'Condicionamento',
  }).expect(200);
  assert.equal(changed.body.name, data.name);
  assert.equal(changed.body.email, 'maria@example.com');
  assert.equal(changed.body.goal, 'Condicionamento');
  const cleared = await edit({ email: '', goal: '', active: false }).expect(200);
  assert.equal(cleared.body.active, false);
  assert.equal(cleared.body.email, '');
  assert.equal(cleared.body.goal, '');
  await create(data).expect(409);
  await edit({ active: true }).expect(200);

  await create({ ...data, name: 'Outra aluna', phone: '21988888888' }).expect(201);
  await edit({ phone: '+55 (21) 98888-8888', goal: 'Não deve ser salvo' }).expect(409);
  const unchanged = await Student.findById(studentId);
  assert.equal(unchanged.phone, '+5511999999999');
  assert.equal(unchanged.goal, '');
  await edit({ phone: '31977777777' }).expect(200);
  await create(data).expect(201);
  await request(app).get('/students/invalid').set('Authorization', token).expect(400);
  await request(app).get('/students/000000000000000000000000').set('Authorization', token).expect(404);
  await request(app).patch('/students/000000000000000000000000')
    .set('Authorization', token).send({ active: false })
    .expect(404);

  // O índice do banco também protege contra duas requisições simultâneas.
  const concurrent = await Promise.all([
    create({ ...data, phone: '41966666666' }),
    create({ ...data, phone: '+55 (41) 96666-6666' }),
  ]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [201, 409]);
});

test('cadastro, autenticação, persistência e isolamento entre duas contas', async () => {
  await request(app).get('/users/me').expect(401);
  await request(app).post('/signup').send({ ...account, email: 'invalido' }).expect(400);
  await request(app).post('/signup').send({ ...account, password: 'curta' }).expect(400);
  const signup = await request(app).post('/signup').send(account).expect(201);
  assert.equal(signup.body.name, account.name);
  assert.equal(signup.body.password, undefined);
  const stored = await User.findById(signup.body._id).select('+password');
  assert.notEqual(stored.password, account.password);
  assert.match(stored.password, /^\$2[aby]\$/);
  await request(app).post('/signup').send({ ...account, email: 'ANA@example.com' }).expect(409);
  await request(app).post('/signin').send({ ...account, name: undefined, password: 'wrong-password' }).expect(401);
  const login = await request(app).post('/signin').send({
    email: account.email, password: account.password,
  }).expect(200);
  const authorization = `Bearer ${login.body.token}`;
  const profile = await request(app).get('/users/me').set('Authorization', authorization).expect(200);
  assert.equal(profile.body.email, account.email);
  assert.equal(profile.body.password, undefined);
  await request(app).get('/users/me').set('Authorization', 'Bearer invalid').expect(401);
  const expired = jwt.sign({ _id: signup.body._id }, jwtSecret, { expiresIn: -1 });
  await request(app).get('/users/me').set('Authorization', `Bearer ${expired}`).expect(401);

  await request(app).post('/locations').set('Authorization', authorization)
    .send({ ...place, coordinates: [200, 100] })
    .expect(400);
  await request(app).post('/locations').set('Authorization', authorization)
    .send({ ...place, owner: signup.body._id })
    .expect(400);
  const saved = await request(app).post('/locations').set('Authorization', authorization)
    .send(place)
    .expect(201);
  assert.equal(saved.body.owner, undefined);
  assert.deepEqual(saved.body.coordinates, place.coordinates);
  assert.ok(await Location.findById(saved.body._id));
  await request(app).post('/locations').set('Authorization', authorization)
    .send(place)
    .expect(409);
  const list = await request(app).get('/locations').set('Authorization', authorization).expect(200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].owner, undefined);

  await request(app).post('/signup').send({ ...account, email: 'bruno@example.com' }).expect(201);
  const secondLogin = await request(app).post('/signin').send({
    email: 'bruno@example.com', password: account.password,
  }).expect(200);
  const secondAuthorization = `Bearer ${secondLogin.body.token}`;
  const empty = await request(app).get('/locations').set('Authorization', secondAuthorization).expect(200);
  assert.deepEqual(empty.body, []);
  await request(app).delete(`/locations/${saved.body._id}`)
    .set('Authorization', secondAuthorization).expect(403);
  await request(app).post('/locations').set('Authorization', secondAuthorization)
    .send(place)
    .expect(201);
  await request(app).delete('/locations/invalid').set('Authorization', authorization).expect(400);
  await request(app).delete(`/locations/${saved.body._id}`).set('Authorization', authorization).expect(200);
  await request(app).delete(`/locations/${saved.body._id}`).set('Authorization', authorization).expect(404);
  await request(app).get('/missing').set('Authorization', authorization).expect(404);
  await request(app).post('/signup').set('Content-Type', 'application/json').send('{')
    .expect(400);

  const originalFind = Location.find;
  try {
    Location.find = () => { throw new Error('sensitive database details'); };
    const failure = await request(app).get('/locations').set('Authorization', authorization).expect(500);
    assert.ok(!JSON.stringify(failure.body).includes('sensitive'));
  } finally {
    Location.find = originalFind;
  }
  await User.deleteOne({ _id: signup.body._id });
  await request(app).get('/users/me').set('Authorization', authorization).expect(401);
});
