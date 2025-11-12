const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  rater: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ratee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  safetyAndRespect: {
    madeMeFeelSafe: Boolean,
    asDescribedInProfile: Boolean,
    respectfulOfBoundaries: Boolean,
  },

  // Enhanced connection tracking
  connection: {
    greatConversationalist: Boolean,
    activeListener: Boolean,
    madeMeLaugh: Boolean,
    wouldMeetAgain: Boolean, // NEW: Important for measuring positive connections
  },

  consideration: {
    onTime: Boolean,
    attentive: Boolean,
    goodManners: Boolean,
    communicatedClearly: Boolean, // NEW: Important for dating safety
  },

  qualities: {
    dressedWell: Boolean,
    smelledNice: Boolean,
    goodEnergy: Boolean,
    charmingSmile: Boolean,
    athletic: Boolean,
    competitiveDrive: Boolean,
    openToAnything: Boolean,
  },

  // Attendance and special circumstances
  didNotShowUp: { type: Boolean, default: false },
  cancelled: { type: Boolean, default: false },
  leftEarly: { type: Boolean, default: false }, // NEW: Another reliability indicator

  // Enhanced feedback
  comments: String,
  wouldRecommendToFriend: Boolean, // NEW: Strong trust indicator

  // Connection strength (1-5 scale)
  connectionStrength: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },

  // Safety reporting (private, only for admins)
  safetyIncident: {
    reported: { type: Boolean, default: false },
    severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
    description: String,
    adminOnly: { type: Boolean, default: true }, // Only visible to admins
  },

  createdAt: { type: Date, default: Date.now },

  // Metadata for tracking rating quality
  ratingQuality: {
    hasDetailedComments: { type: Boolean, default: false }, // Auto-calculated
    completionScore: { type: Number, default: 0 }, // How many fields were filled
    timeToComplete: Number, // Seconds taken to complete rating (if tracked)
  },
});

// Pre-save middleware to calculate rating quality metrics
ratingSchema.pre("save", function (next) {
  // Calculate if has detailed comments (more than just a few words)
  this.ratingQuality.hasDetailedComments =
    this.comments && this.comments.trim().length > 20;

  // Calculate completion score (percentage of optional fields filled)
  const optionalFields = [
    "connection.greatConversationalist",
    "connection.activeListener",
    "connection.madeMeLaugh",
    "connection.wouldMeetAgain",
    "consideration.communicatedClearly",
    "qualities.dressedWell",
    "qualities.smelledNice",
    "qualities.goodEnergy",
    "qualities.charmingSmile",
    "wouldRecommendToFriend",
  ];

  let filledCount = 0;
  for (const field of optionalFields) {
    const value = field.split(".").reduce((obj, key) => obj?.[key], this);
    if (value === true || value === false) filledCount++;
  }

  this.ratingQuality.completionScore = Math.round(
    (filledCount / optionalFields.length) * 100
  );

  next();
});

// Index for better query performance
ratingSchema.index({ ratee: 1, createdAt: -1 });
ratingSchema.index({ rater: 1, ratee: 1 }, { unique: true }); // Prevent duplicate ratings

module.exports = mongoose.model("Rating", ratingSchema);
