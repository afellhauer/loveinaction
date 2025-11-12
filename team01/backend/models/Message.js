const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match",
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000, // Limit message length
  },
  messageType: {
    type: String,
    enum: ["plans", "confirmation", "cancellation", "contact_info"],
    default: "plans",
  },
  readAt: {
    type: Date,
    default: null, // null = unread message
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficiently querying messages by match (most common query)
messageSchema.index({ matchId: 1, createdAt: -1 });

// Index for finding unread messages
messageSchema.index({ matchId: 1, readAt: 1 });

// Index for finding messages by sender
messageSchema.index({ senderId: 1, createdAt: -1 });

// Compound index for pagination queries
messageSchema.index({ matchId: 1, createdAt: 1 });

messageSchema.pre('save', function(next) {
  this.content = this.content.trim();
  
  if (!this.content || this.content.length === 0) {
    const error = new Error('Message content cannot be empty');
    return next(error);
  }
  
  next();
});

// mark message as read
messageSchema.methods.markAsRead = function() {
  if (!this.readAt) {
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

messageSchema.methods.isRead = function() {
  return this.readAt !== null;
};

// get unread message count for a match
messageSchema.statics.getUnreadCount = function(matchId, excludeSenderId) {
  return this.countDocuments({
    matchId: matchId,
    senderId: { $ne: excludeSenderId },
    readAt: null,
  });
};

messageSchema.statics.markAllAsRead = function(matchId, userId) {
  return this.updateMany(
    {
      matchId: matchId,
      senderId: { $ne: userId }, // don't mark own messages as read
      readAt: null,
    },
    {
      readAt: new Date(),
    }
  );
};

module.exports = mongoose.model("Message", messageSchema); 