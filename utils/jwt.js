const jwt = require("jsonwebtoken");
const generateAccessToken = (user) => {
  let role = user.role;
  return jwt.sign(
    {
      id: user.id,
      role,
      image: user.profileImage.url,
      email: user.email,
      location: user.location,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15d" }
  );
};

const generateAccessTokenAdmin = (user) => {
  let role = user.role;
  console.log("admin route here accessd")
  return jwt.sign(
    {
      id: user.id,
      role,
      email: user.email,
      location: user.location,
      image: user.profileImage,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "8h" }
  );
};

const generateAccessTokenAdminSuper = (user) => {
  let role = user.role;
  return jwt.sign(
    { id: user.id, role, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "20m" }
  );
};

module.exports = {
  generateAccessToken,
  generateAccessTokenAdmin,
  generateAccessTokenAdminSuper,
};
