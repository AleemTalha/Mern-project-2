const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  title: { type: String, required: true },  
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  images: { type: [String], default: [] },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  contactNumber: { type: String, required: true },
  status: { type: String, enum: ["active", "sold", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

adSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ads", adSchema);
