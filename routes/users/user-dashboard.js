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
const { userReportLimiter } = require("../../utils/rateLimiter");
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
        message: "Auth Dashboard",
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
    const categories = [
      { category: "Mobile Phones", limit: 5 },
      { category: "Cars", limit: 5 },
      { category: "House", subCategory: "Apartments", limit: 5 },
      { category: "Mobile Phones", subCategory: "Foldable Phones", limit: 5 },
      { category: "House", limit: 5 },
      { category: "Beauty Products", limit: 5 },
    ];

    const recentAds = await adsModel.aggregate([{ $sample: { size: 4 } }]);
    const randomAds = await adsModel.aggregate([
      { $match: { _id: { $nin: recentAds.map((ad) => ad._id) } } },
      { $sample: { size: 4 } },
    ]);

    const categoryData = await Promise.all(
      categories.map(({ category, subCategory, limit }) =>
        adsModel.aggregate([
          { $match: { category, ...(subCategory && { subCategory }) } },
          { $sample: { size: limit } },
        ])
      )
    );

    res.status(200).json({
      success: true,
      recentAds: [...recentAds, ...randomAds],
      mobilePhones: categoryData[0],
      cars: categoryData[1],
      apartments: categoryData[2],
      foldablePhones: categoryData[3],
      houses: categoryData[4],
      beautyProducts: categoryData[5],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/api", isLoggedIn, isUser, async (req, res) => {
  try {
    let { lon, lat } = req.body;
    if (!lon || !lat) {
      if (req.user.location?.coordinates) {
        [lon, lat] = req.user.location.coordinates;
      } else {
        return res.status(400).json({
          success: false,
          message: "Please provide location data (longitude and latitude).",
        });
      }
    }

    lon = parseFloat(lon);
    lat = parseFloat(lat);
    if (isNaN(lon) || isNaN(lat)) return res.redirect("/dashboard/sample/api");

    const userId = req.user._id;
    const maxDistance = 300 * 1000;
    const categories = [
      { category: "Mobile Phones", limit: 5 },
      { category: "Cars", limit: 5 },
      { category: "House", subCategory: "Apartments", limit: 5 },
      { category: "Mobile Phones", subCategory: "Foldable Phones", limit: 5 },
      { category: "House", limit: 5 },
      { category: "Beauty Products", limit: 5 },
    ];

    const geoNearQuery = (category, subCategory, limit) => [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distance",
          maxDistance,
          spherical: true,
        },
      },
      {
        $match: {
          category,
          postedBy: { $ne: userId },
          ...(subCategory && { subCategory }),
        },
      },
      { $sample: { size: limit } },
    ];

    const [recentAds, ...categoryData] = await Promise.all([
      adsModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lon, lat] },
            distanceField: "distance",
            maxDistance,
            spherical: true,
          },
        },
        { $sample: { size: 8 } },
      ]),
      ...categories.map(({ category, subCategory, limit }) =>
        adsModel.aggregate(geoNearQuery(category, subCategory, limit))
      ),
    ]);

    res.status(200).json({
      success: true,
      recentAds,
      mobilePhones: categoryData[0],
      cars: categoryData[1],
      apartments: categoryData[2],
      foldablePhones: categoryData[3],
      houses: categoryData[4],
      beautyProducts: categoryData[5],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/listings", isLoggedIn, isUser, async (req, res) => {
  try {
    const { categorie, subcategorie, startPrice, lastPrice, lastId, firstId } =
      req.query;
    const [long, lat] = req.user.location.coordinates;

    const matchQuery = {
      ...(categorie && { category: categorie }),
      ...(subcategorie && { subCategory: subcategorie }),
    };

    const minPrice = startPrice ? parseFloat(startPrice) : null;
    const maxPrice = lastPrice ? parseFloat(lastPrice) : null;

    if (minPrice !== null && maxPrice !== null) {
      matchQuery.price = { $gte: minPrice, $lte: maxPrice };
    } else if (minPrice !== null) {
      matchQuery.price = { $gte: minPrice };
    } else if (maxPrice !== null) {
      matchQuery.price = { $lte: maxPrice };
    }
    // console(matchQuery);

    let ads = [];
    let newFirstId = firstId;

    if (!lastId && !firstId) {
      const totalAds = await adsModel.countDocuments(matchQuery);
      if (totalAds === 0) {
        return res.status(200).json({ success: true, ads: [], lastAd: true });
      }

      const randomIndex = Math.floor(Math.random() * totalAds);

      ads = await adsModel.aggregate([
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
        { $sort: { _id: 1 } },
        { $skip: randomIndex },
        { $limit: 4 },
      ]);

      if (ads.length < 4) {
        const remaining = 4 - ads.length;
        const additionalAds = await adsModel.aggregate([
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
          { $sort: { _id: 1 } },
          { $limit: remaining },
        ]);
        ads = [...ads, ...additionalAds];
      }

      if (ads.length > 0) newFirstId = ads[0]._id;
    } else {
      ads = await adsModel.aggregate([
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
        {
          $match: {
            ...matchQuery,
            ...(lastId && {
              _id: { $gt: new mongoose.Types.ObjectId(lastId) },
            }),
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 4 },
      ]);

      if (ads.length === 0 && firstId) {
        ads = await adsModel.aggregate([
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
          {
            $match: {
              ...matchQuery,
              _id: { $lte: new mongoose.Types.ObjectId(firstId) },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 4 },
        ]);
      }
    }

    const uniqueAds = ads.filter(
      (ad, index, self) =>
        index === self.findIndex((t) => t._id.toString() === ad._id.toString())
    );

    if (firstId) {
      const firstIdIndex = uniqueAds.findIndex(
        (ad) => ad._id.toString() === firstId
      );
      if (firstIdIndex !== -1) {
        uniqueAds.splice(firstIdIndex, uniqueAds.length - firstIdIndex);
      }
    }

    const isLastAd = uniqueAds.length < 4;
    res.status(200).json({
      success: true,
      ads: uniqueAds,
      lastAd: isLastAd,
      firstId: newFirstId,
    });
  } catch (err) {
    console.error(err);
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

router.post(
  "/item/report",
  isLoggedIn,
  isUser,
  userReportLimiter,
  async (req, res) => {
    const { title, issue, createdBy, type, id } = req.body;
    const { description } = req.body;
    if (!title || !issue || !createdBy || !type || !id) {
      console(req.body);
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
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
);

module.exports = router;
