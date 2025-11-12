// 📁 backend/models/Match.js
const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  user1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  user2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // snapshot of what you matched on:
  activityType: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  dates: { type: [Date], default: [] },
  // times: { type: [String], default: [] },

  status: {
    type: String,
    enum: [
      "active",
      "confirmed", // both users agreed on a date
      "date_passed", // the scheduled date/time is in the past
      "expired", // rating completed
      "unmatched",
      "blocked", // with the addition of the BlockedUser model, we can use it to track the user who initiated the block so we just use "blocked" here
    ],
    default: "active",
  },

  user1Rating: { type: Number, min: 1, max: 5, default: null },
  user2Rating: { type: Number, min: 1, max: 5, default: null },
  user1BlockReason: { type: String, default: null },
  user2BlockReason: { type: String, default: null },

  // Plan confirmation tracking
  user1Confirmed: { type: Boolean, default: false },
  user2Confirmed: { type: Boolean, default: false },

  // Trusted contact notification status for each user
  trustedContactNotifiedUser1: { type: Boolean, default: false },
  trustedContactNotifiedUser2: { type: Boolean, default: false },

  matchedAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
});

// ——— Indexes ———
// Unique per pair of users *and* that particular activity snapshot
matchSchema.index(
  { user1Id: 1, user2Id: 1, activityType: 1, location: 1, dates: 1, times: 1 },
  { unique: true }
);

// Quickly find all your matches
matchSchema.index({ user1Id: 1, status: 1 });
matchSchema.index({ user2Id: 1, status: 1 });

// Optionally: find matches by activity type+location
matchSchema.index({ activityType: 1, location: 1, status: 1 });

// Keep the “lastMessageAt” sort index
matchSchema.index({ lastMessageAt: -1 });

// ——— Middleware ———
matchSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // normalize ordering so (A,B) == (B,A)
  if (this.user1Id.toString() > this.user2Id.toString()) {
    [this.user1Id, this.user2Id] = [this.user2Id, this.user1Id];
    [this.user1Rating, this.user2Rating] = [this.user2Rating, this.user1Rating];
    [this.user1BlockReason, this.user2BlockReason] = [
      this.user2BlockReason,
      this.user1BlockReason,
    ];
    [this.user1Confirmed, this.user2Confirmed] = [this.user2Confirmed, this.user1Confirmed];

    if (this.status === "blocked_by_user1") this.status = "blocked_by_user2";
    else if (this.status === "blocked_by_user2")
      this.status = "blocked_by_user1";
  }
  next();
});

matchSchema.pre("save", function (next) {
  if (this.user1Id.equals(this.user2Id)) {
    return next(new Error("Users cannot match with themselves"));
  }
  next();
});

// ——— Instance methods (unchanged) ———
matchSchema.methods.isActive = function () {
  return this.status === "active" || this.status === "confirmed";
};
matchSchema.methods.isBlocked = function () {
  return this.status.includes("blocked");
};
matchSchema.methods.isBlockedBy = function (uid) {
  const u = uid.toString(),
    u1 = this.user1Id.toString(),
    u2 = this.user2Id.toString();
  if (u === u1)
    return ["blocked_by_user1", "mutually_blocked"].includes(this.status);
  if (u === u2)
    return ["blocked_by_user2", "mutually_blocked"].includes(this.status);
  return false;
};
matchSchema.methods.getUserRating = function (uid) {
  const u = uid.toString(),
    u1 = this.user1Id.toString();
  return u === u1 ? this.user1Rating : this.user2Rating;
};
matchSchema.methods.setUserRating = function (uid, r) {
  const u = uid.toString(),
    u1 = this.user1Id.toString();
  if (u === u1) this.user1Rating = r;
  else this.user2Rating = r;
};

// Plan confirmation methods
matchSchema.methods.getUserConfirmed = function (uid) {
  const u = uid.toString(),
    u1 = this.user1Id.toString();
  return u === u1 ? this.user1Confirmed : this.user2Confirmed;
};

matchSchema.methods.setUserConfirmed = function (uid, confirmed) {
  const u = uid.toString(),
    u1 = this.user1Id.toString();
  if (u === u1) this.user1Confirmed = confirmed;
  else this.user2Confirmed = confirmed;
};

matchSchema.methods.bothUsersConfirmed = function () {
  return this.user1Confirmed && this.user2Confirmed;
};

module.exports = mongoose.model("Match", matchSchema);
