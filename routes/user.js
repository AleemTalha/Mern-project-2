const express = require("express");
const userModel = require("../models/userModel");
const upload = require("../config/multer-config");
const cloudinary = require("../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const sendMessage = require("../utils/nodemail");
const { isUser } = require("../middlewares/isUser");
const console = require("debug")("development:mainroute");
const router = express.Router();
const applicationModel = require("../models/application");
const { updatePassword } = require("../controllers/user.update.controller");
const {
  userLimiter,
  passwordResetLimiter,
  reportLimiter,
  loginLimiter,
  singleLimiter,
} = require("../utils/rateLimiter");
exports.router = router;
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../controllers/userAuth.controllers");
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const adsModel = require("../models/ads.models");


router.post("/login", loginLimiter, loginUser);
router.get("/profile", userLimiter, isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/application", async (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Application page is running" });
});
router.post("/application",reportLimiter, async (req, res) => {
  try {
    const { email, fullName, description } = req.body;
    const user = await userModel
      .findOne({ email })
      .select("email fullName _id status role");
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    if (user.role === "admin")
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Admin cannot apply for an account open Application. Admins not allowed",
        });
    if (user.status === "active")
      return res.status(400).json({
        success: false,
        message: "User already has an active account",
      });
    const application = new applicationModel({
      email,
      fullName,
      description,
      userId: user._id,
    });
    await application.save();
    res
      .status(200)
      .json({ success: true, message: "Application submitted successfully" });
  } catch (err) {
    console(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/logout", userLimiter, isLoggedIn, (req, res) => {
  res.clearCookie("token");
  req.session.destroy((err) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });

    res
      .status(200)
      .json({ success: true, message: "User logged out successfully" });
  });
});
router.post("/password-reset", userLimiter, isLoggedIn, isUser, updatePassword);
router.use("/dashboard", userLimiter, require("./users/user-dashboard"));
router.use("/update", userLimiter, require("./users/user.updates"));
router.use("/register", userLimiter, require("./users/user-registration"));
router.use("/forgot", userLimiter, require("./users/user-forgot"));
router.use(
  "/post",
  userLimiter,
  isLoggedIn,
  isUser,
  require("./users/user-posts")
);
router.get("/limiter", singleLimiter, (req, res) => {
  res.json({
    message: "You can only perform this action once every 15 minutes.",
  });
});

module.exports = router;
