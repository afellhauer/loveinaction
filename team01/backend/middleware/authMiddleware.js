// 📁 backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // optional: verify user still exists and is active
    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        error: "Account is deactivated", 
        code: "ACCOUNT_DEACTIVATED",
        message: "Your account has been deactivated. You can reactivate it by logging in again."
      });
    }
    
    req.user = { _id: user._id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
