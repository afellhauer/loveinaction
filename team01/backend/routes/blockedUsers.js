module.exports = function(io) {
  const express = require("express");
  const router = express.Router();
  const BlockedUser = require("../models/BlockedUser");
  const User = require("../models/User");
  const Match = require("../models/Match");
  const authMiddleware = require("../middleware/authMiddleware");

  // GET /api/blocked-users - get all blocked users for current user
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const blockedUsers = await BlockedUser.find({ blockerId: req.user._id })
        .populate("blockedUserId", "firstName lastName email")
        .sort({ blockedAt: -1 });

      const formatted = blockedUsers.map(block => ({
        _id: block._id,
        user: {
          _id: block.blockedUserId._id,
          firstName: block.blockedUserId.firstName,
          lastName: block.blockedUserId.lastName,
          email: block.blockedUserId.email,
        },
        blockedAt: block.blockedAt,
        reason: block.reason,
      }));

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  // POST /api/blocked-users - block a user
  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { userId, reason = "other" } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      // Cannot block yourself
      if (userId === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Cannot block yourself",
        });
      }

      // Check if user exists
      const userToBlock = await User.findById(userId);
      if (!userToBlock) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if already blocked
      const existingBlock = await BlockedUser.findOne({
        blockerId: req.user._id,
        blockedUserId: userId,
      });

      if (existingBlock) {
        return res.status(409).json({
          success: false,
          message: "User is already blocked",
        });
      }

      // Create block record
      const blockRecord = new BlockedUser({
        blockerId: req.user._id,
        blockedUserId: userId,
        reason,
      });

      await blockRecord.save();

      // Cancel any active matches with the blocked user
      const matches = await Match.find({
        $or: [
          { user1Id: req.user._id, user2Id: userId },
          { user1Id: userId, user2Id: req.user._id },
        ],
        status: { $in: ["active", "planning", "confirmed", "date_passed", "expired"] },
      });

      const matchIds = matches.map(m => m._id);

      await Match.updateMany(
          { _id: { $in: matchIds } },
          { status: "blocked" }
      );


      io.emit("matchesBlocked", { matchIds, blockerId: req.user._id });

      res.json({
        success: true,
        message: "User blocked successfully",
        data: {
          _id: blockRecord._id,
          blockedUserId: userId,
          blockedAt: blockRecord.blockedAt,
          reason: blockRecord.reason,
        },
      });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  // GET /api/blocked-users/check/:userId - Check if a user is blocked
  router.get("/check/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const blockRecord = await BlockedUser.findOne({
      blockerId: req.user._id,
      blockedUserId: userId,
    });

    res.json({
      success: true,
      isBlocked: !!blockRecord,
      blockRecord: blockRecord ? {
        _id: blockRecord._id,
        blockedAt: blockRecord.blockedAt,
        reason: blockRecord.reason,
      } : null,
    });
  } catch (error) {
    console.error("Error checking block status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

  // GET /api/blocked-users/count/:userId (Get count of how many times a user has been blocked
  router.get("/count/:userId", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const userExists = await User.findById(userId);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const blockedCount = await BlockedUser.countDocuments({ blockedUserId: userId });

      res.json({
        success: true,
        data: {
          userId,
          blockedCount,
          penalty: calculateBlockedUserPenalty(blockedCount),
        },
      });
    } catch (error) {
      console.error("Error getting blocked count:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  function calculateBlockedUserPenalty(blockedCount) {
    if (blockedCount === 0) return 0;
    
    if (blockedCount <= 2) {
      return blockedCount * 2.5;
    }
    
    const logPenalty = 5 + 10 * Math.log2(blockedCount - 1);
    return Math.min(50, Math.round(logPenalty));
  }

  return router;
}
