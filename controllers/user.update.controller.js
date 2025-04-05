const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const console = require("debug")("development:Update-auth");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const sendMessage = require("../utils/nodemail");
const {passwordResetLimiter} = require("../utils/rateLimiter");

const updatePassword = async (req, res, next) => {
  try {
    const { oldpassword, newpassword } = req.body;
    if (!oldpassword || !newpassword)
      return res
        .status(400)
        .json({
          success: false,
          message: "Old password and new password are required",
        });
    const user = await userModel.findById(req.user._id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const saltRounds = process.env.ROUNDS || 10;
    const match = await bcrypt.compare(oldpassword, user.password);
    if (!match)
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    const hash = await bcrypt.hash(newpassword, parseInt(saltRounds));
    await userModel.findByIdAndUpdate(req.user._id, { password: hash });
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console(err);
    res
      .status(500)
      .json({ success: false, message: "Error updating password" });
  }
};
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ email }).select("email status");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ 
        success: false, 
        message: "Your account is not active. Please contact customer support." 
      });
    }

    const messageHtml = `
      <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px; background: #121212; color: #ffffff;">
        <div style="max-width: 450px; margin: auto; background: #1e1e1e; padding: 25px; border-radius: 10px; 
            box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1); border: 1px solid #333;">
          <h2 style="color: #d4af37; margin-bottom: 15px;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #cccccc;">We received a request to reset your password.</p>
          <p style="font-size: 16px; color: #cccccc;">Use the following OTP to proceed with your password reset:</p>
          <h1 style="background: #d4af37; color: #1e1e1e; 
              display: inline-block; padding: 15px 30px; border-radius: 5px; font-size: 28px;
              letter-spacing: 3px; margin: 20px 0; font-weight: bold;">
              {{OTP}}
          </h1>
          <p style="color: #aaaaaa; font-size: 14px; margin-top: 10px;">This OTP is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
          <div style="margin-top: 20px;">
              <a href="#" style="background: #d4af37; color: #1e1e1e; text-decoration: none; padding: 12px 20px; 
              font-size: 16px; border-radius: 5px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(255, 223, 96, 0.3);">
              Reset Password</a>
          </div>
          <hr style="border: 0; height: 1px; background: #444; margin: 25px 0;">
          <p style="margin-top: 10px; font-size: 12px; color: #777;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    const response = await sendOtp(email, messageHtml);

    if (!response.success) {
      return res.status(500).json({ success: false, message: "Failed to send OTP" });
    }

    req.session.email = email;
    req.session.save();

    res.json({ success: true, message: "OTP sent successfully", email });

  } catch (err) {
    // console.error(err);
    res.status(500).json({ success: false, message: "Error resetting password" });
  }
};

module.exports = { forgotPassword };


module.exports = { updatePassword, forgotPassword };
