const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  condition : { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  image: {url:String, public_id: String},
  location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], default: [0, 0] } },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  contactNumber: { type: String, required: true },
  status: { type: String, enum: ["active", "sold", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  showNumber: { type: Boolean, default: false},
  City: { type: String, default: "Karachi" },
  Make: { type: String, default: "Honda" },
  Model: { type: String, default: "Civic" },
  Year: { type: String, default: "2023" },
  Mileage: { type: String, default: "0" },
});

adSchema.index({ category: 1 }); 
adSchema.index({ status: 1 });
adSchema.index({ price: 1 });
adSchema.index({ postedBy: 1 });
adSchema.index({ createdAt: -1 });
adSchema.index({ category: 1, price: 1 });
adSchema.index({ category: 1, status: 1 });
adSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ads", adSchema);
