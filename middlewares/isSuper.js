const isSuperAdmin = (req, res, next) => {
  
  if (req.superAdmin.role !== "superAdmin")
    return res.status(403).json({ success: false, message: "Forbidden", data: null });
  next();
};

module.exports = { isSuperAdmin };