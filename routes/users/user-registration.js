const express = require("express");
const userModel = require("../../models/userModel");
const upload = require("../../config/multer-config");
const cloudinary = require("../../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../../utils/otp.utils");
const sendMessage = require("../../utils/nodemail");
const console = require("debug")("development:mainroute");
const {otpLimiter } = require("../../utils/rateLimiter");
const router = express.Router();
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../../controllers/userAuth.controllers");
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const adsModel = require("../../models/ads.models");

router.post("/",otpLimiter, registerUser);
router.post("/verify", VerifyRegistration);
router.post("/credentials", getRegistered);

module.exports = router;



