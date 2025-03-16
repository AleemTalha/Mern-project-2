const router = require("express").Router();
const console = require("debug")("development:superAdmin");
const { Restrict } = require("../middlewares/allowed");
const bcrypt = require("bcrypt");
const superModel = require("../models/super.model");
const { sendOtp, VerifyOtp } = require("../utils/otp.utils");
const { check, validationResult } = require("express-validator");
const getTotalIndexes = require("../utils/superIndexes");
const { loginSuperAdmin } = require("../controllers/superAuth");
const { isSuperAdmin } = require("../middlewares/isSuper");
const { isAdminLoggedIn } = require("../middlewares/isSuperAdminLogin");

router.use(Restrict);

if (process.env.NODE_ENV === "development") {
  getTotalIndexes().then((totalIndexes) => {
    if (totalIndexes === 0) {
      router.post(
        "/create/new/super",
        [check("email").isEmail().withMessage("Invalid email format")],
        async (req, res) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          try {
            const { email } = req.body;
            const flag = await superModel.findOne({ email });
            if (flag)
              return res
                .status(409)
                .json({ success: false, message: "Super admin already exists" });
            if (!email)
              return res
                .status(400)
                .json({ success: false, message: "Email is required" });

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
            `;

            const otpResponse = await sendOtp(email, messageHtml);
            if (!otpResponse.success)
              return res
                .status(500)
                .json({ success: false, message: "Failed to send OTP" });

            req.session.email = email;
            req.session.save();
            console("OTP sent successfully to ", req.session.email);
            res.status(200).json({
              success: true,
              message: `OTP sent successfully to ${email}`,
              email,
            });
          } catch (err) {
            console("Error: ", err.message);
            res.status(500).json({ success: false, message: "Internal Server Error" });
          }
        }
      );

      router.post(
        "/verify/otp",
        [check("otp").isLength({ min: 6, max: 6 }).withMessage("Invalid OTP")],
        async (req, res) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          try {
            const { otp } = req.body;
            const email = req.session.email;
            if (!email)
              return res
                .status(400)
                .json({ success: false, message: "Email is required" });

            const otpResponse = await VerifyOtp(email, otp);
            if (otpResponse === "OTP Expired")
              return res
                .status(410)
                .json({ success: false, message: "OTP Expired" });
            if (otpResponse === "Invalid OTP") {
              return res
                .status(400)
                .json({ success: false, message: "Invalid OTP" });
            }

            req.session.verifiedEMAIL = email;
            res.status(201).json({ success: true, message: "OTP verified" });
          } catch (err) {
            console("Error: ", err.message);
            res.status(500).json({ success: false, message: "Internal Server Error" });
          }
        }
      );

      router.post(
        "/complete/registration",
        [
          check("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters long")
            .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
            .withMessage(
              "Password must contain letters, numbers, and special characters"
            ),
          check("twoFactorSecret")
            .isLength({ min: 16 })
            .withMessage("2FA secret must be at least 16 characters long")
            .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
            .withMessage(
              "2FA secret must contain letters, numbers, and special characters"
            ),
        ],
        async (req, res) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          try {
            const { password, twoFactorSecret, username } = req.body;
            const email = req.session.verifiedEMAIL;
            if (!email)
              return res.status(403).json({
                success: false,
                message: "Unauthorized access. Please verify OTP first.",
              });

            const flag = await superModel.findOne({ email });
            if (flag)
              return res
                .status(409)
                .json({ success: false, message: "Super admin already exists" });

            const saltRounds = Number(process.env.ROUNDS) || 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            let superAdmin = await superModel.create({
              email,
              username,
              password: hashedPassword,
              twoFactorSecret,
            });

            res.status(200).json({
              success: true,
              message: "Super admin registered successfully",
            });
          } catch (err) {
            console("Error: ", err.message);
            res.status(500).json({ success: false, message: "Internal Server Error" });
          }
        }
      );
    }
    else {
        router.use((req,res,next) => {
          console("Admin already exists");
          next();
            // res.status(403).json({success: false, message: "Super admin already exists"});
        });

    }
  }).catch((err) => {
    console("Error: ", err.message);
  });
}

router.post("/login/super", loginSuperAdmin)

router.use("/admins/managements",isAdminLoggedIn, isSuperAdmin, require("./super/admins"));

module.exports = router;