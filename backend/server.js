require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// — LOGIN —
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ message: error.message });
  // you could also sign your own JWT here if you like; for now we just return Supa’s:
  res.json({ token: data.session.access_token, user: data.user });
});

// — PROTECTED EXAMPLE —
const protect = (req, res, next) => {
  const hdr = req.headers.authorization?.split(' ')[1];
  if (!hdr) return res.status(401).end();
  try {
    req.user = jwt.verify(hdr, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).end();
  }
};
app.get('/api/users/me', protect, async (req, res) => {
  // You can fetch your app-specific row from your “users” table here
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.sub)
    .single();
  if (error) return res.status(404).json({ message: error.message });
  res.json(data);
});

// mount any other routers here…

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend on http://localhost:${PORT}`));
