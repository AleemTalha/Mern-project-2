const router = require("express").Router();
const reportsModel = require("../../models/report.model");
const mongoose = require("mongoose");
const console = require("debug")("app:admin-reports-route");
const userModel = require("../../models/userModel");
const applicationModel = require("../../models/application");

router.get("/", async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    const limit = 6;
    const skip = (page - 1) * limit;

    const query = { role: { $ne: "admin" } }; 
    if (status) {
      query.status = status;
    }

    const users = await userModel
      .find(query)
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit)
      .select("_id fullName email phone location profileImage status");

    const totalUsers = await userModel.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/single/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findByIdAndDelete(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/block/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Cannot block an admin user" });
    }

    if (user.status === "inactive") {
      return res
        .status(400)
        .json({ success: false, message: "User is already blocked" });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: { id: updatedUser._id, email: updatedUser.email },
    });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/unblock/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Cannot unblock an admin user" });
    }

    if (user.status === "active") {
      return res
        .status(400)
        .json({ success: false, message: "User is already active" });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      data: { id: updatedUser._id, email: updatedUser.email },
    });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
