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

const sendOtp = async (userIdentifier, customHtml) => {
    const otp = generateOtp();
    console("Generated OTP : ", otp);
    cache.set(userIdentifier, otp);
    console("Sending OTP TO : ", userIdentifier);
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userIdentifier,
        subject: "🔐 Verify Your Account - OTP Code",
        html: customHtml.replace("{{OTP}}", otp)
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
