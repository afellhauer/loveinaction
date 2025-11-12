const express = require('express');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const Profile = require('../models/Profile');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

const router = express.Router();

// GET /api/images/profile/:filename
// Serves profile pictures only to authenticated users with proper permissions
router.get('/profile/:filename', authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;
    const requestingUserId = req.user._id;

    // Validate filename format (security check)
    if (!/^profile-\d+-\d+\.(jpg|jpeg|png|gif)$/i.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }

    // Find which user this profile picture belongs to
    // Try both relative and absolute URL formats
    const relativeUrl = `/uploads/${filename}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    
    const profile = await Profile.findOne({ 
      $or: [
        { profilePicUrl: relativeUrl },
        { profilePicUrl: absoluteUrl },
        { profilePicUrl: { $regex: filename } } // Fallback: filename appears in URL
      ]
    }).populate('user');
    
    
    if (!profile) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageOwnerUserId = profile.user._id;

    // Security Check 1: Users can always view their own images
    if (requestingUserId.toString() === imageOwnerUserId.toString()) {
      return serveImageFile(filename, res);
    }

    // Security Check 2: Cannot view deactivated user's images
    if (!profile.user.isActive) {
      return res.status(403).json({ error: 'Cannot access deactivated user\'s image' });
    }

    // Security Check 3: Check if either user has blocked the other
    const blockExists = await BlockedUser.findOne({
      $or: [
        { blockerId: requestingUserId, blockedUserId: imageOwnerUserId },
        { blockerId: imageOwnerUserId, blockedUserId: requestingUserId }
      ]
    });

    if (blockExists) {
      return res.status(403).json({ error: 'Cannot access blocked user\'s image' });
    }

    // Security Check 4: Only serve to users who can see this profile
    // (This could be expanded based on your app's privacy settings)
    // For now, authenticated users who aren't blocked can view images
    
    return serveImageFile(filename, res);

  } catch (error) {
    console.error('Error serving profile image:', error);
    return res.status(500).json({ error: 'Server error serving image' });
  }
});

// GET /api/images/profile/:filename/public
// Public endpoint for profile previews (heavily restricted)
router.get('/profile/:filename/public', async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename format
    if (!/^profile-\d+-\d+\.(jpg|jpeg|png|gif)$/i.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }

    // Find the profile
    const relativeUrl = `/uploads/${filename}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    
    const profile = await Profile.findOne({ 
      $or: [
        { profilePicUrl: relativeUrl },
        { profilePicUrl: absoluteUrl },
        { profilePicUrl: { $regex: filename } }
      ]
    }).populate('user');
    
    if (!profile) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Only serve if user is active and has made their profile public
    if (!profile.user.isActive) {
      return res.status(403).json({ error: 'Profile not available' });
    }

    // Optional: Add additional privacy checks here
    // e.g., only if user has enabled "public profile" setting

    return serveImageFile(filename, res);

  } catch (error) {
    console.error('Error serving public profile image:', error);
    return res.status(500).json({ error: 'Server error serving image' });
  }
});

// Helper function to serve the actual file
function serveImageFile(filename, res) {
  const filePath = path.join(__dirname, '../uploads', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found on disk' });
  }

  // Set appropriate cache headers
  res.set({
    'Cache-Control': 'private, max-age=3600', // Cache for 1 hour, private only
    'Content-Type': getContentType(filename)
  });

  // Serve the file
  res.sendFile(filePath);
}

// Helper function to get content type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

module.exports = router; 