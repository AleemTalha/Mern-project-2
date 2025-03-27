const mongoose = require("mongoose");
const Ad = require("./ads.models");

const carSchema = new mongoose.Schema({
  Make: { type: String, required: true },
  Model: { type: String, required: true },
  Year: { type: String, required: true },
  Mileage: { type: String, required: true },
});

const CarAd = Ad.discriminator("Cars", carSchema);

module.exports = CarAd;
