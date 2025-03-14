const mongoose = require("mongoose");
const console = require("debug")("development:db");
const users = require("../models/userModel");
const ads = require("../models/ads.models");
const reports = require("../models/report.model");
const config = require("config");

module.exports = mongoose.connect(config.get("MONGO_URI"))
  .then(async () => {
    console("Connected to database");
    // await users.syncIndexes();
    // await ads.syncIndexes();
    // await reports.syncIndexes();
    // console("Indexes synchronized");
  })
  .catch(err => {
    console("Database connection error:", err);
  });
