const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const xssClean = require("xss-clean");
const app = express();
const compression = require("compression");
const csrf = require("csurf");
const console = require("debug")("development:app");
const config = require("config");
require("dotenv").config();
const mongoSanitize = require("express-mongo-sanitize");
require("./config/mongoose-connection");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const morgan = require("morgan");
const { isAdmin } = require("./middlewares/isAdmin");
const { isLoggedIn } = require("./middlewares/isLoggedIn");
const { adminLimiter } = require("./utils/rateLimiter");
const { superAdminLimiter } = require("./utils/rateLimiter");

app.use(express.json());
app.use(helmet());
app.use(mongoSanitize());
app.use(xssClean()); 
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));
let Mongo_URI = config.get("MONGO_URI");
Mongo_URI = Mongo_URI.replace("<db_password>", process.env.DB_PASSWORD);
Mongo_URI = Mongo_URI.replace("<dbname>", process.env.DB_NAME);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, 
    store: MongoStore.create({ mongoUrl: Mongo_URI }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict" 
    },
  })
);
app.disable("x-powered-by");
app.use(compression());
app.use(cookieParser());

// const FRONTEND_URL = config.get("FRONT_END_URI");
// app.use(
//   cors({
//     origin: FRONTEND_URL,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );
// app.use((req, res, next) => {
//   if (req.headers.origin !== FRONTEND_URL) {
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
})

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3001;

app.listen(port, host, () => {
  console(`Server running at: http://${host}:${port}`);
});
