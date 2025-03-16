const mongoose = require("mongoose");
const schema = mongoose.Schema;

const superAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["superAdmin"], default: "superAdmin" },
  twoFactorSecret: { type: String, required: true },
  is2FAEnabled: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now },
  recoveryCode: { type: String, },
  recoveryMail: { type: String,},
});

const superAdminModel = mongoose.model("superAdmin", superAdminSchema);
module.exports = superAdminModel;
