const mongoose = require("mongoose")
const console = require("debug")("development:db")
const users = require("../models/userModel")
const config = require("config")
module.exports = mongoose.connect(config.get("MONGO_URI"))
.then(async()=>{
    console("Connected to database")
})