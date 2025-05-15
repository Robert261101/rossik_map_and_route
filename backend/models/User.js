const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'team_lead', 'transport_manager', 'dispecer'],
    required: true
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
});

module.exports = mongoose.model('User', userSchema);
