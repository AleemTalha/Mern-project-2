const express = require("express");
const helmet = require("helmet");
const path = require("path");
const compression = require("compression");
const config = require("config");
require("dotenv").config();
require("./config/mongoose-connection");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { isLoggedIn } = require("./middlewares/isLoggedIn");
const { isAdmin } = require("./middlewares/isAdmin");
const cors = require("cors");

const app = express();

app.set("trust proxy", 1);
app.use(morgan("tiny"));
app.use(express.json());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(compression());
app.use(cookieParser());

let MONGO_URI = config.get("MONGO_URI");
if (MONGO_URI.includes("<db_password>") && process.env.DB_PASSWORD) {
  MONGO_URI = MONGO_URI.replace("<db_password>", process.env.DB_PASSWORD);
}
if (MONGO_URI.includes("<dbname>") && process.env.DB_NAME) {
  MONGO_URI = MONGO_URI.replace("<dbname>", process.env.DB_NAME);
}

app.use(
  cors({
    // origin: "https://sellsphere-production-58f9.up.railway.app",
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  // res.header("Access-Control-Allow-Origin", "https://sellsphere-production-58f9.up.railway.app");
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(
  session({
    secret: process.env.ACESS_TOKEN_SECRET || "none",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
      domain: '.up.railway.app',
      path: "/",
      sameSite: "none",
      // sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Morning, but hope so you will get hacked by aleem",
  });
});

app.get("/hello", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Security measures",
  });
});

app.use("/admin", isLoggedIn, isAdmin, require("./routes/admin"));
app.use("/", require("./routes/user"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      "Error 404! Not found. Sorry, the page you are looking for does not exist. don't try to access it.",
  });
});

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated.");
  });
});

module.exports = app;
