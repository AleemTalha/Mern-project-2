const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reportSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  description: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    required: true,
  },
  issue: {
    type: String,
  },
});

reportSchema.index({ title: 1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ issue: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ type: 1 });
reportSchema.index({ id: 1 });

module.exports = mongoose.model("Report", reportSchema);
