const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Match = require("../models/Match");
const User = require("../models/User");
const BlockedUser = require("../models/BlockedUser");
const authMiddleware = require("../middleware/authMiddleware");

const verifyMatchAccess = async (matchId, userId, isAllowedForInactive = false) => {
  const match = await Match.findById(matchId);
  if (!match) {
    return { error: "Match not found", status: 404 };
  }

  const userIdStr = userId.toString();
  const isAuthorized = match.user1Id.toString() === userIdStr || 
                       match.user2Id.toString() === userIdStr;

  if (!isAuthorized) {
    return { error: "Not authorized to access this match", status: 403 };
  }

  if (!match.isActive() && !isAllowedForInactive) {
    return { error: "Cannot send messages to inactive match", status: 400 };
  }

  // Check if either user has blocked the other
  const otherUserId = match.user1Id.toString() === userId.toString() 
    ? match.user2Id 
    : match.user1Id;
    
  const blockExists = await BlockedUser.findOne({
    $or: [
      { blockerId: userId, blockedUserId: otherUserId },
      { blockerId: otherUserId, blockedUserId: userId }
    ]
  });

  if (blockExists) {
    return { error: "Cannot send messages to blocked user", status: 400 };
  }

  return { match };
};

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { matchId, content, messageType = "text" } = req.body;

    if (!matchId || !content) {
      return res.status(400).json({
        success: false,
        message: "matchId and content are required",
      });
    }

    const verification = await verifyMatchAccess(matchId, req.user._id);
    if (verification.error) {
      return res.status(verification.status).json({
        success: false,
        message: verification.error,
      });
    }

    const newMessage = new Message({
      matchId,
      senderId: req.user._id,
      content,
      messageType,
    });

    const savedMessage = await newMessage.save();
    await savedMessage.populate("senderId", "firstName lastName");

    verification.match.lastMessageAt = new Date();
    await verification.match.save();

    const io = req.app.get("io");
    io.to(matchId).emit("chatMessage", savedMessage);

    res.status(201).json({
      success: true,
      data: savedMessage,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/match/:matchId", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const verification = await verifyMatchAccess(matchId, req.user._id, true);
    if (verification.error) {
      return res.status(verification.status).json({
        success: false,
        message: verification.error,
      });
    }

    const query = { matchId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate("senderId", "firstName lastName")
      .sort({ createdAt: -1 }) // most recent first
      .limit(parseInt(limit))
      .lean();

    const unreadCount = await Message.getUnreadCount(matchId, req.user._id);

    res.json({
      success: true,
      data: messages.reverse(), // reverse to show oldest first in UI
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit),
        before: messages.length > 0 ? messages[0].createdAt : null,
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const verification = await verifyMatchAccess(message.matchId, req.user._id);
    if (verification.error) {
      return res.status(verification.status).json({
        success: false,
        message: verification.error,
      });
    }

    if (message.senderId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark your own message as read",
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      data: message,
      message: "Message marked as read",
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.put("/match/:matchId/read-all", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;

    const verification = await verifyMatchAccess(matchId, req.user._id);
    if (verification.error) {
      return res.status(verification.status).json({
        success: false,
        message: verification.error,
      });
    }

    const result = await Message.markAllAsRead(matchId, req.user._id);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
      message: `${result.modifiedCount} messages marked as read`,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/match/:matchId/unread-count", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;

    const verification = await verifyMatchAccess(matchId, req.user._id);
    if (verification.error) {
      return res.status(verification.status).json({
        success: false,
        message: verification.error,
      });
    }

    const unreadCount = await Message.getUnreadCount(matchId, req.user._id);

    res.json({
      success: true,
      data: {
        unreadCount,
        matchId,
      },
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router; 