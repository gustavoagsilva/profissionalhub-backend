const router = require('express').Router();
const { signup, signin } = require('../controllers/users');
const { validateSignup, validateSignin } = require('../middlewares/validation');
const auth = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const userRoutes = require('./users');
const locationRoutes = require('./locations');
const studentRoutes = require('./students');
const ApiError = require('../errors/ApiError');
const { NOT_FOUND } = require('../utils/messages');

router.post('/signup', rateLimiter, validateSignup, signup);
router.post('/signin', rateLimiter, validateSignin, signin);
router.use(auth);
router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/students', studentRoutes);
router.use((req, res, next) => next(new ApiError(404, NOT_FOUND)));

module.exports = router;
