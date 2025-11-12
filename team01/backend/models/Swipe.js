const mongoose = require("mongoose");

const swipeSchema = new mongoose.Schema({
    // swiper
    swiperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    // swipee
    swipedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        required: true,
    },
    type: {
        type: String,
        enum: ["like", "pass"],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to prevent duplicate swipes
swipeSchema.index({ swiperId: 1, swipedUserId: 1, activityId: 1 }, { unique: true });

// Index for finding who a user has already swiped on for an activity
swipeSchema.index({ swiperId: 1, activityId: 1 });

// Index for finding who has swiped on a specific user
swipeSchema.index({ swipedUserId: 1, activityId: 1 });

// Index for finding likes (for match detection)
swipeSchema.index({ swipedUserId: 1, activityId: 1, type: 1 });

// prevent self-swiping
swipeSchema.pre('save', function (next) {
    if (this.swiperId.equals(this.swipedUserId)) {
        const error = new Error('Users cannot swipe on themselves');
        return next(error);
    }
    next();
});

module.exports = mongoose.model("Swipe", swipeSchema); 