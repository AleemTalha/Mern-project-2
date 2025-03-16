const express = require("express");
const app = express();
const compression = require("compression");
const console = require("debug")("development:app");
require("dotenv").config();
require("./config/mongoose-connection");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const morgan = require("morgan");
const { isAdmin } = require("./middlewares/isAdmin");
const { isLoggedIn } = require("./middlewares/isLoggedIn");
const { adminLimiter } = require("./utils/rateLimiter");
const { superAdminLimiter } = require("./utils/rateLimiter");
app.use(express.json());
const cors = require("cors");
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2 * 60 * 60 * 1000 },
  })
);
app.use(compression());
app.use(cookieParser());

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );
// app.use((req, res, next) => {
//   const allowedOrigin = "http://localhost:3000"; 
//   if (req.headers.origin !== allowedOrigin) {
//     return res.status(403).json({ success: false, message: "Access Denied!" });
//   }
//   next();
// });


app.use("/super/admin", superAdminLimiter, require("./routes/superAdmin"));
app.use("/admin", isLoggedIn, isAdmin, adminLimiter, require("./routes/admin"));
app.use("/", require("./routes/user"));

app.use((req, res, next) => {
  res
    .status(404)
    .json({
      success: false,
      message:
        "Error 404!\n Not found.\n\nSorry the page you are looking for has been deleted or does not exists.",
    });
});

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3001;

app.listen(port, host, () => {
  console(`Server running at: http://${host}:${port}`);
});
