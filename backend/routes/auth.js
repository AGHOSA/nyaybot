const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const getDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || '';
  if (/mobile/i.test(ua)) return 'Mobile Browser';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Browser';
};

const getIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'Unknown';
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    // Log first login activity
    user.loginActivity.push({ ip: getIP(req), device: getDeviceInfo(req), status: 'success' });
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePhoto: user.profilePhoto,
      preferences: user.preferences,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      // Log failed attempt
      if (user) {
        user.loginActivity.push({ ip: getIP(req), device: getDeviceInfo(req), status: 'failed' });
        if (user.loginActivity.length > 20) user.loginActivity = user.loginActivity.slice(-20);
        await user.save();
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Log successful login
    user.loginActivity.push({ ip: getIP(req), device: getDeviceInfo(req), status: 'success' });
    if (user.loginActivity.length > 20) user.loginActivity = user.loginActivity.slice(-20);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePhoto: user.profilePhoto,
      preferences: user.preferences,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    profilePhoto: req.user.profilePhoto,
    preferences: req.user.preferences,
  });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.preferences) user.preferences = { ...user.preferences.toObject?.() || user.preferences, ...req.body.preferences };
    if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;
    await user.save();
    res.json({
      _id: user._id, name: user.name, email: user.email,
      profilePhoto: user.profilePhoto, preferences: user.preferences,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/login-activity
router.get('/login-activity', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loginActivity');
    res.json(user.loginActivity.slice().reverse().slice(0, 10));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with that email' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // In production you would send an email here.
    // For local dev we return the token so you can test.
    res.json({
      message: 'Password reset link generated. In production this would be emailed.',
      resetToken: token, // Remove this in production!
      resetLink: `http://localhost:5173/reset-password/${token}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  try {
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/bookmarks
router.post('/bookmarks', protect, async (req, res) => {
  const { chatId, messageIndex, content, note } = req.body;
  try {
    const user = await User.findById(req.user._id);
    user.bookmarks.push({ chatId, messageIndex, content, note });
    await user.save();
    res.json(user.bookmarks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/bookmarks
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bookmarks');
    res.json(user.bookmarks.slice().reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/bookmarks/:id
router.delete('/bookmarks/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.bookmarks = user.bookmarks.filter(b => b._id.toString() !== req.params.id);
    await user.save();
    res.json({ message: 'Bookmark removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/delete
router.delete('/delete', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
