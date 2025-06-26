// lib/requireRole.js
class ForbiddenError extends Error {
  constructor(message = 'Forbidden', status = 403) {
    super(message);
    this.status = status;
  }
}

module.exports = function requireRole(allowedRoles, user) {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions', 403);
  }
};
