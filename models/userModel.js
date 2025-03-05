const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  recoveryEmail: { type: String, default: null },
  recoveryPhone: { type: String, default: null },
  profileImage: { type: String, default: "default.jpg" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  phoneNo: {type: String,},
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ads", default: [] }],
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
});

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
