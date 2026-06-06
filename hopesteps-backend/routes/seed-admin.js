require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./hopesteps-backend/models/User");

const MONGO_URI =
  "mongodb://ahmadmohmmafam417_db_user:zKd1CWmcgtl3s6yV@ac-lftczxz-shard-00-00.cntudye.mongodb.net:27017,ac-lftczxz-shard-00-01.cntudye.mongodb.net:27017,ac-lftczxz-shard-00-02.cntudye.mongodb.net:27017/hopesteps?ssl=true&replicaSet=atlas-534gqq-shard-0&authSource=admin";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  await User.deleteOne({ email: "ahmadmohmmaf.am417@gmail.com" });

  const admin = await User.create({
    name: "Admin",
    email: "ahmadmohmmaf.am417@gmail.com",
    password: "Ahmad12345@@",
    role: "admin",
    isActive: true,
    isVerified: true,
  });

  console.log("✅ Admin created:", admin.email);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
