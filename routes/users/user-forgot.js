const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const { forgotPassword } = require("../../controllers/user.update.controller");
const { VerifyOtp, sendOtp } = require("../../utils/otp.utils");
const console = require("debug")("development:Forgot-auth");
const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const sendMessage = require("../../utils/nodemail");
const { passwordResetLimiter } = require("../../utils/rateLimiter");

router.post("/password", forgotPassword);

router.get("/resend/otp", async (req, res) => {
  let email = req.session.email;
  if (!email) {
    email = req.body.email;
  }
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Session expired or invalid request. Please request a new OTP.",
    });
  }

  try {
    let response = await sendOtp(email);

    if (response.success) {
      return res.json({
        success: true,
        message:
          "A new OTP has been sent to your registered email. Please check your inbox.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message:
        "Something went wrong while resending the OTP. Please try again.",
    });
  }
});

router.post("/password/verify", async (req, res) => {
  const email = req.session.email;
  const { otp } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Session expired or invalid request. Please request a new OTP.",
    });
  }

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "Please enter the OTP to proceed.",
    });
  }

  try {
    let response = await VerifyOtp(email, otp);

    if (response === "OTP verified") {
      req.session.verifiedForgotEmail = email;
      req.session.save();

      return res.json({
        success: true,
        message: "OTP verified successfully! You can now reset your password.",
      });
    }

    if (response === "Invalid OTP") {
      return res.status(400).json({
        success: false,
        message: "The OTP you entered is incorrect. Please try again.",
      });
    }

    if (response === "OTP Expired") {
      return res.status(400).json({
        success: false,
        message: "Your OTP has expired. Please request a new one.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to verify OTP. Please try again.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message:
        "Something went wrong while verifying the OTP. Please try again later.",
    });
  }
});

router.post("/password/reset/entry", passwordResetLimiter, async (req, res) => {
  const { password } = req.body;
  const email = req.session.verifiedForgotEmail;

  if (!password || !email) {
    passwordResetLimiter.resetKey(req.ip);
    return res.status(400).json({
      success: false,
      message: "Invalid request. Please provide a new password.",
    });
  }

  try {
    const user = await userModel.findOne({ email }).select("password");
    if (!user) {
      passwordResetLimiter.resetKey(req.ip);
      return res.status(404).json({
        success: false,
        message: "User not found. Please request a new password reset.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      passwordResetLimiter.resetKey(req.ip);
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your previous password.",
      });
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    await userModel.findByIdAndUpdate(
      user._id,
      { password: hash },
      { new: true }
    );
    res.json({
      success: true,
      message: "Your password has been updated successfully!",
    });
  } catch (err) {
    passwordResetLimiter.resetKey(req.ip);
    res.status(500).json({
      success: false,
      message:
        "Something went wrong while updating your password. Please try again later.",
    });
  }
});

module.exports = router;
