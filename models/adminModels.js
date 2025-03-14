const mongoose =  require("mongoose")
const adminSchema  = new mongoose.SchemaType({
    name : {
        type: String,
        default : "Admin",
        required : true
    },
    role : "super_Admin",
    
})