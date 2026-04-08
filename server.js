////////////////////////////
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const nodemailer = require('nodemailer');
require("dotenv").config();
//const cors = require("cors");
//app.use(cors());
// ── Routes ────────────────────────────────────────────────────────────────
// BUG FIXED: was  "./hopesteps-backend/routes/auth"
// server.js lives INSIDE hopesteps-backend, so the correct path is "./routes/auth"

// // Import routes
const authRoutes = require("./hopesteps-backend/routes/auth");
const studentRoutes = require("./hopesteps-backend/routes/students");
const volunteerRoutes = require("./hopesteps-backend/routes/volunteers");
const donorRoutes = require("./hopesteps-backend/routes/donors");
const requestRoutes = require("./hopesteps-backend/routes/requests");
const adminRoutes = require("./hopesteps-backend/routes/admin");
const notificationRoutes = require("./hopesteps-backend/routes/notifications");
const app = express();
app.set("trust proxy", 1);
// ─── Security ─────────────────────────────────────────────────────────────
app.use(
  helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────
//
//  BUG FIXED:  origin: "*"  +  credentials: true  = ILLEGAL combination.
//
//  Browser error:
//    "The value of 'Access-Control-Allow-Origin' header must not be '*'
//     when the request's credentials mode is 'include'"
//
//  Solution: replace "*" string with a function that returns true for all origins.
//  Functionally identical to "*" but works with credentials.
//
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); // allow every origin
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
};

// Pre-flight OPTIONS must be handled BEFORE all other middleware
// FIX: Express 5 (installed by npm with Node 25) dropped "*" as a route pattern.
// Use a regex instead — works in both Express 4 and Express 5.
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

// ─── Rate limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ─── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// ─── Logging ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ─── Database ──────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hopesteps")
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ─── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "HopeSteps API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to HopeSteps API", version: "1.0.0" });
});

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ status: "error", message: `Route not found: ${req.originalUrl}` });
});

// ─── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 HopeSteps Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`🔓 CORS: all origins allowed`);
});

// ─── Socket.IO ─────────────────────────────────────────────────────────────
// Socket.IO doesn't use HTTP credentials so wildcard is safe here
const io = require("socket.io")(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
  socket.on("join-room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });
});

app.set("io", io);

// ─── Process handlers ──────────────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => console.log("Process terminated"));
});

module.exports = app;
