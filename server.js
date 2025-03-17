const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
// const xssClean = require("xss-clean");
const app = express();
const compression = require("compression");
const debug = require("debug")("development:app");
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
// app.use(xssClean());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("public"));

let MONGO_URI = config.get("MONGO_URI");

if (MONGO_URI.includes("<db_password>") && process.env.DB_PASSWORD) {
  MONGO_URI = MONGO_URI.replace("<db_password>", process.env.DB_PASSWORD);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
    },
  })
);

app.disable("x-powered-by");
app.use(compression());
app.use(cookieParser());

// Allow all origins for CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.get("/", (req, res) => {
  res.send("Welcome to the server");
});
app.use("/super/admin", superAdminLimiter, require("./routes/superAdmin"));
app.use("/admin", isLoggedIn, isAdmin, adminLimiter, require("./routes/admin"));
app.use("/", require("./routes/user"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      "Error 404! Not found. Sorry, the page you are looking for has been deleted or does not exist.",
  });
});

const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated.");
  });
});
