const mongoose = require("mongoose");
const superModel = require("../models/super.model");
const console = require("debug")("development:superIndexes");

const getTotalIndexes = async () => {
  try {
    const indexes = await superModel.listIndexes();
    return indexes ? indexes.length : 0; 
  } catch (error) {
    console("Error fetching indexes:", error);
    return 0; 
  }
};

module.exports = getTotalIndexes;
