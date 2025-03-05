const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const console = require("debug")("development:auth");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const { generateAccessToken } = require("../utils/jwt");

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
    const otpResponse = await sendOtp(email);
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
    if (otpResponse === "Invalid OTP"){
      return res.status(400).json({ success: false, message: "Invalid OTP" });}
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
    const accesstoken = generateAccessToken(flag);
    res.cookie("token", accesstoken, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    //here to set the flag type
    res
      .status(200)
      .json({ success: true, message: "Login successful", role: flag.role });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { registerUser, VerifyRegistration, getRegistered, loginUser };
