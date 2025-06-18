// backend/middleware/requireRole.js

module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user; // set by getUserWithRole

    if (!user || !user.role) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res
        .status(403)
        .json({ error: `Requires one of: ${allowedRoles.join(', ')}` });
    }

    // User is in an allowed role—carry on
    next();
  };
};
