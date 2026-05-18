const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const loginActivitySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, default: 'Unknown' },
  device: { type: String, default: 'Unknown' },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password is required'], minlength: 6 },
  profilePhoto: { type: String, default: null },
  preferences: {
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'dark' },
    fontSize: { type: Number, default: 15 },
    notifications: { type: Boolean, default: true },
    saveChatHistory: { type: Boolean, default: true },
    ttsEnabled: { type: Boolean, default: false },
    ttsAutoRead: { type: Boolean, default: false },
    ttsSpeed: { type: Number, default: 1.0 },
    ttsVoiceGender: { type: String, default: 'female' },
  },
  bookmarks: [
    {
      chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
      messageIndex: { type: Number },
      content: { type: String },
      note: { type: String, default: '' },
      savedAt: { type: Date, default: Date.now },
    }
  ],
  loginActivity: { type: [loginActivitySchema], default: [] },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
