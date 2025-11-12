const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const User = require("../models/User");
const Profile = require("../models/Profile");
const BlockedUser = require("../models/BlockedUser");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { activityType, location, dates, times } = req.body;

    if (!activityType || !location) {
      return res.status(400).json({
        success: false,
        message: "Activity type and location are required",
      });
    }

    const newActivity = new Activity({
      userId: req.user._id,
      activityType,
      location,
      dates: dates || [],
      times: times || [],
    });

    const savedActivity = await newActivity.save();
    await savedActivity.populate("userId", "firstName lastName");

    res.status(201).json({
      success: true,
      data: savedActivity,
      message: "Activity intention created successfully",
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/my-activities", authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    console.error("Error fetching user activities:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET /api/activities/:id/matches
router.get("/:activityId/matches", authMiddleware, async (req, res) => {
  try {
    const { activityId } = req.params;
    // 1) fetch this exact user-intention
    const meAct = await Activity.findOne({
      _id: activityId,
      userId: req.user._id,
      isActive: true,
    });
    // console.log(" → meAct found?:", !!meAct, meAct);

    if (!meAct) {
      return res.status(404).json({
        success: false,
        data: [],
        message: "Activity not found",
        code: "ACTIVITY_NOT_FOUND",
      });
    }

    // Get the current user's profile for gender preference filtering
    const myProfile = await Profile.findOne({ user: req.user._id });
    if (!myProfile) {
      return res.status(404).json({
        success: false,
        data: [],
        message: "User profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // 2) build a match query just like before, but *only* for meAct
    const matchQuery = {
      _id: { $ne: meAct._id },
      userId: { $ne: meAct.userId },
      isActive: true,
      activityType: meAct.activityType,
      location: meAct.location,
    };

    // console.log(" → matchQuery:", JSON.stringify(matchQuery, null, 2));

    // Date/time matching
    if (meAct.dates && meAct.dates.length > 0) {
      matchQuery.$or = [
        { dates: { $size: 0 } }, //no specific dates (flexible)
        { dates: { $in: meAct.dates } }, //overlapping dates
      ];
    }

    if (meAct.times && meAct.times.length > 0) {
      const timeClause = [
        { times: { $size: 0 } }, //no specific times (flexible)
        { times: { $in: meAct.times } }, //overlapping times
      ];

      // If a date is specified, combine with AND logic
      if (matchQuery.$or) {
        matchQuery.$and = [{ $or: matchQuery.$or }, { $or: timeClause }];
        delete matchQuery.$or;
      } else {
        matchQuery.$or = timeClause;
      }
    }

    let rawMatches = await Activity.find(matchQuery)
      .populate("userId", "firstName lastName email isIdVerified")
      .sort({ createdAt: -1 });

    // dedupe by userId
    rawMatches = rawMatches.filter(
      (m, i, arr) =>
        arr.findIndex((x) => x.userId._id.equals(m.userId._id)) === i
    );

    // filter out blocked users (bidirectional)
    const blockedRecords = await BlockedUser.find({
      $or: [{ blockerId: req.user._id }, { blockedUserId: req.user._id }],
    });

    const blockedUserIds = new Set();
    blockedRecords.forEach((record) => {
      if (record.blockerId.toString() === req.user._id.toString()) {
        blockedUserIds.add(record.blockedUserId.toString());
      } else {
        blockedUserIds.add(record.blockerId.toString());
      }
    });

    rawMatches = rawMatches.filter(
      (match) => !blockedUserIds.has(match.userId._id.toString())
    );

    // Now fetch each user's Profile and reshape
    let results = await Promise.all(
      rawMatches.map(async (act) => {
        const prof = await Profile.findOne({ user: act.userId._id });
        if (!prof) return null;

        // Fetch ratings count for this user
        const Rating = require("../models/Rating");
        const ratingsCount = await Rating.countDocuments({ ratee: act.userId._id });
        const safeRatingsCount = typeof ratingsCount === 'number' && ratingsCount >= 0 ? ratingsCount : 0;

        return {
          activityId: act._id,
          userId: act.userId._id,
          name: `${act.userId.firstName} ${act.userId.lastName}`,
          age: prof?.age ?? "",
          gender: prof?.gender ?? "",
          image: prof?.profilePicUrl ?? "",
          bio: prof?.bio ?? "",
          safetyScore: prof?.safetyScore ?? "",
          badges: prof.badges || [],
          socialMedia: prof?.socialMedia ?? {},
          activity: act.activityType,
          location: act.location,
          time:
            act.dates && act.dates.length > 0
              ? act.dates[0].toISOString().slice(0, 10)
              : "Flexible",
          timeOfDay:
            act.times && act.times.length > 0
              ? act.times.join(", ")
              : "Flexible",
          preference: prof?.preference ?? "Everyone",
          isIdVerified: act.userId.isIdVerified || false,
          availableDates: act.dates || [],
          availableTimes: act.times || [],
          ratingsCount: safeRatingsCount,        
        };
      })
    );

    //filter results based on gender preferences
    const beforeFilterCount = results.filter((r) => r !== null).length;

    results = results.filter((result) => {
      if (!result) return false;

      const otherUserGender = result.gender;
      const otherUserPreference = result.preference;

      const myGender = myProfile.gender;
      const myPreference = myProfile.preference;

      let iMatchTheirPreference = false;
      if (otherUserPreference === "Everyone") {
        iMatchTheirPreference = true;
      } else if (otherUserPreference === "Male" && myGender === "Male") {
        iMatchTheirPreference = true;
      } else if (otherUserPreference === "Female" && myGender === "Female") {
        iMatchTheirPreference = true;
      }

      let theyMatchMyPreference = false;
      if (myPreference === "Everyone") {
        theyMatchMyPreference = true;
      } else if (myPreference === "Male" && otherUserGender === "Male") {
        theyMatchMyPreference = true;
      } else if (myPreference === "Female" && otherUserGender === "Female") {
        theyMatchMyPreference = true;
      }

      return iMatchTheirPreference && theyMatchMyPreference;
    });

    return res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { activityType, location, dates, times, isActive } = req.body;

    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found or not authorized",
      });
    }

    if (activityType !== undefined) activity.activityType = activityType;
    if (location !== undefined) activity.location = location;
    if (dates !== undefined) activity.dates = dates;
    if (times !== undefined) activity.times = times;
    if (isActive !== undefined) activity.isActive = isActive;

    const updatedActivity = await activity.save();
    await updatedActivity.populate("userId", "firstName lastName");

    res.json({
      success: true,
      data: updatedActivity,
      message: "Activity updated successfully",
    });
  } catch (error) {
    console.error("Error updating activity:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found or not authorized",
      });
    }

    await Activity.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.post("/:id/toggle", authMiddleware, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found or not authorized",
      });
    }

    activity.isActive = !activity.isActive;
    const updatedActivity = await activity.save();

    res.json({
      success: true,
      data: updatedActivity,
      message: `Activity ${
        updatedActivity.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (error) {
    console.error("Error toggling activity:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
