const express = require("express");
const userModel = require("../../models/userModel");
const upload = require("../../config/multer-config");
const cloudinary = require("../../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../../utils/otp.utils");
const sendMessage = require("../../utils/nodemail");
const console = require("debug")("development:mainroute");
const {isUser }= require("../../middlewares/isUser");
const router = express.Router();
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../../controllers/userAuth.controllers");
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const adsModel = require("../../models/ads.models");



router.post("/profile/image",isLoggedIn,isUser,upload.single("image"),async (req, res) => {
    try {
      const user = await userModel
        .findOne({ email: req.user.email })
        .select("-password");
      if (!user)
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      if (user.profileImage?.public_id) {
        await cloudinary.uploader.destroy(user.profileImage.public_id);
      }
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: "image" }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(req.file.buffer);
      });
      user.profileImage = {
        url: result.secure_url,
        public_id: result.public_id,  
      };
      await user.save();

      res.status(200).json({
        success: true,
        message: "Profile image updated successfully",
        profileImage: user.profileImage.url,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error, Image Uploading Failed",
      });
    }
  }
);
router.post("/recovery/mail", isLoggedIn, isUser,async (req, res) => {
  const { recoveryEmail } = req.body;
  if (!recoveryEmail)
    return res
      .status(400)
      .json({ success: false, message: "Recovery Email is required" });
  try {
    const messageHtml = `
    <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px; background: #121212; color: #ffffff;">
        <div style="max-width: 450px; margin: auto; background: #1e1e1e; padding: 25px; border-radius: 10px; 
            box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1); border: 1px solid #333;">
            <h2 style="color: #d4af37; margin-bottom: 15px;">Account Recovery OTP</h2>
            <p style="font-size: 16px; color: #cccccc;">Use the following OTP to recover your account:</p>
            <h1 style="background: #d4af37; color: #1e1e1e; 
                display: inline-block; padding: 15px 30px; border-radius: 5px; font-size: 28px;
                letter-spacing: 3px; margin: 20px 0; font-weight: bold;">
                {{OTP}}
            </h1>
            <p style="color: #aaaaaa; font-size: 14px; margin-top: 10px;">This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.</p>
            <div style="margin-top: 20px;">
                <a href="#" style="background: #d4af37; color: #1e1e1e; text-decoration: none; padding: 12px 20px; 
                font-size: 16px; border-radius: 5px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(255, 223, 96, 0.3);">
                Recover Account</a>
            </div>
            <hr style="border: 0; height: 1px; background: #444; margin: 25px 0;">
            <p style="margin-top: 10px; font-size: 12px; color: #777;">If you didn’t request this, please ignore this email.</p>
        </div>
    </div>
    <style>
        @media (prefers-color-scheme: light) {
            div {
                background: #f4f4f4 !important;
                color: #333 !important;
            }
            div > div {
                background: #ffffff !important;
                border-color: #ddd !important;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15) !important;
            }
            h2 {
                color: #ff8c00 !important;
            }
            p {
                color: #555 !important;
            }
            h1 {
                background: #ff8c00 !important;
                color: #fff !important;
            }
            a {
                background: #ff8c00 !important;
                color: #fff !important;
            }
            hr {
                background: #ddd !important;
            }
        }
    </style>
`;

    const otpResponse = await sendOtp(recoveryEmail, messageHtml);
    if (!otpResponse.success)
      return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP" });
    req.session.recoveryEmail = recoveryEmail;
    req.session.save();
    res.status(200).json({
      success: true,
      message: `OTP sent successfully at ${recoveryEmail}`,
      email: recoveryEmail,
    });
  } catch (err) {
    console(err)
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later",
    });
  }
});
router.post("/recovery/mail/verify", isLoggedIn, isUser,async (req, res) => {
  const { otp } = req.body;
  try {
    const recoveryEmail = req.session.recoveryEmail;
    if (!recoveryEmail)
      return res
        .status(400)
        .json({ success: false, message: "Recovery Email not found" });
    let check = await VerifyOtp(recoveryEmail, otp);
    if (check === "OTP verified") {
      const id = req.user._id;
      let user = await userModel
        .findOne({
          email: req.user.email,
        })
        .select("-password -profileImage");
      user.recoveryEmail = recoveryEmail;
      await user.save();
      const messageHtml = `
        <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px; background: #f4f4f4;">
      <div style="max-width: 450px; margin: auto; background: #ffffff; padding: 25px; border-radius: 10px; 
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15); border: 1px solid #ddd;">
          <h2 style="color: #007bff; margin-bottom: 15px;">Thank You for Using Our Services! 🙌</h2>
          <p style="font-size: 16px; color: #333;">We appreciate having you with us. Your support means everything!</p>
          <h3 style="color: #007bff; margin: 15px 0;">You’re an Amazing User! 🚀</h3>
          <p style="color: #555; font-size: 14px; margin-top: 10px;">
              If you ever need assistance or have any feedback, we’re here for you.
          </p>
          <div style="margin-top: 20px;">
              <a href="#" style="background: #007bff; color: #fff; text-decoration: none; padding: 12px 20px; 
              font-size: 16px; border-radius: 5px; display: inline-block;">Visit Our Website</a>
          </div>
          <hr style="border: 0; height: 1px; background: #ddd; margin: 25px 0;">
          <p style="margin-top: 10px; font-size: 12px; color: #888;">
              Need help? Feel free to reach out. We’re happy to assist you anytime.
          </p>
      </div>
  </div>
  `;
      sendMessage(recoveryEmail, "Recovery Email Added", messageHtml);
      res
        .status(200)
        .json({ success: true, message: "Recovery Email Added Successfully" });
    } else if (check === "Invalid OTP") {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    } else if (check === "OTP Expired") {
      res.status(400).json({ success: false, message: "OTP Expired" });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later",
      error: err,
    });
  }
});
router.post("/location", isLoggedIn,isUser, async (req, res) => {
  const { longitude, latitude } = req.body;
  if (!longitude || !latitude)
    return res
  .status(400)
  .json({ success: false, message: "Longitude and latitude are required" });
  
  try {
    await userModel.findByIdAndUpdate(req.user._id, {
      location: { type: "Point", coordinates: [longitude, latitude] },
    });
    res.json({ success: true, message: "Location updated successfully" });
  } catch (err) {
    res
    .status(500)
      .json({ success: false, message: "Error updating location" });
  }
});

module.exports = router;
