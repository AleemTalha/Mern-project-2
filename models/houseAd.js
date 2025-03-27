const mongoose = require("mongoose");
const Ad = require("./ads.models");

const houseSchema = new mongoose.Schema({
  locationCity: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  area: { type: String, required: true },
  furnished: { type: Boolean, default: false },
});

const HouseAd = Ad.discriminator("Houses", houseSchema);

module.exports = HouseAd;
