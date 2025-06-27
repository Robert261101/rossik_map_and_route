// backend/createUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const hash = await bcrypt.hash('Secret123!', 10);
  const user = await User.create({ username: 'admin1', password: hash, role: 'admin' });
  process.exit();
}
run().catch(err => { console.error(err); process.exit(1); });
