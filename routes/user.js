const express = require("express");
const userModel = require("../models/userModel");
const upload = require("../config/multer-config");
const cloudinary = require("../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const sendMessage = require("../utils/nodemail");
const console = require("debug")("development:mainroute");
const router = express.Router();
const {updatePassword} = require("../controllers/user.update.controller")    
exports.router = router;
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../controllers/userAuth.controllers");
const { isLoggedIn } = require("../middlewares/isLoggedIn");
const adsModel = require("../models/ads.models");

router.post("/login", loginUser);
router.get("/profile", isLoggedIn, async (req, res) => {
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
router.post("/password-reset", isLoggedIn, updatePassword);
router.use("/dashboard", require("./users/user-dashboard"));
router.use("/update", require("./users/user.updates"));
router.use("/register", require("./users/user-registration"));
router.use("/forgot", require("./users/user-forgot"));
router.use("/post",isLoggedIn, require("./users/user-posts"));

module.exports = router;
