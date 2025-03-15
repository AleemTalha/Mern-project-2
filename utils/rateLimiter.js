const rateLimit = require("express-rate-limit");

const userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: "Too many requests. Please try again after 15 minutes."
});
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 30, 
    message: "Too many requests. Please try again after 15 minutes."
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: "Too many login attempts. Please try again after 15 minutes."
});
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 24 * 60 * 60 * 1000, 
    max: 1,
    message: "You can reset your password only once every 15 days."
});
const singleLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1,
    message: "You can only perform this action once every 15 minutes."
});

module.exports = { userLimiter, adminLimiter, loginLimiter, passwordResetLimiter, singleLimiter };
