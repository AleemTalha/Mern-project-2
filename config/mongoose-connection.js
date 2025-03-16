const mongoose = require("mongoose");
const debug = require("debug")("development:db");
const users = require("../models/userModel");
const ads = require("../models/ads.models");
const reports = require("../models/report.model");
const superAdmin = require("../models/super.model");
const applications = require("../models/application");
const config = require("config");

let Mongo_URI = config.get("MONGO_URI");
Mongo_URI = Mongo_URI.replace("<db_password>", process.env.DB_PASSWORD);
Mongo_URI = Mongo_URI.replace("<dbname>", process.env.DB_NAME);

mongoose.connect(Mongo_URI, {
})
  .then(async () => {
    debug("Connected to database");

    // await ads.syncIndexes();
    // await applications.syncIndexes();
    // await reports.syncIndexes();
    // await superAdmin.syncIndexes();
    // await users.syncIndexes();

    debug("Indexes synchronized");
  })
  .catch(err => {
    debug("Database connection error:", err);
  });

module.exports = mongoose; 
