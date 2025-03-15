const router = require("express").Router();
const reportsModel = require("../../models/report.model");
const debug = require("debug")("app:admin-reports-route");
const userModel = require("../../models/userModel");
const applicationModel = require("../../models/application");

router.get("/", async (req, res) => {
  try {
    const { lastId } = req.query;
    const filters = {};
    if (lastId) filters._id = { $lt: lastId };
    const users = await userModel.aggregate([
      { $match: filters },
      { $limit: 4 },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          location: 1,
          profileImage: 1,
          status: 1,
        },
      },
    ]);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.put("/block/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot block an admin user" });
    }
    const updatedUser = await userModel.findByIdAndUpdate(id, { status: "inactive" }, { new: true });
    res.status(200).json({ success: true, message: "User blocked successfully", data: updatedUser });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.put("/unblock/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findByIdAndUpdate(id, { status: "active" }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User unblocked successfully", data: user });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/applications", async (req, res) => {
  try {
    const applications = await applicationModel.find();
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.put("/applications/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    await userModel.findByIdAndUpdate(application.userId, { status: "active" });
    res.status(200).json({ success: true, message: "Application approved and user activated successfully", data: application });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.put("/applications/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    res.status(200).json({ success: true, message: "Application rejected successfully", data: application });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
