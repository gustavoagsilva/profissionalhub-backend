const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true, maxlength: 200,
  },
  address: {
    type: String, required: true, trim: true, maxlength: 500,
  },
  category: {
    type: String, required: true, trim: true, maxlength: 100,
  },
  placeId: { type: String, trim: true, maxlength: 1000 },
  coordinates: {
    type: [Number],
    default: undefined,
    validate: (coordinates) => coordinates === undefined || (coordinates.length === 2
      && Number.isFinite(coordinates[0]) && Math.abs(coordinates[0]) <= 180
      && Number.isFinite(coordinates[1]) && Math.abs(coordinates[1]) <= 90),
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, select: false,
  },
}, { versionKey: false, timestamps: true });

locationSchema.index({ owner: 1, placeId: 1 }, {
  unique: true,
  partialFilterExpression: { placeId: { $type: 'string' } },
});

module.exports = mongoose.model('Location', locationSchema);
