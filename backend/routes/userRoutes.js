// backend/routes/userRoutes.js
const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const uc = require('../controllers/userController');

// Admin only
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).end();
  const users = await User.find().select('-password');
  res.json(users);
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).end();
  await User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

router.get('/', auth, uc.listUsers);
router.post('/', auth, uc.createUser);
router.delete('/:id', auth, uc.deleteUser);

module.exports = router;
