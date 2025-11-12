const Match = require("../models/Match");
const sendSafetyNotificationEmail = require("../utils/sendSafetyNotificationEmail");
module.exports = function(io) {
  const express = require("express");
  const router = express.Router();
  const Match = require("../models/Match");
  const Profile = require("../models/Profile");
  const User = require("../models/User");
  const authMiddleware = require("../middleware/authMiddleware");
  const sendSafetyNotificationEmail = require("../utils/sendSafetyNotificationEmail");

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const {status} = req.query;
      const statusList = status
          ? status.split(",")
          : ["active", "confirmed", "date_passed"]; 

      const localNow = new Date();
      const localYear = localNow.getFullYear();
      const localMonth = localNow.getMonth();
      const localDate = localNow.getDate();

      const localMidnightUTC = new Date(Date.UTC(localYear, localMonth, localDate));

      await Match.updateMany(
          {
            status: "confirmed",
            dates: { $lt: localMidnightUTC }
          },
          { status: "date_passed" }
      );

      await Match.updateMany(
          {
            status: "active",
            dates: { $lt: localMidnightUTC }
          },
          { status: "expired" }
      );

      // 1) Fetch any match where I’m either user1 or user2
      const matches = await Match.find({
        $or: [{user1Id: req.user._id}, {user2Id: req.user._id}],
        status: {$in: statusList},
      })
          .populate("user1Id", "firstName lastName email")
          .populate("user2Id", "firstName lastName email")
          .sort({lastMessageAt: -1, matchedAt: -1});

      // 2) Map into client‐friendly shape, pulling in our snapshot fields
      const formatted = await Promise.all(
          matches.map(async (m) => {

            const meIsUser1 = String(m.user1Id._id || m.user1Id) === String(req.user._id);
            const other = meIsUser1 ? m.user2Id : m.user1Id;
            const myRating = meIsUser1 ? m.user1Rating : m.user2Rating;
            const theirRating = meIsUser1 ? m.user2Rating : m.user1Rating;
            const trustedContactNotified = meIsUser1 ? m.trustedContactNotifiedUser1 : m.trustedContactNotifiedUser2;
            const profile = await Profile.findOne({user: other._id}).lean();
            return {
              _id: m._id,
              otherUser: {
                _id: other._id,
                firstName: other.firstName,
                lastName: other.lastName,
                email: other.email,
              },
              activityType: m.activityType,
              location: m.location,
              dates: m.dates,
              status: m.status,
              myRating,
              theirRating,
              myConfirmed: meIsUser1 ? m.user1Confirmed : m.user2Confirmed,
              theirConfirmed: meIsUser1 ? m.user2Confirmed : m.user1Confirmed,
              bothConfirmed: m.user1Confirmed && m.user2Confirmed,
              matchedAt: m.matchedAt,
              lastMessageAt: m.lastMessageAt,
              updatedAt: m.updatedAt,
              myTrustedContactNotified: trustedContactNotified,
              safetyScore: profile?.safetyScore ?? 0,
              badges: profile?.badges ?? [],
            };
          })
      );

      return res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (err) {
      console.error("Error fetching matches:", err);
      return res
          .status(500)
          .json({success: false, message: "Server error", error: err.message});
    }
  });

  // GET /api/matches/:id
  router.get("/:id", authMiddleware, async (req, res) => {
    try {
      const m = await Match.findById(req.params.id)
          .populate("user1Id", "firstName lastName email")
          .populate("user2Id", "firstName lastName email");

      if (!m) {
        return res
            .status(404)
            .json({success: false, message: "Match not found"});
      }
      // ensure the current user is part of this match
      const meId = req.user._id.toString();
      if (![m.user1Id._id.toString(), m.user2Id._id.toString()].includes(meId)) {
        return res
            .status(403)
            .json({success: false, message: "Not authorized"});
      }

      // build response
      const meIsUser1 = m.user1Id._id.equals(req.user._id);
      const other = meIsUser1 ? m.user2Id : m.user1Id;
      const myRating = meIsUser1 ? m.user1Rating : m.user2Rating;
      const theirRating = meIsUser1 ? m.user2Rating : m.user1Rating;

      return res.json({
        success: true,
        data: {
          _id: m._id,
          otherUser: {
            _id: other._id,
            firstName: other.firstName,
            lastName: other.lastName,
            email: other.email,
          },
          activityType: m.activityType,
          location: m.location,
          dates: m.dates,
          // times: m.times,
          status: m.status,
          myRating,
          theirRating,
          // Plan confirmation status
          myConfirmed: meIsUser1 ? m.user1Confirmed : m.user2Confirmed,
          theirConfirmed: meIsUser1 ? m.user2Confirmed : m.user1Confirmed,
          bothConfirmed: m.user1Confirmed && m.user2Confirmed,
          matchedAt: m.matchedAt,
          lastMessageAt: m.lastMessageAt,
          updatedAt: m.updatedAt,
          // Add trustedContactNotified for current user
          myTrustedContactNotified: meIsUser1 ? m.trustedContactNotifiedUser1 : m.trustedContactNotifiedUser2,
        },
      });
    } catch (err) {
      console.error("Error fetching match:", err);
      return res
          .status(500)
          .json({success: false, message: "Server error", error: err.message});
    }
  });

  router.post("/:id/block", authMiddleware, async (req, res) => {
    try {
      const {reason} = req.body;
      const match = await Match.findById(req.params.id);

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const userId = req.user._id.toString();
      const isUser1 = match.user1Id.toString() === userId;
      const isUser2 = match.user2Id.toString() === userId;

      if (!isUser1 && !isUser2) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this match",
        });
      }

      if (match.isBlocked()) {
        if (match.status === "mutually_blocked") {
          return res.status(400).json({
            success: false,
            message: "This match is already mutually blocked",
          });
        }

        // If other user blocked first, now it's mutual
        if (
            (isUser1 && match.status === "blocked_by_user2") ||
            (isUser2 && match.status === "blocked_by_user1")
        ) {
          match.status = "mutually_blocked";
        }
      } else {
        match.status = isUser1 ? "blocked_by_user1" : "blocked_by_user2";
      }

      if (isUser1) {
        match.user1BlockReason = reason || "No reason provided";
      } else {
        match.user2BlockReason = reason || "No reason provided";
      }

      await match.save();

      res.json({
        success: true,
        data: match,
        message: "User blocked successfully",
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

  router.post("/:id/unblock", authMiddleware, async (req, res) => {
    try {
      const match = await Match.findById(req.params.id);

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const userId = req.user._id.toString();
      const isUser1 = match.user1Id.toString() === userId;
      const isUser2 = match.user2Id.toString() === userId;

      if (!isUser1 && !isUser2) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this match",
        });
      }

      if (match.status === "mutually_blocked") {
        // If mutually blocked, unblocking by one user leaves it blocked by the other
        match.status = isUser1 ? "blocked_by_user2" : "blocked_by_user1";
      } else if (
          (isUser1 && match.status === "blocked_by_user1") ||
          (isUser2 && match.status === "blocked_by_user2")
      ) {
        // If blocked by this user, unblocking makes it active
        match.status = "active";
      } else {
        return res.status(400).json({
          success: false,
          message: "You haven't blocked this user",
        });
      }

      if (isUser1) {
        match.user1BlockReason = null;
      } else {
        match.user2BlockReason = null;
      }

      await match.save();

      res.json({
        success: true,
        data: match,
        message: "User unblocked successfully",
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  router.post("/:id/rate", authMiddleware, async (req, res) => {
    try {
      const {rating} = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      const match = await Match.findById(req.params.id);

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const userId = req.user._id.toString();
      const isUser1 = match.user1Id.toString() === userId;
      const isUser2 = match.user2Id.toString() === userId;

      if (!isUser1 && !isUser2) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to rate this match",
        });
      }

      match.setUserRating(userId, rating);
      await match.save();

      res.json({
        success: true,
        data: match,
        message: "Rating submitted successfully",
      });
    } catch (error) {
      console.error("Error rating user:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  router.post("/:id/unmatch", authMiddleware, async (req, res) => {
    try {
      const match = await Match.findById(req.params.id);

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const userId = req.user._id.toString();
      if (
          match.user1Id.toString() !== userId &&
          match.user2Id.toString() !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this match",
        });
      }

      if (match.status === "unmatched") {
        return res.status(400).json({
          success: false,
          message: "Already unmatched",
        });
      }

      match.status = "unmatched";
      await match.save();

      res.json({
        success: true,
        data: match,
        message: "Successfully unmatched",
      });
    } catch (error) {
      console.error("Error unmatching:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  router.post("/:id/confirm-plans", authMiddleware, async (req, res) => {
    try {
      const match = await Match.findById(req.params.id);

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const userId = req.user._id.toString();
      const isUser1 = match.user1Id.toString() === userId;
      const isUser2 = match.user2Id.toString() === userId;

      if (!isUser1 && !isUser2) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this match",
        });
      }

      // Set this user's confirmation to true
      match.setUserConfirmed(userId, true);

      // Check if both users have now confirmed
      const bothConfirmed = match.bothUsersConfirmed();
      if (bothConfirmed) {
        match.status = "confirmed";
        await match.save();
        io.to(match._id.toString()).emit("dateFinalized", match);
      } else {
        await match.save();
        io.to(match._id.toString()).emit("meConfirmed", match);
      }

      res.json({
        success: true,
        data: {
          matchId: match._id,
          userConfirmed: true,
          otherUserConfirmed: bothConfirmed
              ? true
              : isUser1
                  ? match.user2Confirmed
                  : match.user1Confirmed,
          bothUsersConfirmed: bothConfirmed,
          status: match.status,
        },
        message: bothConfirmed
            ? "Both users have confirmed! Plans are ready to be finalized."
            : "Your confirmation recorded. Waiting for the other user.",
      });
    } catch (error) {
      console.error("Error confirming plans:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });

  router.delete("/:id", authMiddleware, async (req, res) => {
    try {
      const match = await Match.findById(req.params.id);

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const userId = req.user._id.toString();
      if (
          match.user1Id.toString() !== userId &&
          match.user2Id.toString() !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this match",
        });
      }

      await Match.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Match deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting match:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// POST /api/matches/:id/send-safety-notification
router.post("/:id/send-safety-notification", authMiddleware, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
    const user1 = await User.findById(match.user1Id._id)
    const user2 = await User.findById(match.user2Id._id)

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    // Check if match is confirmed
    if (match.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Match must be confirmed before sending safety notification",
      });
    }

    if (!user1 || !user2) {
      return res.status(404).json({
        success: false,
        message: "One or both users not found",
      });
    }

    // Prepare both users
    const usersToNotify = [];

    if (
        user1.autoNotifyTrustedContact &&
        user1.trustedContact &&
        user1.trustedContact.email
    ) {
      usersToNotify.push({
        user: user1,
        other: user2,
        type: "user1",
      });
    }

    if (
        user2.autoNotifyTrustedContact &&
        user2.trustedContact &&
        user2.trustedContact.email
    ) {
      usersToNotify.push({
        user: user2,
        other: user1,
        type: "user2",
      });
    }

    if (usersToNotify.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No users with auto-notify enabled and trusted contact configured.",
      });
    }

    console.log("Users to notify:", usersToNotify);

    // Send notifications
    for (const { user, other, type } of usersToNotify) {
      const dateDetails = {
        trustedContactName: user.trustedContact.name || "Friend",
        trustedContactEmail: user.trustedContact.email,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        matchName: `${other.firstName} ${other.lastName}`.trim(),
        date: match.dates?.[0] || new Date(),
        location: match.location,
        activityType: match.activityType,
      };

      await sendSafetyNotificationEmail(dateDetails);

      if (type === "user1") {
        console.log("Set trustedContactNotifiedUser1 = true");
        match.trustedContactNotifiedUser1 = true;
        match.save()
        io.to(user1._id.toString()).emit("trustedContactNotified", {
          matchId: match._id,
          message: "Your trusted contact has been notified about your confirmed plan for your safety.",
        });
      } else if (type === "user2") {
        console.log("Set trustedContactNotifiedUser2 = true");
        match.trustedContactNotifiedUser2 = true;
        match.save()
        io.to(match.user2Id._id.toString()).emit("trustedContactNotified", {
          matchId: match._id,
          message: "Your trusted contact has been notified about your confirmed plan for your safety.",
        });
      }
    }

    res.json({
      success: true,
      message: "Safety notification(s) sent to trusted contact(s).",
    });
  } catch (error) {
    console.error("Error sending safety notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send safety notification",
      error: error.message,
    });
  }
});
return router;
}
