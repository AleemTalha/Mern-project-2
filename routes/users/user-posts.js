const express = require("express");
const router = express.Router();
const isLoggedIn = require("../../middlewares/isLoggedIn");
const userModel = require("../../models/userModel");
const upload = require("../../config/multer-config");
const cloudinary = require("../../config/cloudinary.config");
const Ads = require("../../models/ads.models");
const CarAds = require("../../models/carAds");
const HouseAds = require("../../models/houseAd");

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to user posts route",
    loggedIn: true,
  });
});

router.post("/attributes", async (req, res) => {
  try {
    const { category, subCategory } = req.body;
    if (!category || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "Please provide category and subcategory",
      });
    }
    req.session.product = { category, subCategory };
    req.session.save();
    setTimeout(() => {
      if (req.session) delete req.session.product;
    }, 2 * 60 * 60 * 1000);
    res
      .status(200)
      .json({ success: true, message: "Attributes set successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/ads", upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      condition,
      price,
      phoneNumber,
      showNumber,
      description,
      Make,
      Model,
      Year,
      Mileage,
      Area,
      Rooms,
      latitude,
      longitude,
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location data is missing. Cannot submit ad.",
      });
    }

    if (!req.session.product) {
      return res.status(400).json({
        success: false,
        message: "Please provide category and subcategory",
      });
    }

    const { category, subCategory } = req.session.product;

    const requiredFields = {
      title: "Title",
      condition: "Condition",
      price: "Price",
      phoneNumber: "Phone Number",
      showNumber: "Show Number",
      description: "Description",
      ...(category === "Cars" && {
        Make: "Make",
        Model: "Model",
        Year: "Year",
        Mileage: "Mileage",
      }),
      ...(category === "Houses" && {
        Area: "Area",
        Rooms: "Rooms",
      }),
    };

    const missingFields = Object.keys(requiredFields).filter(
      (key) => !req.body[key]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please provide: ${missingFields
          .map((key) => requiredFields[key])
          .join(", ")}`,
      });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    if (req.file.size > 10000000) {
      return res.status(400).json({
        success: false,
        message: "Image size should be less than 10MB",
      });
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "image" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        })
        .end(req.file.buffer);
    });

    let adData = {
      title,
      condition,
      description,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      price,
      category,
      subCategory,
      contactNumber: phoneNumber,
      status: "active",
      postedBy: user._id,
      image: { url: result.secure_url, public_id: result.public_id },
      showNumber: !!showNumber,
    };

    let AdModel = Ads;

    if (category === "Cars") {
      adData = { ...adData, Make, Model, Year, Mileage };
      AdModel = CarAds;
    } else if (category === "Houses") {
      adData = { ...adData, Area, Rooms };
      AdModel = HouseAds;
    }

    const newAd = new AdModel(adData);
    await newAd.save();

    user.posts.push(newAd._id);
    await user.save();

    delete req.session.product;

    res.status(200).json({
      success: true,
      message: "Ad posted successfully, Images uploaded",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
