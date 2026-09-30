const router = require('express').Router();
const {
  createSession, getSessions, getSession, updateSession, updateSessionStatus,
} = require('../controllers/sessions');
const {
  validateSessionId, validateSessionCreation, validateSessionUpdate, validateSessionStatus,
} = require('../middlewares/sessionValidation');
const scheduleQueue = require('../middlewares/scheduleQueue');

router.get('/', getSessions);
router.get('/:sessionId', validateSessionId, getSession);
router.post('/', validateSessionCreation, scheduleQueue(createSession));
router.patch('/:sessionId', validateSessionId, validateSessionUpdate, scheduleQueue(updateSession));
router.patch(
  '/:sessionId/status',
  validateSessionId,
  validateSessionStatus,
  scheduleQueue(updateSessionStatus),
);

module.exports = router;
