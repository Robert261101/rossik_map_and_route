// backend/server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// 1) conectează-te la MongoDB
connectDB();

// 2) middleware
app.use(cors());
app.use(express.json());

// 3) sample route
app.get('/', (req, res) => {
  res.send('API is running');
});

// 4) aici vei importa rutele de auth şi user
//    ex: app.use('/api/auth', require('./routes/authRoutes'));
//         app.use('/api/users', require('./routes/userRoutes'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
