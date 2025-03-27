const mongoose = require("mongoose");

const baseOptions = {
  discriminatorKey: "category",
  collection: "ads",
};

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    condition: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { url: String, public_id: String },
    location: { 
      type: { type: String, enum: ["Point"], default: "Point" }, 
      coordinates: { type: [Number], default: [0, 0] } 
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contactNumber: { type: String, required: true },
    status: { type: String, enum: ["active", "sold", "inactive"], default: "active" },
    createdAt: { type: Date, default: Date.now },
    showNumber: { type: Boolean, default: false },
  },
  baseOptions
);

const Ad = mongoose.model("Ads", adSchema);

module.exports = Ad;
