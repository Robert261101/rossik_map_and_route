// backend/config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();  // încarcă MONGO_URI din backend/.env

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('✖ MONGO_URI nu este definit în .env');
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✔️  MongoDB connected');
  } catch (err) {
    console.error('✖ MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
