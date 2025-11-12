const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../utils/multer");
const Profile = require("../models/Profile");
const User = require("../models/User");
const BlockedUser = require("../models/BlockedUser");
const Rating = require("../models/Rating");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Helper function to calculate age from date of birth
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// POST /api/profile
// Create or update the user's profile
router.post(
  "/",
  authMiddleware,
  (req, res, next) => {
    upload.single("profilePic")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const userId = req.user._id;
    const {
      age,
      dateOfBirth,
      location,
      gender,
      pronouns,
      occupation,
      education,
      bio,
      q1,
      q1Text,
      instagram,
      snapchat,
      tiktok,
      preference,
      removeProfilePic,
    } = req.body;

    try {
      const existingProfile = await Profile.findOne({ user: userId });
      const user = await User.findById(userId);

      let finalAge = parseInt(age) || 18;
      let userDateOfBirth = user.dateOfBirth;

      if (dateOfBirth) {
        const dobDate = new Date(dateOfBirth);
        if (!isNaN(dobDate.getTime())) {
          user.dateOfBirth = dobDate;
          userDateOfBirth = dobDate;
          finalAge = calculateAge(dobDate);
        }
      } else if (userDateOfBirth) {
        finalAge = calculateAge(userDateOfBirth);
      }

      // --- Trusted Contact & Auto Notify ---
      if (req.body.trustedContactName !== undefined || req.body.trustedContactEmail !== undefined) {
        user.trustedContact = {
          name: req.body.trustedContactName || "",
          email: req.body.trustedContactEmail || ""
        };
      }
      if (req.body.autoNotifyTrustedContact !== undefined) {
        user.autoNotifyTrustedContact = req.body.autoNotifyTrustedContact === "true" || req.body.autoNotifyTrustedContact === true;
      }
      await user.save();

      const profileData = {
        user: userId,
        age: finalAge,
        location: location || "",
        gender: gender || "",
        pronouns: pronouns || "",
        occupation: occupation || "",
        education: education || "",
        bio: bio || "",
        q1: q1 || "",
        q1Text: q1Text || "",
        socialMedia: {
          instagram: instagram || "",
          snapchat: snapchat || "",
          tiktok: tiktok || "",
        },
        preference: preference || "Everyone",
      };

      // Handle profile picture upload
      if (req.file) {
        // Delete old profile picture if it exists
        if (existingProfile && existingProfile.profilePicUrl) {
          const oldImagePath =
            existingProfile.profilePicUrl.split("/uploads/")[1];
          if (oldImagePath) {
            const fullOldPath = path.join(
              __dirname,
              "../uploads",
              oldImagePath
            );
            try {
              if (fs.existsSync(fullOldPath)) {
                fs.unlinkSync(fullOldPath);
              }
            } catch (deleteErr) {
              console.error("Error deleting old image:", deleteErr);
            }
          }
        }

        // Set new profile picture URL
        profileData.profilePicUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/${req.file.filename}`;
      } else if (removeProfilePic === "true") {
        // User wants to remove profile picture
        if (existingProfile && existingProfile.profilePicUrl) {
          const oldImagePath =
            existingProfile.profilePicUrl.split("/uploads/")[1];
          if (oldImagePath) {
            const fullOldPath = path.join(
              __dirname,
              "../uploads",
              oldImagePath
            );
            try {
              if (fs.existsSync(fullOldPath)) {
                fs.unlinkSync(fullOldPath);
              }
            } catch (deleteErr) {
              console.error("Error deleting old image:", deleteErr);
            }
          }
        }
        // Set profile picture URL to null/empty
        profileData.profilePicUrl = null;
      } else if (existingProfile) {
        // Keep existing profile picture if no new one uploaded and not removing
        profileData.profilePicUrl = existingProfile.profilePicUrl;
      }

      // Upsert: create if missing, otherwise update
      const profile = await Profile.findOneAndUpdate(
        { user: userId },
        profileData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json(profile);
    } catch (err) {
      console.error("Profile save error:", err);

      // Clean up uploaded file if database operation failed
      if (req.file) {
        try {
          const filePath = path.join(
            __dirname,
            "../uploads",
            req.file.filename
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteErr) {
          console.error("Error cleaning up uploaded file:", deleteErr);
        }
      }

      res.status(500).json({ error: "Server error saving profile" });
    }
  }
);

// GET /api/profile/me
// Fetch the current user's profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).populate(
      "user",
      "firstName lastName email dateOfBirth isIdVerified verificationStatus trustedContact autoNotifyTrustedContact"
    );

    if (!profile) {
      const me = await User.findById(req.user._id).select(
        "firstName lastName email dateOfBirth isIdVerified verificationStatus trustedContact autoNotifyTrustedContact"
      );
      return res.json({
        user: {
          id: me._id,
          firstName: me.firstName,
          lastName: me.lastName,
          email: me.email,
          dateOfBirth: me.dateOfBirth,
          age: me.dateOfBirth ? calculateAge(me.dateOfBirth) : null,
          isIdVerified: me.isIdVerified,
          verificationStatus: me.verificationStatus,
          trustedContact: me.trustedContact,
          autoNotifyTrustedContact: me.autoNotifyTrustedContact,
        },
        profile: null,
      });
    }

    const ratingsCount = await Rating.countDocuments({ ratee: profile.user._id });

    return res.json({
      user: {
        id: profile.user._id,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
        dateOfBirth: profile.user.dateOfBirth,
        age: profile.user.dateOfBirth
          ? calculateAge(profile.user.dateOfBirth)
          : profile.age,
        isIdVerified: profile.user.isIdVerified,
        verificationStatus: profile.user.verificationStatus,
        trustedContact: profile.user.trustedContact,
        autoNotifyTrustedContact: profile.user.autoNotifyTrustedContact,
      },
      profile: {
        age: profile.age,
        location: profile.location,
        gender: profile.gender,
        pronouns: profile.pronouns,
        occupation: profile.occupation,
        education: profile.education,
        bio: profile.bio,
        profilePicUrl: profile.profilePicUrl,
        q1: profile.q1,
        q1Text: profile.q1Text,
        socialMedia: profile.socialMedia,
        preference: profile.preference,
        safetyScore: profile.safetyScore,
        badges: profile.badges,
        ratingsCount,
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Server error fetching profile" });
  }
});

// GET /api/profile/:userId
// Fetch another user's profile (public view)
router.get("/:userId", authMiddleware, async (req, res) => {
  const userId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // check if either user has blocked the other
    const blockExists = await BlockedUser.findOne({
      $or: [
        { blockerId: req.user._id, blockedUserId: userId },
        { blockerId: userId, blockedUserId: req.user._id }
      ]
    });

    if (blockExists) {
      return res.status(403).json({ error: "Cannot access blocked user's profile" });
    }

    const profile = await Profile.findOne({ user: userId }).populate(
      "user",
      "firstName lastName dateOfBirth isIdVerified isActive"
    );

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Check if the user's account is active
    if (!profile.user.isActive) {
      return res.status(403).json({ error: "Cannot access deactivated user's profile" });
    }

    const ratingsCount = await Rating.countDocuments({ ratee: profile.user._id });

    return res.json({
      user: {
        id: profile.user._id,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        age: profile.user.dateOfBirth
          ? calculateAge(profile.user.dateOfBirth)
          : profile.age,
        isIdVerified: profile.user.isIdVerified, // Show verification status to other users
      },
      profile: {
        age: profile.age,
        location: profile.location,
        gender: profile.gender,
        pronouns: profile.pronouns,
        occupation: profile.occupation,
        education: profile.education,
        bio: profile.bio,
        profilePicUrl: profile.profilePicUrl,
        q1: profile.q1,
        q1Text: profile.q1Text,
        socialMedia: profile.socialMedia,
        preference: profile.preference,
        safetyScore: profile.safetyScore,
        badges: profile.badges,
        ratingsCount: typeof ratingsCount === 'number' ? ratingsCount : 0,
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Server error fetching profile" });
  }
});

// PUT /api/profile/sync-age
// Sync age with date of birth (utility endpoint)
router.put("/sync-age", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.dateOfBirth) {
      return res.status(400).json({ error: "User or date of birth not found" });
    }

    const calculatedAge = calculateAge(user.dateOfBirth);

    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { age: calculatedAge },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({
      message: "Age synchronized with date of birth",
      age: calculatedAge,
      dateOfBirth: user.dateOfBirth,
    });
  } catch (err) {
    console.error("Age sync error:", err);
    res.status(500).json({ error: "Server error syncing age" });
  }
});

// PUT /api/profile/trusted-contact
// Update user's trusted contact information
router.put("/trusted-contact", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format for trusted contact",
      });
    }

    // Update the user's trusted contact
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        "trustedContact.name": name || "",
        "trustedContact.email": email || "",
      },
      { new: true, select: "trustedContact" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Trusted contact updated successfully",
      data: {
        trustedContact: user.trustedContact,
      },
    });
  } catch (error) {
    console.error("Error updating trusted contact:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating trusted contact",
      error: error.message,
    });
  }
});

// GET /api/profile/trusted-contact
// Get user's trusted contact information
router.get("/trusted-contact", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("trustedContact");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        trustedContact: user.trustedContact || { name: "", email: "" },
      },
    });
  } catch (error) {
    console.error("Error fetching trusted contact:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching trusted contact",
      error: error.message,
    });
  }
});

// DELETE /api/profile/trusted-contact
// Remove user's trusted contact information
router.delete("/trusted-contact", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        "trustedContact.name": "",
        "trustedContact.email": "",
      },
      { new: true, select: "trustedContact" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Trusted contact removed successfully",
      data: {
        trustedContact: user.trustedContact,
      },
    });
  } catch (error) {
    console.error("Error removing trusted contact:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing trusted contact",
      error: error.message,
    });
  }
});

module.exports = router;
