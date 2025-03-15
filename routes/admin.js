const express = require("express");
const router = express.Router();
const reportsModel = require("../models/report.model");
const console = require("debug")("app:admin-route");
const userModel = require("../models/userModel");

router.get("/dashboard", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Welcome to the admin dashboard" });
});
// reports specific routes
router.use("/reports", require("./admin/reports"));
// user specific routes
router.use("/users", require("./admin/user"));
// ads specific routes
router.use("/ads", require("./admin/ads"));

module.exports = router;
