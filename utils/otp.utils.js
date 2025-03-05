const NodeCache = require("node-cache");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const console = require("debug")("development:otp");

const cache = new NodeCache({ stdTTL: 300 });

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateOtp = () => {
    return otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });
};

const sendOtp = async (userIdentifier) => {
    const otp = generateOtp();
    console("Generated OTP : ", otp);
    cache.set(userIdentifier, otp);
    console("Sending OTP TO : ", userIdentifier);
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userIdentifier,
        subject: "🔐 Verify Your Account - OTP Code",
        html: `
        <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 20px; background: #f4f4f4;">
            <div style="max-width: 450px; margin: auto; background: #ffffff; padding: 25px; border-radius: 10px; 
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15); border: 1px solid #ddd;">
                <h2 style="color: #007bff; margin-bottom: 15px;">Your OTP Code</h2>
                <p style="font-size: 16px; color: #333;">Use the following OTP to verify your account:</p>
                <h1 style="background: #007bff; color: #ffffff; 
                    display: inline-block; padding: 15px 30px; border-radius: 5px; font-size: 28px;
                    letter-spacing: 3px; margin: 20px 0; font-weight: bold;">
                    ${otp}
                </h1>
                <p style="color: #555; font-size: 14px; margin-top: 10px;">This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.</p>
                <div style="margin-top: 20px;">
                    <a href="#" style="background: #007bff; color: #fff; text-decoration: none; padding: 12px 20px; 
                    font-size: 16px; border-radius: 5px; display: inline-block;">Verify Now</a>
                </div>
                <hr style="border: 0; height: 1px; background: #ddd; margin: 25px 0;">
                <p style="margin-top: 10px; font-size: 12px; color: #888;">If you didn’t request this, please ignore this email.</p>
            </div>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "OTP sent successfully" };
    } catch (error) {
        return { success: false, message: "Failed to send OTP" };
    }
};

const VerifyOtp = (userIdentifier, enteredOtp) => {
    const storedOtp = cache.get(userIdentifier);
    if (!storedOtp) return "OTP Expired";
    return storedOtp === enteredOtp ? "OTP verified" : "Invalid OTP";
};

module.exports = { sendOtp, VerifyOtp };
