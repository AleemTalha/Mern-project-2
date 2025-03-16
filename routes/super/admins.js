const router = require("express").Router();
const userModel = require("../../models/userModel");
const superAdminModel = require("../../models/super.model");
const bcrypt = require("bcrypt");

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the super admin dashboard",
    role: req.superAdmin.role,
  });
});
router.get("/api/admins", async (req, res) => {
  try {
    let { lastId } = req.body;
    let query = { role: "admin" };
    if (lastId) query._id = { $gt: lastId };
    let admins = await userModel.aggregate([
      { $match: query },
      { $sort: { _id: 1 } },
      { $limit: 4 },
    ]);
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/add/admin", async (req, res) => {
  try {
    let { fullname, email, password, phoneNo, profileImage } = req.body;
    if (!fullname || !email || !password || !phoneNo) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }
    let existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });
    }
    let hashedPassword = await bcrypt.hash(password, 10);
    let newAdmin = new userModel({
      fullname,
      email,
      password: hashedPassword,
      phoneNo,
      profileImage,
      role: "admin",
    });

    await newAdmin.save();
    res.json({
      success: true,
      message: "Admin created successfully.",
      admin: newAdmin,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.delete("/delete/admin/:id", async (req, res) => {
  try {
    let { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Admin ID is required." });
    }

    let admin = await userModel.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    if (admin.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "User is not an admin." });
    }

    await userModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Admin deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
