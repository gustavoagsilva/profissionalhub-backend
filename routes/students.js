const router = require('express').Router();
const {
  createStudent, getStudents, getStudent, updateStudent,
} = require('../controllers/students');
const {
  validateStudentCreation, validateStudentUpdate, validateStudentId,
} = require('../middlewares/studentValidation');

router.get('/', getStudents);
router.post('/', validateStudentCreation, createStudent);
router.get('/:studentId', validateStudentId, getStudent);
router.patch('/:studentId', validateStudentId, validateStudentUpdate, updateStudent);

module.exports = router;
