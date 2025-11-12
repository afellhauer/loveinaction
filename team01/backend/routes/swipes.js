const express = require("express");
const router = express.Router();
const Swipe = require("../models/Swipe");
const Activity = require("../models/Activity");
const User = require("../models/User");
const Match = require("../models/Match");
const BlockedUser = require("../models/BlockedUser");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/activity/:activityId/already-swiped",
  authMiddleware,
  async (req, res) => {
    try {
      const { activityId } = req.params;

      const activity = await Activity.findOne({
        _id: activityId,
        userId: req.user._id,
      });

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: "Activity not found or not authorized",
          code: "ACTIVITY_NOT_FOUND"
        });
      }

      const swipedUserIds = await Swipe.find({
        swiperId: req.user._id,
        activityId,
      }).distinct("swipedUserId");

      res.json({
        success: true,
        data: swipedUserIds,
        count: swipedUserIds.length,
      });
    } catch (error) {
      console.error("Error fetching swiped users:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { swipedUserId, activityId, type } = req.body;
    if (!swipedUserId || !activityId || !type) {
      return res.status(400).json({
        success: false,
        message: "swipedUserId, activityId, and type are required",
      });
    }
    if (!["like", "pass"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'like' or 'pass'",
      });
    }

    // 1) Verify your own activity exists & is active
    const activity = await Activity.findOne({
      _id: activityId,
      userId: req.user._id,
      isActive: true,
    });
    console.log("🔍  Found my activity:", activity);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found or not active",
      });
    }

    // 2) Ensure the swiped‐on user exists and is active
    const swipedUser = await User.findById(swipedUserId);
    if (!swipedUser) {
      return res.status(404).json({
        success: false,
        message: "Swiped user not found",
      });
    }

    // Check if the swiped user's account is active
    if (!swipedUser.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot swipe on deactivated user",
      });
    }

    // 3) Check if either user has blocked the other
    const blockExists = await BlockedUser.findOne({
      $or: [
        { blockerId: req.user._id, blockedUserId: swipedUserId },
        { blockerId: swipedUserId, blockedUserId: req.user._id }
      ]
    });

    if (blockExists) {
      return res.status(400).json({
        success: false,
        message: "Cannot interact with blocked user",
      });
    }

    // 4) Record the swipe
    const newSwipe = new Swipe({
      swiperId: req.user._id,
      swipedUserId,
      activityId,
      type,
    });
    const savedSwipe = await newSwipe.save();

    let isMatch = false;
    let matchData = null;

    // 4) If a “like”, check for a reciprocal like
    if (type === "like") {
      // a) Grab all likes the other user made back to you
      const recips = await Swipe.find({
        swiperId: swipedUserId,
        swipedUserId: req.user._id,
        type: "like",
      });

      // b) TODO: overlap helper if you want to compare dates/times
      const arraysOverlap = (a = [], b = []) =>
        a.length === 0 || b.length === 0 || a.some((x) => b.includes(x));

      // c) Find one that matches on the actual Activity document
      let reciprocal = null;
      for (const s of recips) {
        const theirAct = await Activity.findById(s.activityId);
        console.log("   • comparing against their activity:", theirAct);
        if (
          theirAct.activityType === activity.activityType &&
          theirAct.location === activity.location
          // && (arraysOverlap(theirAct.dates, activity.dates) ||
          //     arraysOverlap(theirAct.times, activity.times))
        ) {
          reciprocal = s;
          break;
        }
      }

      if (reciprocal) {
        isMatch = true;
        try {
          const newMatch = new Match({
            user1Id: req.user._id,
            user2Id: swipedUserId,
            activityType: activity.activityType,
            location: activity.location,
            dates: activity.dates,
            // times: activity.times,
          });
          console.log("🎉  It’s a match! Creating Match doc…", newMatch);

          await newMatch.save();
          matchData = await newMatch
            .populate("user1Id", "firstName lastName")
            .populate("user2Id", "firstName lastName");

          console.log("🎉  poopooc…", matchData);
        } catch (e) {
          matchData = await Match.findOne({
            $or: [
              {
                user1Id: req.user._id,
                user2Id: swipedUserId,
                activityType: activity.activityType,
                location: activity.location,
                dates: { $all: activity.dates },
                // times: { $all: activity.times },
              },
              {
                user1Id: swipedUserId,
                user2Id: req.user._id,
                activityType: activity.activityType,
                location: activity.location,
                dates: { $all: activity.dates },
                // times: { $all: activity.times },
              },
            ],
          })
            .populate("user1Id", "firstName lastName")
            .populate("user2Id", "firstName lastName");
        }
      }
    }

    // 5) Send response
    return res.status(201).json({
      success: true,
      data: savedSwipe,
      isMatch,
      match: matchData,
      message: isMatch ? "It's a match!" : "Swipe recorded successfully",
    });
  } catch (error) {
    // handle duplicate‐swipe
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already swiped on this user for this activity",
      });
    }
    console.error("Error in swipe route:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/matches/:activityId", authMiddleware, async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await Activity.findOne({
      _id: activityId,
      userId: req.user._id,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found or not authorized",
      });
    }

    const userLikes = await Swipe.find({
      swiperId: req.user._id,
      activityId,
      type: "like",
    });

    const matches = [];

    for (const like of userLikes) {
      const reciprocalLike = await Swipe.findOne({
        swiperId: like.swipedUserId,
        swipedUserId: req.user._id,
        activityId,
        type: "like",
      });

      if (reciprocalLike) {
        const matchedUser = await User.findById(like.swipedUserId).select(
          "firstName lastName email"
        );

        matches.push({
          userId: matchedUser.userId,
          user: matchedUser,
          matchedAt:
            reciprocalLike.createdAt > like.createdAt
              ? reciprocalLike.createdAt
              : like.createdAt,
          activityId,
        });
      }
    }

    res.json({
      success: true,
      data: matches,
      count: matches.length,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/my-swipes", authMiddleware, async (req, res) => {
  try {
    const { activityId, type } = req.query;

    const query = { swiperId: req.user._id };
    if (activityId) query.activityId = activityId;
    if (type) query.type = type;

    const swipes = await Swipe.find(query)
      .populate("swipedUserId", "firstName lastName email")
      .populate("activityId", "activityType location")
      .sort({ createdAt: -1 })
      .limit(100); // Limit for performance

    res.json({
      success: true,
      data: swipes,
      count: swipes.length,
    });
  } catch (error) {
    console.error("Error fetching user swipes:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const swipe = await Swipe.findOne({
      _id: req.params.id,
      swiperId: req.user._id,
    });

    if (!swipe) {
      return res.status(404).json({
        success: false,
        message: "Swipe not found or not authorized",
      });
    }

    await Swipe.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Swipe deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting swipe:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
