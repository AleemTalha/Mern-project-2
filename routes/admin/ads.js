const router = require("express").Router();
const reportsModel = require("../../models/report.model");
const debug = require("debug")("app:admin-reports-route");
const userModel = require("../../models/userModel");
const adsModel = require("../../models/ads.models");
const applicationModel = require("../../models/application");

router.get("/ads", async (req, res) => {
  try {
    const { lastId } = req.query;
    const filters = {};
    if (lastId) filters._id = { $gt: lastId };
    const ads = await adsModel.aggregate([
      { $match: filters },
      { $limit: 4 },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          price: 1,
          location: 1,
          images: 1,
        },
      },
    ]);
    res.status(200).json({ success: true, data: ads });
  } catch (error) {
    console(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/ads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await adsModel.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }
    res.status(200).json({ success: true, data: ad });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})
router.get("/ads/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await adsModel.findByIdAndDelete(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }
    res.status(200).json({ success: true, message: "Ad deleted successfully" });
  } catch (error) {
    debug(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})


module.exports = router;
