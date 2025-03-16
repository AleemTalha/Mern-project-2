const router = require("express").Router();
const reportsModel = require("../../models/report.model");
const mongoose = require("mongoose");
const console = require("debug")("app:admin-reports-route");
const userModel = require("../../models/userModel");
const applicationModel = require("../../models/application");

router.get("/", async (req, res) => {
  try {
    const { lastId } = req.query;
    const filters = {};

    if (lastId) filters._id = { $gt: new mongoose.Types.ObjectId(lastId) };

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

router.get("/applications", async (req, res) => {
  try {
    const { lastId } = req.query;
    console("hello herer")
    const filters = lastId ? { _id: { $gt: lastId } } : {};
    const applications = await applicationModel
      .find(filters)
      .sort({ _id: 1 })
      .limit(4)
      .select("name description createdBy createdAt issue status");

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/application/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findById(id);
    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/application/approve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (application.status === "approved") {
      return res.status(400).json({ success: false, message: "Application is already approved" });
    }
    application.status = "approved";
    await application.save();
    await userModel.findByIdAndUpdate(application.userId, { status: "active" });
    res.status(200).json({ success: true, message: "Application approved and user activated successfully", data: application });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/application/reject/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (application.status === "rejected") {
      return res.status(400).json({ success: false, message: "Application is already rejected" });
    }
    if(application.status === "approved"){
      res.status(400).json({ success: false, message: "Cannot reject an approved application" });
    }
    application.status = "rejected";
    await application.save();
    res.status(200).json({ success: true, message: "Application rejected successfully", data: application });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


module.exports = router;
