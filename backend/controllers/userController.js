// backend/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Admin-only: list all users (without passwords)
exports.listUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin-only: create a new user account
exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash, role });
    res.status(201).json({ username: user.username, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Admin-only: delete a user by id
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
