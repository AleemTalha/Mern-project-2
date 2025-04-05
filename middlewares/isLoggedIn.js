const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const debug= require("debug")("development:auth");

const isLoggedIn = async (req, res, next) => {
  // console.log("Checking if user is logged in...");
  // console.log("Session data:", req.session);
  // console.log("Cookie data:", req.cookies);
  // console.log("Request headers:", req.headers);
  if (req.session.user && req.session.token && req.cookies.token) {
    try {
      jwt.verify(req.session.token, process.env.ACCESS_TOKEN_SECRET);
      req.user = req.session.user;
      return next();
    } catch (err) {
      // console.log("Error: Invalid session token");
      return res.status(401).json({
        loggedIn: false,
        success: false,
        message: "Unauthorized access, Invalid session token",
      });
    }
  }

  let missing = [];
  if (!req.session.user) missing.push("Session User");
  if (!req.session.token) missing.push("Session Token");
  if (!req.cookies.token) missing.push("Cookie Token");

  if (missing.length > 0) {
    // console.log(`Missing: ${missing.join(", ")}`);
  }

  if (!req.cookies.token) {
    // console.log("Error: No cookie token provided");
    return res.status(401).json({
      success: false,
      message: "Unauthorized access, No cookie token provided",
    });
  }

  try {
    let decoded = jwt.verify(
      req.cookies.token,
      process.env.ACCESS_TOKEN_SECRET
    );
    // console.log(`Running DB Query: Finding user with ID ${decoded.id}`);

    let user = await userModel
      .findOne({ _id: decoded.id })
      .select("email fullname status role location profileImage");

    if (!user) {
      // console.log("Error: Invalid email, user not found in DB");
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, Invalid email",
        loggedIn: false,
      });
    }
    if (user.status === "inactive") {
      // console.log("Error: User is inactivated, destroying all cookies");
      Object.keys(req.cookies).forEach((cookie) => res.clearCookie(cookie));
      return res.status(401).json({
        success: false,
        message: "User is blocked",
        blockedUser: true,
        status: "no",
      });
    }
    if (!req.session.user) {
      let accessToken;
      let maxAge;
      if (user.role === "user") {
        accessToken = jwt.sign(
          { id: user._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15d" }
        );
        maxAge = 15 * 24 * 60 * 60 * 1000;
      } else if (user.role === "admin") {
        accessToken = jwt.sign(
          { id: user._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );
        maxAge = 60 * 60 * 1000;
      }
      res.cookie("token", accessToken, {
        httpOnly: false, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge,
        path: "/",
        expires: new Date(Date.now() + maxAge),
      });
      // console.log("Set-Cookie Header:", res.getHeaders()["set-cookie"]);
      req.session.user = Object.freeze({
        ...user.toObject(),
        token: accessToken,
      });
      req.session.token = accessToken;
      req.session.cookie.maxAge = maxAge;
      // console.log("Session initialized from cookie token");
    }
    if (
      !req.session.user ||
      !req.session.token ||
      req.session.token !== req.cookies.token
    ) {
      // console.log("Error: Session mismatch detected, destroying all cookies");
      Object.keys(req.cookies).forEach((cookie) => res.clearCookie(cookie));
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, Session mismatch",
      });
    }
    req.user = req.session.user;
    next();
  } catch (err) {
    // console.log("Error: Invalid or expired token, destroying all cookies");
    Object.keys(req.cookies).forEach((cookie) => res.clearCookie(cookie));
    return res.status(401).json({
      success: false,
      message: "Unauthorized access, Invalid or expired token",
    });
  }
};

module.exports = { isLoggedIn };
