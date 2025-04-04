const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const debug = require("debug")("development:auth");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const sendMessage = require("../utils/nodemail");
const { otpLimiter } = require("../utils/rateLimiter");
const {
  generateAccessToken,
  generateAccessTokenAdmin,
} = require("../utils/jwt");

const registerUser = async (req, res, next) => {
  try {
    let { email, firstName, lastName } = req.body;
    let username = firstName + " " + lastName;
    if (req.session.email && req.session.username && !email) {
      email = req.session.email;
      username = req.session.username;
    }
    const flag = await userModel.findOne({ email: req.body.email });
    if (flag && flag.email === email)
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    if (!email || !username)
      return res
        .status(400)
        .json({ success: false, message: "Email and username are required" });
    const messageHtml = `
       <div style="font-family: 'Raleway', sans-serif; background-color: #efefef; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; color: #333;">
  <h1 style="color: #3f7d58; text-align: center;">Sell Sphere</h1>
  <h3 style="color: #3f7d58; text-align: center;">Your OTP Code</h3>
  <p style="font-size: 16px; color: #555; text-align: center;">
    Use the following OTP to verify your account:
  </p>
  <div style="background-color: #fff; padding: 15px; border-radius: 8px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1); text-align: center;">
    <h1 style="background: #3f7d58; color: #fff; display: inline-block; padding: 15px 30px; border-radius: 5px; font-size: 28px; letter-spacing: 3px; margin: 20px 0; font-weight: bold;">
      {{OTP}}
    </h1>
  </div>
  <p style="font-size: 16px; color: #555; text-align: center; margin-top: 20px;">
    This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.
  </p>
  <div style="text-align: center; margin-top: 10px;">
    <a href="#" target="_blank" style="font-size: 16px; color: #fff; background-color: #3f7d58; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Verify Now
    </a>
  </div>
  <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">
    If you didn’t request this, please ignore this email.
  </p>
</div>
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
    console.log(req.body);
    let email = req.session.verifiedEMAIL;
    const { password, DOB, ipAddress } = req.body;
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

    const locationData = await fetchUserLocation(ipAddress);
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch location data" });
    }

    let user = await userModel.create({
      email,
      password: hashedPassword,
      DOB,
      fullname: username,
      ipAddress,
      location: {
        type: "Point",
        coordinates: [locationData.longitude, locationData.latitude],
      },
    });

    delete req.session.verifiedEMAIL;
    await req.session.save();

    res
      .status(200)
      .json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Error in getRegistered:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const fetchUserLocation = async (ipAddress) => {
  try {
    const apiKey = process.env.GEO_API;
    const API_URI = `https://api.bigdatacloud.net/data/ip-geolocation-full?ip=${ipAddress}&key=${apiKey}`;
    const response = await fetch(API_URI, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch location data:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data && data.location) {
      console.log(
        "Location data:",
        data.location?.city,
        data.country?.name,
        data.location?.localityName
      );
      return {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        city: data.location.city || "Unknown",
        country: data.country?.name || "Unknown",
      };
    } else {
      console.error("Invalid location data format:", data);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user location:", error);
    return null;
  }
};

const loginUser = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password || !req.body.ipAddress) {
      return res
        .status(400)
        .json({ error: "Missing credentials or IP address" });
    }
    const { email, password, ipAddress } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid Email or Password. Please try again",
      });
    }

    if (user.status === "inactive") {
      console.log("Error: User account is blocked, access denied.");
      return res.status(403).json({
        success: false,
        message: "User is blocked, Scroll Down to send an Application",
        blockedUser: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(404).json({
        success: false,
        message: "Invalid Email or Password. Please try again",
      });
    }

    if (user.role === "user") {
      const locationData = await fetchUserLocation(ipAddress);
      if (!locationData || !locationData.latitude || !locationData.longitude) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to fetch location data" });
      }

      const userCoordinates = user.location?.coordinates || [];
      if (
        userCoordinates.length === 2 &&
        (Math.abs(userCoordinates[0] - locationData.longitude) > 0.5 ||
          Math.abs(userCoordinates[1] - locationData.latitude) > 0.5)
      ) {
        let messageHtml = `
        <div style="font-family: 'Raleway', sans-serif; background-color: #efefef; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; color: #333;">
          <h1 style="color: #3f7d58; text-align: center;">Sell Sphere</h1>
          <h3 style="color: #3f7d58; text-align: center;">Suspicious Login Attempt Detected</h3>
          <p style="font-size: 16px; color: #555; text-align: center;">
            We have detected an unusual login attempt from a location that seems unfamiliar. Please review the details below.
          </p>
          <div style="background-color: #fff; padding: 15px; border-radius: 8px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 16px; color: #555; margin: 0;">
              <strong>Location :</strong> {{city}}, {{country}}<br>
            </p>
          </div>
          <p style="font-size: 16px; color: #555; text-align: center; margin-top: 20px;">
            To verify the location of the suspicious login, please click on the link below to view the precise spot on Google Maps:
          </p>
          <div style="text-align: center; margin-top: 10px;">
            <a href="https://www.google.com/maps?q={{latitude}},{{longitude}}" target="_blank" style="font-size: 16px; color: #fff; background-color: #3f7d58; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Location on Google Maps
            </a>
          </div>
          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">
            If you did not initiate this login, please secure your account immediately by changing your password and reviewing recent activity.
          </p>
        </div>
      `;

        messageHtml = messageHtml
          .replace("{{city}}", locationData.city)
          .replace("{{country}}", locationData.country)
          .replace("{{latitude}}", locationData.latitude)
          .replace("{{longitude}}", locationData.longitude);

        await sendMessage(user.email, "Suspicious Login Detected", messageHtml);
      }
    }

    let accessToken;
    let maxAge;

    if (user.role === "user") {
      accessToken = generateAccessToken(user);
      maxAge = 15 * 24 * 60 * 60 * 1000;
    } else if (user.role === "admin") {
      accessToken = generateAccessTokenAdmin(user);
      maxAge = 60 * 60 * 1000;
    }

    res.cookie("token", accessToken, {
      httpOnly: true, // Prevent JavaScript from accessing cookies
      sameSite: "none", // Allow cross-origin requests
      domain: "sell-sphere-one.vercel.app",
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge,
      expires: new Date(Date.now() + maxAge),
    });
    console.log("Set-Cookie Header:", res.getHeaders()["set-cookie"]);
    req.session.user = Object.freeze({
      ...user.toObject(),
      token: accessToken,
    });
    req.session.token = accessToken;
    req.session.cookie.maxAge = maxAge;

    res.status(200).json({
      success: true,
      message: `${user.role} Login successful`,
      role: user.role,
    });
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { registerUser, VerifyRegistration, getRegistered, loginUser };
