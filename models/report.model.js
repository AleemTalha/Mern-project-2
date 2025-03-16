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
    // required: true,
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
    type: String, // user , ads
    enum: ["user", "ads"],
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

// Use ensureIndexes to build indexes at the first render (initial loading)
// reportSchema.on('index', function (error) {
//   if (error) {
//     console.log('Error while creating indexes', error);
//   } else {
//     console.log('Indexes created successfully!');
//   }
// });

const reportsModel = mongoose.model("Report", reportSchema);
module.exports = reportsModel;
