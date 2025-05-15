// backend/routes/profileRoutes.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
require('dotenv').config();

// initialize a supabase client with your service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    const token = authHeader.split(' ')[1];

    // 1) Verify & decode via Supabase
    const { data: { user }, error: getUserError } =
      await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return res.status(401).json({ message: 'Invalid Supabase token' });
    }

    // 2) Lookup your own users table by supabase_auth_id
    //    (You should have stored the Supabase user.id in your `users.auth_id` column)
    const User = require('../models/User');
    const appUser = await User.findOne({ auth_id: user.id }).select('-password');
    if (!appUser) return res.status(404).json({ message: 'User not found' });

    res.json(appUser);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
