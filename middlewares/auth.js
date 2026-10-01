const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { jwtSecret } = require('../config');
const ApiError = require('../errors/ApiError');
const { UNAUTHORIZED } = require('../utils/messages');

module.exports = async (req, res, next) => {
  const authorization = req.get('authorization');
  if (!authorization || !/^Bearer \S+$/.test(authorization)) {
    next(new ApiError(401, UNAUTHORIZED));
    return;
  }
  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), jwtSecret, { algorithms: ['HS256'] });
    if (!payload || typeof payload !== 'object' || !/^[a-f\d]{24}$/i.test(payload._id)) {
      throw new Error('Invalid token payload');
    }
  } catch (error) {
    next(new ApiError(401, UNAUTHORIZED));
    return;
  }
  try {
    const user = await User.findById(payload._id);
    if (!user) throw new ApiError(401, UNAUTHORIZED);
    req.user = { _id: user._id };
    next();
  } catch (error) {
    next(error);
  }
};
