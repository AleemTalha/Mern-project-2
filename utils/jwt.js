const jwt = require("jsonwebtoken");
const generateAccessToken = (user) => {
  let role = user.role;
  return jwt.sign(
    { id: user.id, role, email: user.email, location: user.location },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15d" }
  );
};

const generateAccessTokenAdmin = (user) => {
  let role = user.role;
  return jwt.sign(
    { id: user.id, role, email: user.email, location: user.location },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "60m" }
  );
};

const generateAccessTokenAdminSuper = (user) => {
  let role = user.role;
  return jwt.sign(
    { id: user.id, role, email: user.email, },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "20m" }
  );
};


module.exports = { generateAccessToken, generateAccessTokenAdmin, generateAccessTokenAdminSuper };
