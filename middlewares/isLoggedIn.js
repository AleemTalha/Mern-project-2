const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const console = require("debug")("development:auth");

const isLoggedIn = async (req, res, next) => {
  if (req.session.user && req.session.token) {
    jwt.verify(req.session.token, process.env.ACCESS_TOKEN_SECRET);
    req.user = req.session.user;
    return next();
  }

  if (!req.cookies.token) {
    return res.status(401).json({ success: false, message: "Unauthorized access" });
  }

  try {
    let decoded = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET);
    let user = await userModel.findOne({ email: decoded.email, _id: decoded.id }).select("email fullname status role location");

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized access, Invalid email" });
    }

    req.session.user = Object.freeze(user);
    Object.defineProperty(req.session, "user", {
      value: user,
      writable: false,
      configurable: false,
      enumerable: true,
    });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Unauthorized access, Error occurred while checking" });
  }
};

module.exports = { isLoggedIn };
