const router = require("express").Router();
const reportsModel = require("../../models/report.model");
const console = require("debug")("app:admin-reports-route");

router.get("/", async (req, res) => {
  try {
    const { type, issue, lastId } = req.query;
    const filters = { type: type || { $in: ["user", "ads"] } };
    if (issue) filters.issue = issue;
    if (lastId) filters._id = { $gt: lastId };
    const topIssues = await reportsModel.aggregate([
      { $match: filters },
      {
        $group: {
          _id: "$_id",
          issue: { $first: "$issue" },
          count: { $sum: 1 },
          title: { $first: "$title" },
          description: { $first: "$description" },
          createdBy: { $first: "$createdBy" },
          type: { $first: "$type" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);
    res.status(200).json({ success: true, topIssues });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const report = await reportsModel.findById(req.params.id);
    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/:id/delete", async (req, res) => {
  try {
    const report = await reportsModel.findByIdAndDelete(req.params.id);
    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }
    res.status(200).json({ success: true, message: "Report deleted" });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
