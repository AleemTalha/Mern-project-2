const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const console = require("debug")("development:auth");

const isLoggedIn = async (req, res, next) => {
  if (req.session.user && req.session.token && req.cookies.token) {
    try {
      jwt.verify(req.session.token, process.env.ACCESS_TOKEN_SECRET);
      req.user = req.session.user;
      return next();
    } catch (err) {
      console("Error: Invalid session token");
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
    console(`Missing: ${missing.join(", ")}`);
  }

  if (!req.cookies.token) {
    console("Error: No cookie token provided");
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
    console(`Running DB Query: Finding user with ID ${decoded.id}`)

    let user = await userModel
      .findOne({ _id: decoded.id })
      .select("email fullname status role location profileImage")

    if (!user) {
      console("Error: Invalid email, user not found in DB")
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, Invalid email",
        loggedIn: false,
      })
    }
    if (user.status === "inactive") {
      console("Error: User is inactivated, destroying all cookies");
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
        )
        maxAge = 15 * 24 * 60 * 60 * 1000;
      } else if (user.role === "admin") {
        accessToken = jwt.sign(
          { id: user._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        )
        maxAge = 60 * 60 * 1000;
      }
      res.cookie("token", accessToken, {
        httpOnly: false,
        secure: true,
        sameSite: "None",
        maxAge,
        expires: new Date(Date.now() + maxAge),
        domain: ".vercel.app",
      });          
      req.session.user = Object.freeze({
        ...user.toObject(),
        token: accessToken,
      })
      req.session.token = accessToken;
      req.session.cookie.maxAge = maxAge;
      console("Session initialized from cookie token");
    }
    if (
      !req.session.user ||
      !req.session.token ||
      req.session.token !== req.cookies.token
    ) {
      console("Error: Session mismatch detected, destroying all cookies");
      Object.keys(req.cookies).forEach((cookie) => res.clearCookie(cookie));
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, Session mismatch",
      });
    }
    req.user = req.session.user;
    next();
  } catch (err) {
    console("Error: Invalid or expired token, destroying all cookies");
    Object.keys(req.cookies).forEach((cookie) => res.clearCookie(cookie));
    return res.status(401).json({
      success: false,
      message: "Unauthorized access, Invalid or expired token",
    });
  }
};

module.exports = { isLoggedIn };