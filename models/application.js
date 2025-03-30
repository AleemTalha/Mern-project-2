const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const applicationSchema = new Schema({
  fullName: {
    type: String,
    // required: true,
  },
  description: {
    type: String,
    // required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    // required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  issue: {
    type: String,
    default : "simple",
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

applicationSchema.index({ name: 1 });
applicationSchema.index({ createdBy: 1 });
applicationSchema.index({ issue: 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ status: 1 });

module.exports = mongoose.model("applications", applicationSchema);
