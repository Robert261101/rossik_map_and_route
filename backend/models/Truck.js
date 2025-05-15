const mongoose = require('mongoose');
const truckSchema = new mongoose.Schema({
    plate: { type: String, unique: true, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }
  });
  module.exports = mongoose.model('Truck', truckSchema);