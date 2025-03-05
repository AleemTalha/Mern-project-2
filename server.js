const express = require("express");
const app = express();
const console = require("debug")("development:app");
require("dotenv").config();
require("./config/mongoose-connection");
const cookieParser  = require("cookie-parser");
const session = require("express-session")
const morgan = require("morgan");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(cookieParser());
app.use("/", require("./routes/mainRoutes/mainroute"));
app.use("/user",require("./routes/userRoutes"))
app.use((req,res,next)=>{
    res.status(404).json({success:false, message:"Error 404!\n Not found"})
})

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3001;

app.listen(port, host, () => {
    console(`Server running at: http://${host}:${port}`);
});
