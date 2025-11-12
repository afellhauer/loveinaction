const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifyToken: {
    type: String,
    default: null,
  },
  refreshTokens: {
    type: [String], // store multiple refresh tokens (e.g. for different devices)
    default: [],
  },
  isIdVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ["not_submitted", "pending", "approved", "rejected"],
    default: "not_submitted",
  },
  verificationScore: {
    type: Number,
  },
  verificationDetails: {
    type: Object,
  },
  verificationReasons: [String],
  verifiedAt: {
    type: Date,
  },
  idType: { type: String },
  // Account deactivation fields
  isActive: {
    type: Boolean,
    default: true,
  },
  deactivatedAt: {
    type: Date,
    default: null,
  },
  deactivationReason: {
    type: String,
    default: null,
  },
  reactivatedAt: {
    type: Date,
    default: null,
  },
  // Trusted contact for safety notifications
  trustedContact: {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(email) {
          // Only validate if email is provided (not empty)
          if (!email) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Invalid email format for trusted contact'
      },
      default: "",
    }
  },
  autoNotifyTrustedContact: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
