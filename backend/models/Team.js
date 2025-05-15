const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['administrativ', 'transport', 'dispeceri'], required: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // optional pt admin
});

module.exports = mongoose.model('Team', teamSchema);
