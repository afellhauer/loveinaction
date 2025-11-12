// middleware/obfuscateResponse.js

console.log("🔥 obfuscateResponse.js file loaded!");

const obfuscateResponse = (req, res, next) => {
  const shouldObfuscate = process.env.OBFUSCATE_RESPONSES === "true";
  const isTestEnvironment = process.env.NODE_ENV === "test";

  // Skip obfuscation during tests to avoid breaking test assertions
  if (!shouldObfuscate || isTestEnvironment) {
    return next();
  }

  const originalJson = res.json;

  res.json = function (data) {
    // Use req.originalUrl which has the full path
    const willObfuscate = shouldObfuscateRoute(req.originalUrl);

    if (willObfuscate) {
      const jsonString = JSON.stringify(data);
      const base64Data = Buffer.from(jsonString).toString("base64");

      res.setHeader("X-Response-Obfuscated", "true");

      return originalJson.call(this, {
        obfuscated: true,
        data: base64Data,
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

const shouldObfuscateRoute = (url) => {
  if (!url) return false;

  const sensitiveRoutes = [
    "/api/matches",
    "/api/profile",
    "/api/activities",
    "/api/messages",
    "/api/swipes",
  ];

  return sensitiveRoutes.some((route) => url.includes(route));
};

module.exports = { obfuscateResponse };
