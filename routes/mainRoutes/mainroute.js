const express = require("express");
const userModel = require("../../models/userModel");
const router = express.Router();
const {
  registerUser,
  VerifyRegistration,
  getRegistered,
  loginUser,
} = require("../../controllers/userAuth.controllers");
const { isLoggedIn } = require("../../middlewares/isLoggedIn");
const adsModel = require("../../models/ads.models");

router.post("/register", registerUser);
router.post("/verify", VerifyRegistration);
router.post("/getRegistered", getRegistered);
router.post("/login", loginUser);
router.post("/location", isLoggedIn, async (req, res) => {
  const { longitude, latitude } = req.body;
  if (!longitude || !latitude)
    return res
      .status(400)
      .json({ success: false, message: "Longitude and latitude are required" });

  try {
    await userModel.findByIdAndUpdate(req.user._id, {
      location: { type: "Point", coordinates: [longitude, latitude] },
    });
    res.json({ success: true, message: "Location updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error updating location" });
  }
});
router.get("/dashboard", isLoggedIn, async (req, res) => {
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
      { $sort: { distance: 1 } },
      { $sample: { size: 4 } },
    ]);

    res.status(200).json({ success: true, ads });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.find({ email: req.user.email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.post("/update_profile", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email }).select("-password ");
    if (!user)
      return res
        .status(404)
        .json({
          success: false,
          message: "Unable to get your data please try again later",
        });
        

  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
