const express = require("express");
const router = express.Router();
const isLoggedIn = require("../../middlewares/isLoggedIn");
const userModel = require("../../models/userModel");
const adsModel = require("../../models/ads.models");
const upload = require("../../config/multer-config");
const cloudinary = require("../../config/cloudinary.config");
const console = require("debug")("development:user-posts");

router.get("/", async (req, res) => {
  res.status(200).json({ success: true, message: "Welcome to user posts" });
});
router.post("/attributes", async (req, res) => {
  try {
    const { category, subCategory } = req.body;
    if (!category || !subCategory) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide category and subcategory",
        });
    }
    req.session.product = { category, subCategory };
    req.session.save();
    // console("Session", req.session);

    // setTimeout(() => {
    //   if (req.session) delete req.session.product;
    // }, 2 * 60 * 60 * 1000);
    res
      .status(200)
      .json({ success: true, message: "Attributes set successfully" });
  } catch (err) {
    // console(err)
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.post("/ads", upload.single("image"), async (req, res) => {
  try {
    const { title, condition, price, PhoneNumber, showNumber, description } = req.body;
    
    if (!title || !condition || !price || !PhoneNumber || !showNumber || !description) {
      return res.status(400).json({ success: false, message: "Please provide all required details" });
    }

    if (!req.session.product) {
      return res.status(400).json({ success: false, message: "Please provide category and subcategory" });
    }

    const { category, subCategory } = req.session.product;
    
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.location?.coordinates) {
      return res.status(400).json({ success: false, message: "User location is required" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    if (req.file.size > 10000000) {
      return res.status(400).json({ success: false, message: "Image size should be less than 500KB" });
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(req.file.buffer);
    });

    const newAd = new adsModel({
      title,
      condition,
      description,
      location: { type: "Point", coordinates: user.location.coordinates },
      price,
      category,
      subCategory,
      contactNumber: PhoneNumber,
      status: "active",
      postedBy: user._id,
      image: { url: result.secure_url, public_id: result.public_id },
      showNumber: !!showNumber,
    });

    await newAd.save();

    user.posts.push(newAd._id);
    await user.save();

    delete req.session.product;

    res.status(200).json({ success: true, message: "Ad posted successfully, Images uploaded" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


module.exports = router;
