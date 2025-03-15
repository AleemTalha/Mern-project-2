const express = require("express");
const app = express();
const console = require("debug")("development:app");
require("dotenv").config();
require("./config/mongoose-connection");
const cookieParser  = require("cookie-parser");
const session = require("express-session")
const morgan = require("morgan");
const {isAdmin }= require("./middlewares/isAdmin");
const { isLoggedIn } = require("./middlewares/isLoggedIn");
const {adminLimiter}= require("./utils/rateLimiter");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));
app.use(
    session({
      secret:process.env.SESSION_SECRET ,
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 2 * 60 * 60 * 1000 },
    })
);
app.use(cookieParser());
app.use("/admin", isLoggedIn, isAdmin,adminLimiter, require("./routes/admin"));
app.use("/", require("./routes/user"));





app.use((req,res,next)=>{
    res.status(404).json({success:false, message:"Error 404!\n Not found.\n\nSorry the page you are looking for has been deleted or does not exists."})
})

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3001;

app.listen(port, host, () => {
    console(`Server running at: http://${host}:${port}`);
});
