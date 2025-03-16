const config = require("config");
const console = require("debug")("development:allowed");
const satelize = require("satelize");
const Restrict = (req, res, next) => {
  const allowedIps = config.get("allowedIps");
  const clientIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (!allowedIps.includes(clientIp)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this route",
    });
  }
  else
  {
    next();
  }
  
};

module.exports = { Restrict };
