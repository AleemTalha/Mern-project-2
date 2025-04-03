const express = require("express");
const router = express.Router();
const applicationModel = require("../../models/application");

router.get("/", async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the application dashboard",
    loggedIn: true,
    user: req.user,
  });
});

router.get("/get-applications", async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    const limit = 6;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }

    const applications = await applicationModel
      .find(query)
      .sort({ submittedAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalApplications = await applicationModel.countDocuments(query);

    res.status(200).json({
      success: true,
      applications,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalApplications / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
});

router.get("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await applicationModel.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch application",
      error: error.message,
    });
  }
});

router.post("/delete-applications", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No application IDs provided. Please provide at least one ID.",
      });
    }

    const result = await applicationModel.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} application(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete applications",
      error: error.message,
    });
  }
});

router.get("/delete-application/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await applicationModel.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete application",
      error: error.message,
    });
  }
});

router.get("/approve-application/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await applicationModel.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application approved successfully",
      application: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve application",
      error: error.message,
    });
  }
});

router.get("/reject-application/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await applicationModel.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application rejected successfully",
      application: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject application",
      error: error.message,
    });
  }
});

module.exports = router;
