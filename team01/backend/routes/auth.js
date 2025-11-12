// 📁 backend/routes/auth.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendVerificationEmail = require("../utils/sendVerificationEmail");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Helper to generate JWTs
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // short‐lived access token
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" } // refresh token valid for 7 days
  );
}

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

// Helper function to validate date of birth
function validateDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) {
    return { isValid: false, error: "Date of birth is required" };
  }

  const dob = new Date(dateOfBirth);

  // Check if date is valid
  if (isNaN(dob.getTime())) {
    return { isValid: false, error: "Invalid date of birth format" };
  }

  // Check if date is not in the future
  const today = new Date();
  if (dob > today) {
    return { isValid: false, error: "Date of birth cannot be in the future" };
  }

  // Check if person is at least 18 years old
  const age = calculateAge(dob);
  if (age < 18) {
    return {
      isValid: false,
      error: "You must be 18 or older to create an account",
    };
  }

  // Check if age is reasonable (not older than 120)
  if (age > 120) {
    return { isValid: false, error: "Please enter a valid date of birth" };
  }

  return { isValid: true, age: age };
}

// ---------------------------------------
// POST /api/auth/signup
// ---------------------------------------
router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password, dateOfBirth } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!firstName || !lastName) {
    return res
      .status(400)
      .json({ error: "First name and last name are required" });
  }

  // Validate date of birth
  const dobValidation = validateDateOfBirth(dateOfBirth);
  if (!dobValidation.isValid) {
    return res.status(400).json({ error: dobValidation.error });
  }

  try {
    // 1) Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // 2) Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3) Create a random verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");

    // 4) Create and save the user (unverified)
    const newUser = new User({
      firstName,
      lastName,
      email,
      passwordHash,
      dateOfBirth: new Date(dateOfBirth), // Store the date of birth
      verifyToken,
      isVerified: false,
    });
    await newUser.save();

    // 5) Send verification email
    await sendVerificationEmail(email, verifyToken);

    res.status(201).json({
      message:
        "User registered. Please check your email to verify your account.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        age: dobValidation.age,
        dateOfBirth: newUser.dateOfBirth,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);

    // Handle specific validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }

    res.status(500).json({ error: "Server error during signup" });
  }
});

// ---------------------------------------
// GET /api/auth/verify/:token
// ---------------------------------------
router.get("/verify/:token", async (req, res) => {
  const { token } = req.params;

  try {
    // 1) Find the user with this verifyToken
    const user = await User.findOne({ verifyToken: token });
    if (!user) {
      return res
        .status(400)
        .send("<h2>Invalid or expired verification link.</h2>");
    }

    // 2) Mark as verified and remove the token
    user.isVerified = true;
    user.verifyToken = null;
    await user.save();

    // 3) Redirect to React's "/verify-success" page
    return res.redirect(`${process.env.FRONTEND_URL}/verify-success`);
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).send("<h2>Server error while verifying email.</h2>");
  }
});

// ---------------------------------------
// POST /api/auth/login
// ---------------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // 1) Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 2) Check that user is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ error: "Please verify your email before logging in." });
    }

    // 3) Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 4) Check if account is deactivated
    if (!user.isActive) {
      return res.status(403).json({ 
        error: "Account is deactivated",
        code: "ACCOUNT_DEACTIVATED",
        message: "Your account has been deactivated. Use the reactivate endpoint to restore your account.",
        deactivatedAt: user.deactivatedAt
      });
    }

    // 5) Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 6) Save refresh token to user document
    user.refreshTokens.push(refreshToken);
    await user.save();

    // 7) Return tokens and basic user info (now including DOB and age)
    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        age: calculateAge(user.dateOfBirth),
        isIdVerified: user.isIdVerified || false,
        verificationStatus: user.verificationStatus || "not_submitted",
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ---------------------------------------
// POST /api/auth/refresh
// ---------------------------------------
router.post("/refresh", async (req, res) => {
  const { token: incomingRefreshToken } = req.body;

  if (!incomingRefreshToken) {
    return res.status(401).json({ error: "Refresh token needed" });
  }

  try {
    // 1) Verify the refresh token
    const payload = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // 2) Fetch the user and confirm that this refresh token is in their array
    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(incomingRefreshToken)) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // 3) Generate a new access token
    const newAccessToken = generateAccessToken(user);

    // (OPTIONAL) You could also generate a new refresh token here and replace it
    //    const newRefreshToken = generateRefreshToken(user);
    //    user.refreshTokens = user.refreshTokens.filter(rt => rt !== incomingRefreshToken);
    //    user.refreshTokens.push(newRefreshToken);
    //    await user.save();
    //    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });

    // For simplicity, return only a new access token
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});

// ---------------------------------------
// GET /api/auth/me (Get current user info)
// ---------------------------------------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-passwordHash -refreshTokens -verifyToken"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        age: calculateAge(user.dateOfBirth),
        isVerified: user.isVerified,
        isIdVerified: user.isIdVerified || false,
        verificationStatus: user.verificationStatus || "not_submitted",
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt,
        reactivatedAt: user.reactivatedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Get user info error:", err);
    res.status(500).json({ error: "Server error fetching user info" });
  }
});

// ---------------------------------------
// POST /api/auth/deactivate (Deactivate user account)
// ---------------------------------------
router.post("/deactivate", authMiddleware, async (req, res) => {
  const { reason, password } = req.body;

  try {
    // Get the current user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if account is already deactivated
    if (!user.isActive) {
      return res.status(400).json({ error: "Account is already deactivated" });
    }

    // Verify password for security
    if (!password) {
      return res.status(400).json({ error: "Password confirmation required for account deactivation" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Deactivate the account
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || "User requested deactivation";
    user.refreshTokens = []; // Clear all refresh tokens (log out from all devices)
    
    await user.save();

    res.json({
      message: "Account deactivated successfully",
      deactivatedAt: user.deactivatedAt,
      reason: user.deactivationReason
    });

  } catch (err) {
    console.error("Account deactivation error:", err);
    res.status(500).json({ error: "Server error during account deactivation" });
  }
});

// ---------------------------------------
// POST /api/auth/reactivate (Reactivate account during login)
// ---------------------------------------
router.post("/reactivate", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email (including deactivated users)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check that user is verified
    if (!user.isVerified) {
      return res.status(403).json({ error: "Please verify your email before reactivating your account." });
    }

    // Check if account is deactivated
    if (user.isActive) {
      return res.status(400).json({ error: "Account is already active. Please use the regular login endpoint." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Reactivate the account
    user.isActive = true;
    user.reactivatedAt = new Date();
    user.deactivationReason = null; // Clear the deactivation reason
    user.refreshTokens = []; // Clear any old refresh tokens

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save new refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      message: "Account reactivated successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        age: calculateAge(user.dateOfBirth),
        isIdVerified: user.isIdVerified || false,
        verificationStatus: user.verificationStatus || "not_submitted",
        isActive: user.isActive,
        reactivatedAt: user.reactivatedAt,
      },
      accessToken,
      refreshToken,
    });

  } catch (err) {
    console.error("Account reactivation error:", err);
    res.status(500).json({ error: "Server error during account reactivation" });
  }
});

module.exports = router;
