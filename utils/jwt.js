const jwt = require("jsonwebtoken");
const generateAccessToken = (user) => {
  let role = user.role;
  return jwt.sign(
    { id: user.id, role, email: user.email, location: user.location },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15d" }
  );
};


module.exports = { generateAccessToken };
