const express = require("express");
const mongoose = require("mongoose");
const userModel = require("../../models/userModel");
const upload = require("../../config/multer-config");
const cloudinary = require("../../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../../utils/otp.utils");
const sendMessage = require("../../utils/nodemail");
const console = require("debug")("development:mainroute");
const reportModel = require("../../models/report.model");
const router = express.Router();
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../../controllers/userAuth.controllers");
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const adsModel = require("../../models/ads.models");
const { isUser } = require("../../middlewares/isUser");

router.get("/", async (req, res, next) => {
  if (req.cookies.token || (req.session && req.session.user)) {
    return isLoggedIn(req, res, () => {
      res.status(200).json({
        success: true,
        message: "User Dashboard",
        loggedIn: true,
        user: req.user,
      });
    });
  }
  res
    .status(200)
    .json({ success: true, message: "Public Dashboard", loggedIn: false });
});

router.get("/sample/api", async (req, res) => {
  try {
    const recentAds = await adsModel.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 8 },
    ]);
    const MobileAds = await adsModel.aggregate([
      { $match: { category: "mobile " } },
      { $limit: 4 },
      {
        $project: {
          description: 0,
        },
      },
    ]);
    const carads = await adsModel.aggregate([
      { $match: { category: "car" } },
      { $limit: 4 },
    ]);
    const landads = await adsModel.aggregate([
      { $match: { category: "house", subCategory: "plot" } },
      { $limit: 4 },
    ]);
    const tabletads = await adsModel.aggregate([
      { $match: { category: "phone", subCategory: "tablet" } },
      { $limit: 4 },
    ]);
    const houses = await adsModel.aggregate([
      { $match: { category: "house" } },
      { $limit: 4 },
    ]);
    const bikeads = await adsModel.aggregate([
      { $match: { category: "bike" } },
      { $limit: 4 },
    ]);

    res.status(200).json({
      success: true,
      recentAds,
      MobileAds,
      carads,
      houses,
      bikeads,
      landads,
      tabletads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/api", isLoggedIn, isUser, async (req, res) => {
  try {
    const [lng, lat] = req.user.location.coordinates;
    const recentAds = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 8 },
    ]);

    const MobileAds = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "mobile" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    const carads = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "car" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    const landads = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "house", subCategory: "plot" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    const tabletads = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "phone", subCategory: "tablet" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    const houses = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "house" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    const bikeads = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "bike" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    res.status(200).json({
      success: true,
      recentAds,
      MobileAds,
      carads,
      houses,
      bikeads,
      landads,
      tabletads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/listings", isLoggedIn, isUser, async (req, res) => {
  try {
    const { categorie, subcategorie, startPrice, lastPrice, lastId } =
      req.query;
    const [long, lat] = req.user.location.coordinates;

    const matchQuery = {
      ...(categorie && { category: categorie }),
      ...(subcategorie && { subCategory: subcategorie }),
    };
    const minPrice = parseFloat(startPrice);
    const maxPrice = parseFloat(lastPrice);

    if (!isNaN(minPrice) && !isNaN(maxPrice)) {
      matchQuery.price = {
        $gte: minPrice,
        $lte: maxPrice,
      };
    }

    if (lastId) {
      matchQuery._id = { $gt: new mongoose.Types.ObjectId(lastId) };
    }

    const ads = await adsModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: matchQuery },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 },
    ]);

    res.status(200).json({ success: true, ads });
  } catch (err) {
    console(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/items/:id", isLoggedIn, isUser, async (req, res) => {
  const { id } = req.params;
  try {
    const ad = await adsModel.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }
    res.status(200).json({ success: true, ad });
  } catch (err) {
    console(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.post("/item/report", isLoggedIn, isUser, async (req, res) => {
  const { title, issue, createdBy, type, id } = req.query;
  const { description } = req.body;

  if (!title || !issue || !createdBy || !type || !id) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const report = new reportModel({
      title,
      description,
      issue,
      createdBy: new mongoose.Types.ObjectId(createdBy),
      type,
      id: new mongoose.Types.ObjectId(id),
    });

    await report.save();
    res
      .status(201)
      .json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    console(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
