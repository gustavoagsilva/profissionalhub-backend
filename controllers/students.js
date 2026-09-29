const Student = require('../models/student');
const ApiError = require('../errors/ApiError');
const { NOT_FOUND } = require('../utils/messages');

function handleStudentError(error, next) {
  if (error.code === 11000) {
    next(new ApiError(409, 'Já existe um aluno cadastrado com este telefone'));
    return;
  }
  next(error);
}

const createStudent = async (req, res, next) => {
  try {
    const {
      name, phone, email, goal,
    } = req.body;
    const student = await Student.create({
      name, phone, email, goal, owner: req.user._id,
    });
    const savedStudent = await Student.findById(student._id);
    res.status(201).send(savedStudent);
  } catch (error) {
    handleStudentError(error, next);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.send(students);
  } catch (error) {
    next(error);
  }
};

const getStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.studentId, owner: req.user._id });
    if (!student) throw new ApiError(404, NOT_FOUND);
    res.send(student);
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const updates = {};
    ['phone', 'email', 'goal', 'active'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const student = await Student.findOneAndUpdate(
      { _id: req.params.studentId, owner: req.user._id },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!student) throw new ApiError(404, NOT_FOUND);
    res.send(student);
  } catch (error) {
    handleStudentError(error, next);
  }
};

module.exports = {
  createStudent, getStudents, getStudent, updateStudent,
};
