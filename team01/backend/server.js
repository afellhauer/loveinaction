require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.url}`);
  next();
});

// MIDDLEWARE
app.use(cors({
  origin: "http://localhost:8080",
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.set("io", io);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MONGOOSE CONNECTION
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const { obfuscateResponse } = require("./middleware/obfuscateResponse");
app.use("/api", obfuscateResponse);

// Mount the activities router under /api/activities
app.use("/api/activities", require("./routes/activities"));
app.use("/api/swipes", require("./routes/swipes"));

const matchesRouter = require("./routes/matches")(io);
app.use("/api/matches", matchesRouter);

app.use("/api/profile", require("./routes/profile"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ratings", require("./routes/ratings"));

const blockRoutes = require("./routes/blockedUsers")(io);
app.use("/api/blocked-users", blockRoutes);

const verificationRoutes = require("./routes/verification");
app.use("/api", verificationRoutes);

// Mount the protected images router
const imagesRouter = require("./routes/images");
app.use("/api/images", imagesRouter);

// SOCKET.IO
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinMatch", (matchId) => {
    socket.join(matchId);
    console.log(`Socket ${socket.id} joined room ${matchId}`);
  });

  socket.on("joinUserRoom", (userId) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined user room ${userId}`);
  });

  socket.on("leaveMatch", (matchId) => {
    socket.leave(matchId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// TEST ROUTE
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// START SERVER
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
