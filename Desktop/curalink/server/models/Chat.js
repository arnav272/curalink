const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  sources: [{
  title: { type: String, default: 'Untitled' },
  authors: { type: String, default: 'Unknown' },
  year: { type: String, default: 'N/A' },
  platform: { type: String, default: 'Unknown' },
  url: { type: String, default: '' },
  snippet: { type: String, default: 'No abstract available' },
}],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  patientContext: {
    name: String,
    disease: String,
    location: String,
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Chat', chatSchema);