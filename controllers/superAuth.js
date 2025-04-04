const console = require("debug")("development:superAdmin");
const bcrypt = require("bcrypt");
const superModel = require("../models/super.model");
const { check, validationResult } = require("express-validator");
const { generateAccessTokenAdminSuper } = require("../utils/jwt");

const loginSuperAdmin = [
  check("email").isEmail().withMessage("Invalid email format"),
  check("password").not().isEmpty().withMessage("Password is required"),
  check("twoFactorSecret").not().isEmpty().withMessage("2FA secret is required"),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email, password, twoFactorSecret } = req.body;
      const superAdmin = await superModel.findOne({ email });
      if (!superAdmin) {
        return res.status(404).json({ success: false, message: "Super admin not found" });
      }
      const isPasswordMatch = await bcrypt.compare(password, superAdmin.password);
      if (!isPasswordMatch) {
        return res.status(401).json({ success: false, message: "Invalid password" });
      }
      if (superAdmin.twoFactorSecret !== twoFactorSecret) {
        return res.status(401).json({ success: false, message: "Invalid 2FA secret" });
      }
      const token = generateAccessTokenAdminSuper(superAdmin);
      res.cookie("token", token, { 
        httpOnly: false,
        sameSite: "none",
        secure: true,
        domain: ".vercel.app",
        maxAge: 60 * 60 * 1000,
        expires: new Date(Date.now() + 60 * 60 * 1000),
       });
       console.log('Cookies sent to client:', req.cookies);
      res.status(200).json({ success: true, message: "Login successful", token });
    } catch (err) {
      console("Error: ", err.message);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
];

module.exports = { loginSuperAdmin };