require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const authMiddleware    = require('./middleware/authMiddleware');
const getUserWithRole   = require('./middleware/getUserWithRole');

const profileRouter = require('./routes/profile');
const routesRouter  = require('./routes/routesRoutes');
const teamRouter    = require('./routes/teamRoutes');
const truckRouter   = require('./routes/truckRoutes');
const userRouter    = require('./routes/userRoutes');

const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4';

const app = express();
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Auth + user-loading
app.use('/api', authMiddleware, getUserWithRole);

// optional: keep “who am I” here
app.get('/api/users/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

// mount all resource routers
app.use('/api/profile', profileRouter);
app.use('/api/routes',   routesRouter);
app.use('/api/teams',    teamRouter);
app.use('/api/trucks',   truckRouter);
app.use('/api/users',    userRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend on http://localhost:${PORT}`));
