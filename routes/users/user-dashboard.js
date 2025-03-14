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



router.get("/", async (req, res)=> {
  isLoggedIn;
})

router.get("/api", isLoggedIn, async (req, res) => {
    try {
      if (!req.user || !req.user.location || !req.user.location.coordinates) {
        return res
        .status(400)
        .json({ success: false, message: "User location not found" });
      }
      const [lng, lat] = req.user.location.coordinates;
      const ads = await adsModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distance",
            spherical: true,
          },
        },
        {
          $match: { postedBy: { $ne: userId } },
        },
        { $sort: { distance: 1 } }, 
        { $limit: 20 },
        { $sample: { size: 4 } },
      ]);
      
      res.status(200).json({ success: true, ads });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


module.exports = router;