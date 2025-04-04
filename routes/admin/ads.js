const router = require("express").Router();
const adsModel = require("../../models/ads.models");
const debug = require("debug")("app:admin-ads-route");

router.get("/get-ads", async (req, res) => {
  try {
    const { page = 1, category, status } = req.query;
    const limit = 6;
    const skip = (page - 1) * limit;

    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;

    const ads = await adsModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalAds = await adsModel.countDocuments(query);

    res.status(200).json({
      success: true,
      ads,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalAds / limit),
    });
  } catch (error) {
    debug(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ads",
      error: error.message,
    });
  }
});

router.get("/get-ad/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await adsModel.findById(id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    res.status(200).json({
      success: true,
      ad,
    });
  } catch (error) {
    debug(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ad",
      error: error.message,
    });
  }
});

router.post("/delete-ads", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No ad IDs provided. Please provide at least one ID.",
      });
    }

    const result = await adsModel.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} ad(s) deleted successfully.`,
    });
  } catch (error) {
    debug(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete ads",
      error: error.message,
    });
  }
});

router.get("/delete-ad/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await adsModel.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (error) {
    debug(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete ad",
      error: error.message,
    });
  }
});

router.get("/activate-ad/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await adsModel.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ad activated successfully",
      ad: result,
    });
  } catch (error) {
    debug(error);
    res.status(500).json({
      success: false,
      message: "Failed to activate ad",
      error: error.message,
    });
  }
});

router.get("/inactivate-ad/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await adsModel.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ad inactivated successfully",
      ad: result,
    });
  } catch (error) {
    debug(error);
    res.status(500).json({
      success: false,
      message: "Failed to inactivate ad",
      error: error.message,
    });
  }
});

module.exports = router;
