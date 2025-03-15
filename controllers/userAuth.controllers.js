const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const console = require("debug")("development:auth");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const {
  generateAccessToken,
  generateAccessTokenAdmin,
} = require("../utils/jwt");

const registerUser = async (req, res, next) => {
  try {
    let { email, firstname, surname } = req.body;
    let username = firstname + " " + surname;
    const flag = await userModel.findOne({ email });
    if (flag)
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    if (!email || !username)
      return res
        .status(400)
        .json({ success: false, message: "Email and username are required" });
    const messageHtml = `
        <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px; background: #121212; color: #ffffff;">
    <div style="max-width: 450px; margin: auto; background: #1e1e1e; padding: 25px; border-radius: 10px; 
        box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1); border: 1px solid #333;">
        <h2 style="color: #d4af37; margin-bottom: 15px;">Your OTP Code</h2>
        <p style="font-size: 16px; color: #cccccc;">Use the following OTP to verify your account:</p>
        <h1 style="background: #d4af37; color: #1e1e1e; 
            display: inline-block; padding: 15px 30px; border-radius: 5px; font-size: 28px;
            letter-spacing: 3px; margin: 20px 0; font-weight: bold;">
            {{OTP}}
        </h1>
        <p style="color: #aaaaaa; font-size: 14px; margin-top: 10px;">This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.</p>
        <div style="margin-top: 20px;">
            <a href="#" style="background: #d4af37; color: #1e1e1e; text-decoration: none; padding: 12px 20px; 
            font-size: 16px; border-radius: 5px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(255, 223, 96, 0.3);">
            Verify Now</a>
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
    const otpResponse = await sendOtp(email, messageHtml);
    if (!otpResponse.success)
      return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP" });
    req.session.email = email;
    req.session.username = username;
    req.session.save();
    res.status(200).json({
      success: true,
      message: `OTP sent successfully at ${email}`,
      email,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const VerifyRegistration = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const email = req.session.email;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    const otpResponse = await VerifyOtp(email, otp);
    if (otpResponse === "OTP Expired")
      return res.status(410).json({ success: false, message: "OTP Expired" });
    if (otpResponse === "Invalid OTP") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    req.session.verifiedEMAIL = email;
    res.status(201).json({ success: true, message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getRegistered = async (req, res, next) => {
  try {
    let email = req.session.verifiedEMAIL;
    const { password, DOB } = req.body;
    const username = req.session.username || "Anonymous";
    if (!email)
      return res.status(403).json({
        success: false,
        message: "Unauthorized access. Please verify OTP first.",
      });
    const flag = await userModel.findOne({ email });
    if (flag)
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    const saltRounds = Number(process.env.ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    let user = await userModel.create({
      email,
      password: hashedPassword,
      DOB,
      fullname: username,
    });
    res
      .status(200)
      .json({ success: true, message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const flag = await userModel.findOne({ email });
    if (!flag)
      return res.status(404).json({
        success: false,
        message: "Invalid Email or Password. Please try again",
      });
    const isMatch = await bcrypt.compare(password, flag.password);
    if (!isMatch)
      return res.status(404).json({
        success: false,
        message: "Invalid Email or Password. Please try again",
      });
    if (flag.role === "user") {
      const accesstoken = generateAccessToken(flag);
      res.cookie("token", accesstoken, {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 24 * 60 * 60 * 1000,
        expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      });
    } else if (flag.role === "admin") {
      const accesstoken = generateAccessTokenAdmin(flag);
      res.cookie("token", accesstoken, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 1000,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Login successful", role: flag.role });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { registerUser, VerifyRegistration, getRegistered, loginUser };
