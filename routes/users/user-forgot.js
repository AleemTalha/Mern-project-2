const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const { forgotPassword } = require("../../controllers/user.update.controller");
const { VerifyOtp, sendOtp } = require("../../utils/otp.utils");
const console = require("debug")("development:Forgot-auth");
const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const sendMessage = require("../../utils/nodemail");
const {passwordResetLimiter} = require("../../utils/rateLimiter");

router.post("/password", forgotPassword);
router.get("/resend/otp", async (req, res) => {
    const email = req.session.email;
    if (!email) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }
    try {
      let response = await sendOtp(email);
      if (response.success) {
        return res.json({ success: true, message: "OTP resent successfully" });
      } else {
        return res.status(400).json({ success: false, message: response.message });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
router.post("/password/verify", async (req, res) => {
  const email = req.session.email;
  const { otp } = req.body;
  if (!otp || !email) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }
  try {
    let response = await VerifyOtp(email, otp);
    if (response === "OTP verified") {
      req.session.verifiedforgotEmail = email;
      req.session.save();
      
      return res.json({ success: true, message: "OTP verified" });
    } else if (response === "Invalid OTP") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    } else if (response === "OTP Expired") {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.post("/password/reset/entry", async (req, res) => {
  const { password } = req.body;
  const email = req.session.verifiedforgotEmail;
  // console(email)
  if (!password || !email) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }
  try {
    const user = await userModel.findOne({ email }).select("password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const saltRounds = parseInt(process.env.ROUNDS) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await userModel.findByIdAndUpdate(
      user._id,
      { password: hash },
      { new: true }
    );
    delete req.session.verifiedforgotEmail;
    passwordResetLimiter(req, res, () => {});
    const message = `
      <div class="container">
    <h2>🔐 Password Changed Successfully</h2>
    <p>Your account password has been updated successfully. If this was you, no further action is required.</p>
    <p>If you did not request this change, please reset your password immediately or contact support.</p>
    <div class="footer">
        <p>Stay secure,</p>
        <p><strong>[Your Website Name]</strong></p>
    </div>
</div>

<style>
    .container {
        max-width: 600px;
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        text-align: center;
    }
    h2 {
        color: #003ebb;
    }
    p {
        color: #555;
        font-size: 16px;
    }
    .footer {
        margin-top: 20px;
        font-size: 14px;
        color: #888;
    }
</style>
`;  
    await sendMessage(email, "Password Changed", message);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
