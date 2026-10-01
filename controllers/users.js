const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { jwtSecret } = require('../config');
const ApiError = require('../errors/ApiError');
const { INVALID_CREDENTIALS, NOT_FOUND } = require('../utils/messages');

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    res.status(201).send({ _id: user._id, name: user.name, email: user.email });
  } catch (error) {
    next(error);
  }
};

const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, INVALID_CREDENTIALS);
    }
    const token = jwt.sign({ _id: user._id.toString() }, jwtSecret, {
      expiresIn: '7d', algorithm: 'HS256',
    });
    res.send({ token });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, NOT_FOUND);
    res.send(user);
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, signin, getCurrentUser };
