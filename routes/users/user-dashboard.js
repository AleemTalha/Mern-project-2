const express = require("express");
const userModel = require("../../models/userModel");
const upload = require("../../config/multer-config");
const cloudinary = require("../../config/cloudinary.config");
const { sendOtp, VerifyOtp } = require("../../utils/otp.utils");
const sendMessage = require("../../utils/nodemail");
const console = require("debug")("development:mainroute");
const router = express.Router();
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../../controllers/userAuth.controllers");
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const adsModel = require("../../models/ads.models");



router.get("/", isLoggedIn, async (req, res) => {
  res.status(200).json({ success: true, message: "User Dashboard" });
});

router.get("/sample/api", async(req, res) => {
 try
 {
  const recentAds = await adsModel.aggregate([
    {$sort: {createdAt: -1}},
    {$limit: 8}
  ])
  const MobileAds = await adsModel.aggregate([
    {$match: {category: "mobile "}},
    {$limit: 4},
    {
      $project:{
        description:0,
      }
    }
  ])
  const carads = await adsModel.aggregate([
    {$match: {category: "car"}},
    {$limit: 4}
  ])
  const landads = await adsModel.aggregate([
    {$match: {category: "house", subCategory: "plot"}},
    {$limit: 4}
  ])
  const tabletads = await adsModel.aggregate([
    {$match: {category: "phone", subCategory: "tablet"}},
    {$limit: 4}
  ])
  const houses = await adsModel.aggregate([
    {$match: {category: "house"}},
    {$limit: 4}
  ])
  const bikeads = await adsModel.aggregate([
    {$match: {category: "bike"}},
    {$limit: 4}
  ])

  res.status(200).json({ success: true, recentAds, MobileAds, carads, houses, bikeads, landads, tabletads });
 }
 catch(error)
 {
   res.status(500).json({ success: false, message: "Internal Server Error" });
 }
})
router.get("/api",isLoggedIn, async (req, res) => {
  try {
    const [ lng, lat ] = req.user.location.coordinates;
    // console("User Location", lng, lat);
    // console("User Location", req.user.location.coordinates);
    const recentAds = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 8 }
    ]);

    const MobileAds = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "mobile" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 }
    ]);

    const carads = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "car" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 }
    ]);

    const landads = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "house", subCategory: "plot" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 }
    ]);

    const tabletads = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "phone", subCategory: "tablet" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 }
    ]);

    const houses = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "house" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 }
    ]);

    const bikeads = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          spherical: true,
        },
      },
      { $match: { category: "bike" } },
      { $sort: { distance: 1, createdAt: -1 } },
      { $limit: 4 }
    ]);

    res.status(200).json({ success: true, recentAds, MobileAds, carads, houses, bikeads, landads, tabletads });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/listings", isLoggedIn, async (req, res) => {
  try {
    const { categorie, subcategorie, startPrice, lastPrice, lastId } = req.query;
    const  [long, lat] = req.user.location.coordinates;
    const matchQuery = {
      ...(categorie && { category: categorie }),
      ...(subcategorie && { subCategory: subcategorie }),
    };
    if (!isNaN(startPrice) && !isNaN(lastPrice)) {
      matchQuery.price = { 
        $gte: parseFloat(startPrice), 
        $lte: parseFloat(lastPrice) 
      };
    }
    if (lastId) {
      matchQuery._id = { $gt: new mongoose.Types.ObjectId(lastId) };
    }
    console(matchQuery);
    const ads = await adsModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
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
    console(err)
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/items/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const ad = await adsModel.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }
    res.status(200).json({ success: true, ad });
  }
  catch(err)
  {
    console(err)
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})




module.exports = router;