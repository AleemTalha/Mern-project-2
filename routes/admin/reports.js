const router = require("express").Router();
const reportsModel = require("../../models/report.model");
const console = require("debug")("app:admin-reports-route");

router.get("/get", async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the reports dashboard",
    loggedIn: true,
    user: req.user,
  });
});

router.get("/get-reports", async (req, res) => {
  try {
    const { page = 1, type, issue } = req.query;
    const limit = 6;
    const skip = (page - 1) * limit;

    const query = {};
    if (type) query.type = type;
    if (issue) query.issue = issue;

    const reports = await reportsModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await reportsModel.countDocuments(query);

    res.status(200).json({
      success: true,
      reports,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReports / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
});

router.get("/get-report/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const report = await reportsModel.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error.message,
    });
  }
});

router.post("/delete-reports", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No report IDs provided. Please provide at least one ID.",
      });
    }

    const result = await reportsModel.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} report(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete reports",
      error: error.message,
    });
  }
});

router.get("/delete-report/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await reportsModel.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete report",
      error: error.message,
    });
  }
});

router.get("/approve-report/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await reportsModel.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Report approved successfully",
      report: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve report",
      error: error.message,
    });
  }
});

router.get("/reject-report/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await reportsModel.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Report rejected successfully",
      report: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject report",
      error: error.message,
    });
  }
});

module.exports = router;
