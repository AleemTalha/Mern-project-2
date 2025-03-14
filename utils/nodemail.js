const nodemailer = require("nodemailer");
const console = require("debug")("development:sendMessage");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendMessage = async (recipient, subject, messageHtml) => {
    console("Sending Message To:", recipient);
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: subject,
        html: messageHtml
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "Message sent successfully" };
    } catch (error) {
        return { success: false, message: "Failed to send message" };
    }
};

module.exports = sendMessage;
