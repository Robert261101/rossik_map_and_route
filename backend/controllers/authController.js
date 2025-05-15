// backend/controllers/authController.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// instanţa de admin Supabase
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.register = async (req, res) => {
  try {
    const { username, password, role, teamId } = req.body;
    // hash parola
    const hash = await bcrypt.hash(password, 10);

    // inserare în tabela users din Supabase
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{ username, password: hash, role, team_id: teamId }]);

    if (error) throw error;

    res.status(201).json({ username: data[0].username, role: data[0].role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    // găsește user-ul după username
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    console.log('login(): supabase:', { users, error });


    if (error || !users) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // compară parola
    const valid = await bcrypt.compare(password, users.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // creează JWT
    const token = jwt.sign(
      { id: users.id, username: users.username, role: users.role, teamId: users.team_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { username: users.username, role: users.role, teamId: users.team_id } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
