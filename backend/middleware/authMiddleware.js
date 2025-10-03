// middleware/authMiddleware.js
const { supabaseAnon } = require('../lib/supabase');

module.exports = async function (req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).end();

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return res.status(401).end();

  req.authUser = user; // { id, email, ... }
  next();
};
