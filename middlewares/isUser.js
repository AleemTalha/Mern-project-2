const isUser = (req, res, next) => {
  if (req.user.role !== "user")
    return res.status(403).json({ success: false, message: "Forbidden. Only local users can access these pages", data: null });
  next();
};

module.exports = { isUser };