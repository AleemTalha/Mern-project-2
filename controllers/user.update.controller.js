const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const console = require("debug")("development:Update-auth");

const updatePassword = async (req, res, next) => {
    try
    {
        const {oldpassword, newpassword} = req.body;
        if(!oldpassword || !newpassword)
            return res.status(400).json({success: false, message: "Old password and new password are required"});
        const user = await userModel.findById(req.user._id);
        if(!user)
            return res.status(404).json({success: false, message: "User not found"});
        const saltRounds = process.env.ROUNDS || 10;
        const match = await bcrypt.compare(oldpassword, user.password);
        if(!match)
            return res.status(400).json({success: false, message: "Old password is incorrect"});
        const hash = await bcrypt.hash(newpassword, saltRounds);
        await userModel.findByIdAndUpdate(req.user._id, {password: hash});
        res.json({success: true, message: "Password updated successfully"});
    }
    catch(err)
    {
        console(err);
        res.status(500).json({success: false, message: "Error updating password"});
    }
};
