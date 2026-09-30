const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/user');
const Student = require('../models/student');
const Location = require('../models/location');
const Session = require('../models/session');
const { jwtSecret } = require('../config');
const { sessionInstant } = require('../utils/sessionTime');

module.exports = async () => {
  const owner = await User.create({ name: 'Agenda', email: 'agenda@example.com', password: 'fixture' });
  const other = await User.create({ name: 'Outra', email: 'agenda-other@example.com', password: 'fixture' });
  const token = `Bearer ${jwt.sign({ _id: owner._id.toString() }, jwtSecret)}`;
  const otherToken = `Bearer ${jwt.sign({ _id: other._id.toString() }, jwtSecret)}`;
  const student = await Student.create({ name: 'Aluno', phone: '11999999999', owner: owner._id });
  const otherStudent = await Student.create({ name: 'Outro', phone: '11999999999', owner: other._id });
  const saved = await Location.create({
    name: 'Parque', address: 'Rua A', category: 'park', owner: owner._id,
  });
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const nextDate = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
  const data = {
    studentId: student._id.toString(), date, time: '09:00', end: '10:00', location: 'Online',
  };
  const create = (body, auth = token) => request(app).post('/sessions').set('Authorization', auth).send(body);
  const edit = (id, body, auth = token) => request(app).patch(`/sessions/${id}`).set('Authorization', auth).send(body);
  const status = (id, body, auth = token) => request(app).patch(`/sessions/${id}/status`).set('Authorization', auth).send(body);
  const inactivate = () => request(app).patch(`/students/${student._id}`).set('Authorization', token).send({ active: false });

  await request(app).get('/sessions').expect(401);
  await request(app).post('/sessions').send(data).expect(401);
  await create({ ...data, date: '2030-02-30' }).expect(400);
  await create({ ...data, date: '2020-01-01' }).expect(400);
  await create({ ...data, time: '24:00' }).expect(400);
  await create({ ...data, time: '23:00', end: '01:00' }).expect(400);
  await create({ ...data, end: '09:00' }).expect(400);
  await create({ ...data, owner: other._id }).expect(400);
  await create({ ...data, status: 'completed' }).expect(400);
  await create({ ...data, studentId: otherStudent._id.toString() }).expect(404);
  await create({ ...data, location: undefined }).expect(400);
  await create({ ...data, locationId: saved._id.toString() }).expect(400);

  const first = await create({
    ...data, location: undefined, locationId: saved._id.toString(),
  }).expect(201);
  assert.equal(first.body.location, 'Parque — Rua A');
  assert.equal(first.body.owner, undefined);
  assert.equal(first.body.status, 'scheduled');
  assert.equal(first.body.startsAt, `${date}T12:00:00.000Z`);
  await create(data).expect(409);
  await create({ ...data, time: '10:44', end: '11:44' }).expect(409);
  const second = await create({ ...data, time: '10:45', end: '11:45' }).expect(201);
  await create({ ...data, time: '08:00', end: '08:16' }).expect(409);
  const earlier = await create({ ...data, time: '08:00', end: '08:15' }).expect(201);
  await edit(first.body._id, { location: 'Casa do aluno' }).expect(200);
  assert.equal((await Session.findById(first.body._id)).locationId, undefined);
  await edit(first.body._id, { time: '10:00', end: '11:00' }).expect(409);
  await edit(first.body._id, { studentId: otherStudent._id.toString() }).expect(404);
  await status(first.body._id, { status: 'completed' }).expect(409);
  await status(first.body._id, { status: 'missed' }).expect(409);
  await status(first.body._id, { status: 'cancelled' }).expect(400);
  await status(first.body._id, { status: 'completed', cancelledBy: 'student' }).expect(400);
  await status(first.body._id, { status: 'cancelled', cancelledBy: 'student' }, otherToken).expect(404);
  await edit(first.body._id, { location: 'Outro' }, otherToken).expect(404);
  await request(app).get(`/sessions/${first.body._id}`).set('Authorization', otherToken).expect(404);
  const empty = await request(app).get('/sessions').set('Authorization', otherToken).expect(200);
  assert.deepEqual(empty.body, []);
  await create({ ...data, studentId: otherStudent._id.toString() }, otherToken).expect(201);
  await create({
    ...data, studentId: otherStudent._id.toString(), location: undefined, locationId: saved._id.toString(), time: '14:00', end: '15:00',
  }, otherToken).expect(404);

  await inactivate().expect(409);
  assert.equal((await Student.findById(student._id)).active, true);
  await status(first.body._id, { status: 'cancelled', cancelledBy: 'student' }).expect(200);
  await status(first.body._id, { status: 'completed' }).expect(409);
  await status(first.body._id, { status: 'scheduled' }).expect(400);
  await edit(first.body._id, { location: 'Novo local' }).expect(409);
  await request(app).delete(`/sessions/${first.body._id}`).set('Authorization', token).expect(404);
  const replacement = await create(data).expect(201);
  await status(replacement.body._id, { status: 'cancelled', cancelledBy: 'professional' }).expect(200);
  await status(second.body._id, { status: 'cancelled', cancelledBy: 'professional' }).expect(200);
  await status(earlier.body._id, { status: 'cancelled', cancelledBy: 'professional' }).expect(200);
  await inactivate().expect(200);
  await create(data).expect(409);
  await request(app).patch(`/students/${student._id}`).set('Authorization', token).send({ active: true })
    .expect(200);

  const concurrent = await Promise.all([create(data), create(data)]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [201, 409]);
  await create({ ...data, time: '23:00', end: '23:45' }).expect(201);
  await create({
    ...data, date: nextDate, time: '00:29', end: '01:00',
  }).expect(409);
  await create({
    ...data, date: nextDate, time: '00:30', end: '01:00',
  }).expect(201);

  // Fixture histórica simula a passagem do tempo sem cadastro retroativo pela API.
  const historyDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const history = await Session.create({
    ...data,
    owner: owner._id,
    date: historyDate,
    startsAt: sessionInstant(historyDate, data.time),
    endsAt: sessionInstant(historyDate, data.end),
  });
  await status(history._id, { status: 'missed' }).expect(200);
  await status(history._id, { status: 'completed' }).expect(200);
  await status(history._id, { status: 'missed' }).expect(200);
  await status(history._id, { status: 'cancelled', cancelledBy: 'professional' }).expect(409);
  await edit(history._id, { location: 'Outro' }).expect(409);
  await request(app).get('/sessions/invalid').set('Authorization', token).expect(400);
  await request(app).get('/sessions/000000000000000000000000').set('Authorization', token).expect(404);
};
