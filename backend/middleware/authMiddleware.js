// middleware/authMiddleware.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function(req, res, next) {
  const authHeader = req.headers.authorization?.split(' ')[1];
  if (!authHeader) return res.status(401).end();
  const { data: { user }, error } = await supabase.auth.getUser(authHeader);
  if (error || !user) return res.status(401).end();
  req.authUser = user; // has .id, .email, etc.
  next();
};
