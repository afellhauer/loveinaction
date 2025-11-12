// 📁 backend/models/Profile.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // one profile per user
  },
  age: { type: Number, required: true, min: 18, max: 99 },
  location: { type: String, required: true, trim: true },
  gender: { type: String, required: true, trim: true },
  pronouns: { type: String, required: true, trim: true },
  preference: {
    type: String,
    enum: ["Female", "Male", "Everyone"],
    required: true,
    trim: true,
  },
  occupation: { type: String, trim: true, default: "" },
  education: { type: String, trim: true, default: "" },
  bio: { type: String, trim: true, default: "" },

  // store file path or URL of the uploaded profile picture
  profilePicUrl: { type: String, default: "" },

  // optional Q&A
  q1: { type: String, trim: true, default: "" },
  q1Text: { type: String, trim: true, default: "" },

  socialMedia: {
    instagram: { type: String, trim: true, default: "" },
    snapchat: { type: String, trim: true, default: "" },
    tiktok: { type: String, trim: true, default: "" },
  },

  createdAt: { type: Date, default: Date.now },

  safetyScore: {
    type: Number,
    default: 0,
  },
  badges: {
    type: [String], // e.g. ["🛡 Trusted", "⚡ Energetic"]
    default: [],
  },
});

module.exports = mongoose.model("Profile", profileSchema);
