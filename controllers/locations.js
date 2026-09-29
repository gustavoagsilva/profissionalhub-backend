const Location = require('../models/location');
const ApiError = require('../errors/ApiError');
const { NOT_FOUND, FORBIDDEN } = require('../utils/messages');

const getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.send(locations);
  } catch (error) {
    next(error);
  }
};

const createLocation = async (req, res, next) => {
  try {
    const {
      name, address, category, coordinates, placeId,
    } = req.body;
    const location = await Location.create({
      name, address, category, coordinates, placeId, owner: req.user._id,
    });
    // select:false vale nas consultas, não no documento devolvido por create().
    const savedLocation = await Location.findById(location._id);
    res.status(201).send(savedLocation);
  } catch (error) {
    next(error);
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.locationId).select('+owner');
    if (!location) throw new ApiError(404, NOT_FOUND);
    if (!location.owner.equals(req.user._id)) throw new ApiError(403, FORBIDDEN);
    await Location.deleteOne({ _id: location._id, owner: req.user._id });
    res.send({ message: 'Local removido.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLocations, createLocation, deleteLocation };
