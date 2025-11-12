// 📁 backend/routes/ratings.js
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Rating = require("../models/Rating");
const Match = require("../models/Match");
const authMiddleware = require("../middleware/authMiddleware");
const { recalcProfileStats } = require("../utils/ratingHelpers");

// POST /api/ratings
router.post("/", authMiddleware, async (req, res) => {
  try {
    const rating = new Rating({
      ...req.body,
    });
    rating.ratee = new mongoose.Types.ObjectId(req.body.ratee);
    rating.rater = req.user._id;

    await rating.save();

    // 2) find the corresponding Match (must be in "date_passed" state)
    const match = await Match.findOne({
      $or: [
        { user1Id: rating.rater, user2Id: rating.ratee },
        { user1Id: rating.ratee, user2Id: rating.rater },
      ],
      status: "date_passed",
    });

    // 3) if we found it, record this user’s score...
    if (match) {
      const myScore = req.body.connectionStrength; // or wherever you send the numeric score

      if (match.user1Id.equals(rating.rater)) {
        match.user1Rating = myScore;
      } else {
        match.user2Rating = myScore;
      }

      // 4) ...and only expire once *both* sides have rated
      if (match.user1Rating != null && match.user2Rating != null) {
        match.status = "expired";
      }

      await match.save();
    }

    // 5) respond with the Rating
    res.status(201).json(rating);
    recalcProfileStats(rating.ratee).catch(console.error);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
