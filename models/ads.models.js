const mongoose = require("mongoose");

const baseOptions = {
  discriminatorKey: "category",
  collection: "ads",
};

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    condition: { type: String, required: true },
    price: { type: Number, required: true }, 
    category: { type: String, required: true, index: true },
    subCategory: { type: String, default: null, index: { sparse: true } }, 
    image: {
      url: { type: String, default: null, index: { sparse: true } },
      public_id: { type: String, default: null },
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contactNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "sold", "inactive"],
      default: "active",
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
    showNumber: { type: Boolean, default: false },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL index for automatic deletion
  },
  baseOptions
);

adSchema.index({ location: "2dsphere" });
adSchema.index({ category: 1, subCategory: 1 });
adSchema.index({ price: 1 });
adSchema.index({ createdAt: -1 });
adSchema.index({ category: 1, price: 1 }); // Compound index for category and price

const Ad = mongoose.model("Ads", adSchema);

module.exports = Ad;
