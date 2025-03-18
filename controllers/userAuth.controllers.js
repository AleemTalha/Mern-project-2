const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const debug = require("debug")("development:auth");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const { otpLimiter } = require("../utils/rateLimiter");
const {
  generateAccessToken,
  generateAccessTokenAdmin,
} = require("../utils/jwt");

const registerUser = async (req, res, next) => {
  try {
    let email, username, flag;
    if (req.session?.email && req.session?.username) {
      email = req.session.email;
      username = req.session.username;
      console.log("Session Data Found:", { email, username });
    } else {
      email = req.body.email;
      const firstName = req.body.firstName;
      const lastName = req.body.lastName;
      if (!email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "Email, First Name, and Last Name are required",
        });
      }

      username = `${firstName} ${lastName}`;
      flag = await userModel.findOne({ email });

      if (flag) {
        return res
          .status(409)
          .json({ success: false, message: "User already exists" });
      }
      req.session.email = email;
      req.session.username = username;
    }

    const messageHtml = `
      <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px; background: #121212; color: #ffffff;">
        <div style="max-width: 450px; margin: auto; background: #1e1e1e; padding: 25px; border-radius: 10px; box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1); border: 1px solid #333;">
          <h2 style="color: #d4af37; margin-bottom: 15px;">Your OTP Code</h2>
          <p style="font-size: 16px; color: #cccccc;">Use the following OTP to verify your account:</p>
          <h1 style="background: #d4af37; color: #1e1e1e; display: inline-block; padding: 15px 30px; border-radius: 5px; font-size: 28px;
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
      </div>`;

    const otpResponse = await sendOtp(email, messageHtml);
    if (!otpResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    req.session.save((err) => {
      if (err) {
        console.error("Session Save Error:", err);
        return res.status(500).json({
          success: false,
          message: "Session could not be saved",
        });
      } else {
        console.log("Session Saved Successfully!", req.session);
        return res.status(200).json({
          success: true,
          message: `OTP sent successfully at ${email}`,
          email,
        });
      }
    });
  } catch (err) {
    console.error("Register User Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const VerifyRegistration = async (req, res, next) => {
  try {
    let email = req.session.email;

    if (!email) {
      const sessionData = await mongoose.connection.collection("sessions").findOne({
        _id: req.sessionID, // Session ID se MongoDB me search karna
      });

      if (sessionData) {
        const parsedSession = JSON.parse(sessionData.session);
        email = parsedSession.email;
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const { otp } = req.body;
    const otpResponse = await VerifyOtp(email, otp);

    if (otpResponse === "OTP Expired")
      return res.status(410).json({ success: false, message: "OTP Expired" });

    if (otpResponse === "Invalid OTP") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    req.session.verifiedEMAIL = email;
    res.status(201).json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("Verify Registration Error:", err);
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
    console.log("Get Registered Error:", err);
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
