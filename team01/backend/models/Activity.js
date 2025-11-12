const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  activityType: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    enum: [
      "ubc",
      "kitsilano", 
      "downtown",
      "mt pleasant",
      "olympic village",
      "kerrisdale"
    ],
  },
  dates: {
    type: [Date], // array of dates, empty array means "open to anything"
    default: [],
  },
  times: {
    type: [String],
    enum: {
      values: ["morning", "afternoon", "evening"],
      message: "Time must be morning, afternoon, or evening"
    },
    default: [], // empty array means "open to anything"
  },
  isActive: {
    type: Boolean,
    default: true, // whether this activity intention is currently active
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

activitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

activitySchema.index({ isActive: 1, activityType: 1, location: 1 });
activitySchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model("Activity", activitySchema); 