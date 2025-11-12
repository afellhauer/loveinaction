const mongoose = require("mongoose");

const blockedUserSchema = new mongoose.Schema({
  blockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blockedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    enum: ["inappropriate", "harassment", "spam", "other"],
    default: "other",
  },
});

blockedUserSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

module.exports = mongoose.model("BlockedUser", blockedUserSchema);
