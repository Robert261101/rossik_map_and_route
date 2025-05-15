const mongoose = require('mongoose');
const truckRouteSchema = new mongoose.Schema({
  truck: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  identifier: { type: String, unique: true, required: true },
  addresses: [{ label: String, lat: Number, lng: Number, isVia: Boolean }],
  euroPerKm: Number,
  distanceKm: Number,
  costPerKm: Number,
  tolls: [{ name: String, country: String, cost: Number, currency: String }],
  tollCost: Number,
  totalCost: Number,
  duration: String
});
module.exports = mongoose.model('TruckRoute', truckRouteSchema);