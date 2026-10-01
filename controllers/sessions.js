const Session = require('../models/session');
const Student = require('../models/student');
const Location = require('../models/location');
const ApiError = require('../errors/ApiError');
const { NOT_FOUND } = require('../utils/messages');
const { sessionInstant, INTERVAL_MS } = require('../utils/sessionTime');

async function findSession(req) {
  const session = await Session.findOne({ _id: req.params.sessionId, owner: req.user._id });
  if (!session) throw new ApiError(404, NOT_FOUND);
  return session;
}

async function prepareSession(data, owner, excludedId) {
  if (data.end <= data.time) throw new ApiError(400, 'O término deve ser depois do início, no mesmo dia.');
  const startsAt = sessionInstant(data.date, data.time);
  const endsAt = sessionInstant(data.date, data.end);
  if (startsAt.getTime() <= Date.now()) throw new ApiError(400, 'Agende uma aula em um horário futuro.');
  const student = await Student.findOne({ _id: data.studentId, owner });
  if (!student) throw new ApiError(404, NOT_FOUND);
  if (!student.active) throw new ApiError(409, 'Não é possível agendar para um aluno inativo.');
  const conflict = await Session.exists({
    owner,
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
    status: { $ne: 'cancelled' },
    startsAt: { $lt: new Date(endsAt.getTime() + INTERVAL_MS) },
    endsAt: { $gt: new Date(startsAt.getTime() - INTERVAL_MS) },
  });
  if (conflict) throw new ApiError(409, 'Mantenha pelo menos 45 minutos entre as aulas.');
  const prepared = { ...data, startsAt, endsAt };
  if (data.locationId) {
    const location = await Location.findOne({ _id: data.locationId, owner });
    if (!location) throw new ApiError(404, NOT_FOUND);
    prepared.location = `${location.name} — ${location.address}`.slice(0, 500);
  }
  return prepared;
}

const createSession = async (req, res, next) => {
  try {
    const data = await prepareSession(req.body, req.user._id);
    const session = await Session.create({ ...data, owner: req.user._id });
    res.status(201).send(await Session.findById(session._id));
  } catch (error) { next(error); }
};

const getSessions = async (req, res, next) => {
  try {
    res.send(await Session.find({ owner: req.user._id }).sort({ startsAt: 1 }));
  } catch (error) { next(error); }
};

const getSession = async (req, res, next) => {
  try { res.send(await findSession(req)); } catch (error) { next(error); }
};

const updateSession = async (req, res, next) => {
  try {
    const session = await findSession(req);
    if (session.status !== 'scheduled') throw new ApiError(409, 'Somente aulas agendadas podem ser editadas.');
    const data = {
      studentId: session.studentId,
      date: session.date,
      time: session.time,
      end: session.end,
      location: session.location,
      ...req.body,
    };
    const prepared = await prepareSession(data, req.user._id, session._id);
    session.set(prepared);
    if (req.body.location !== undefined) session.locationId = undefined;
    await session.save();
    res.send(session);
  } catch (error) { next(error); }
};

const updateSessionStatus = async (req, res, next) => {
  try {
    const session = await findSession(req);
    const { status, cancelledBy } = req.body;
    if (session.status === 'cancelled') throw new ApiError(409, 'Uma aula cancelada não pode ser alterada.');
    if (status === 'cancelled' && session.status !== 'scheduled') {
      throw new ApiError(409, 'Somente aulas agendadas podem ser canceladas.');
    }
    if (status !== 'cancelled' && session.endsAt.getTime() > Date.now()) {
      throw new ApiError(409, 'Registre realizado ou falta somente após o término da aula.');
    }
    session.status = status;
    session.cancelledBy = cancelledBy;
    await session.save();
    res.send(session);
  } catch (error) { next(error); }
};

module.exports = {
  createSession, getSessions, getSession, updateSession, updateSessionStatus,
};
