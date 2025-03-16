const jwt = require("jsonwebtoken");
const superModel = require("../models/super.model");
const console = require("debug")("development:auth");

const isAdminLoggedIn = async (req, res, next) => {
  if (req.session.superAdmin && req.session.token) {
    jwt.verify(req.session.token, process.env.ACCESS_TOKEN_SECRET);
    req.superAdmin = req.session.superAdmin;
    return next();
  }
  if (!req.cookies.token) {
    return res.status(401).json({ success: false, message: "Unauthorized access", loggedIn: false });
  }
  try {
    let decoded = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET);
    let superAdmin = await superModel.findOne({ email: decoded.email, _id: decoded.id }).select("email username role");
    if (!superAdmin) {
      return res.status(401).json({ success: false, message: "Unauthorized access, Invalid email", loggedIn: false });
    }
    req.session.superAdmin = Object.freeze(superAdmin);
    Object.defineProperty(req.session, "superAdmin", {
      value: superAdmin,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    req.superAdmin = superAdmin;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Unauthorized access, Error occurred while checking" });
  }
};

module.exports = { isAdminLoggedIn };