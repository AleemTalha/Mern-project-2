const express = require("express");
const userModel = require("../models/userModel");
const upload = require("../config/multer-config");
const cloudinary = require("../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const sendMessage = require("../utils/nodemail");
const console = require("debug")("development:mainroute");
const router = express.Router();
const {updatePassword} = require("../controllers/user.update.controller")   
const {userLimiter, passwordResetLimiter, loginLimiter, singleLimiter} = require("../utils/rateLimiter");
exports.router = router;
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../controllers/userAuth.controllers");
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const adsModel = require("../models/ads.models");


router.post("/login",loginLimiter, loginUser);
router.get("/profile",userLimiter, isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.find({ email: req.user.email });
    if (!user)
      return res
    .status(400)
        .json({ success: false, message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/logout",userLimiter, isLoggedIn, (req, res) => {
  res.clearCookie("token"); 
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: "Internal Server Error" });

    res.status(200).json({ success: true, message: "User logged out successfully" });
  });
});
router.post("/password-reset",userLimiter, isLoggedIn, updatePassword);
router.use("/dashboard",userLimiter, require("./users/user-dashboard"));
router.use("/update",userLimiter, require("./users/user.updates"));
router.use("/register",loginLimiter, require("./users/user-registration"));
router.use("/forgot",userLimiter, require("./users/user-forgot"));
router.use("/post",userLimiter,isLoggedIn, require("./users/user-posts"));
router.get("/limiter", singleLimiter, (req, res) => {
  res.json({ message: "You can only perform this action once every 15 minutes." });
});

module.exports = router;
