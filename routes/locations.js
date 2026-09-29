const router = require('express').Router();
const { getLocations, createLocation, deleteLocation } = require('../controllers/locations');
const { validateLocation, validateLocationId } = require('../middlewares/validation');

router.get('/', getLocations);
router.post('/', validateLocation, createLocation);
router.delete('/:locationId', validateLocationId, deleteLocation);

module.exports = router;
