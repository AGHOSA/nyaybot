const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  bookmarked: { type: Boolean, default: false },
});

const chatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

chatSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.messages.length > 0 && this.title === 'New Chat') {
    const firstMsg = this.messages.find(m => m.role === 'user');
    if (firstMsg) {
      this.title = firstMsg.content.substring(0, 50) + (firstMsg.content.length > 50 ? '...' : '');
    }
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
