const express = require("express");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
const compression = require("compression");
const config = require("config");
require("dotenv").config();
const mongoSanitize = require("express-mongo-sanitize");
require("./config/mongoose-connection");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const xssClean = require("xss-clean");
const { isAdmin } = require("./middlewares/isAdmin");
const { isLoggedIn } = require("./middlewares/isLoggedIn");
const { adminLimiter, superAdminLimiter } = require("./utils/rateLimiter");

const app = express();

app.set("trust proxy", 1);
app.use(morgan("tiny"));
app.use(express.json());
app.use(helmet());
app.use(mongoSanitize());
app.use(xssClean());
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
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 days session expiry
      autoRemove: "interval",
      autoRemoveInterval: 10, // Every 10 minutes
    }),
    cookie: {
      secure: true, // Temporarily false to debug
      httpOnly: true,
      sameSite: "none", // Change to 'lax' if 'strict' causes issues
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);


app.disable("x-powered-by");

const FRONTEND_URLS = config.get("FRONT_END_URI");
const allowedOrigins = Array.isArray(FRONTEND_URLS) ? FRONTEND_URLS : [FRONTEND_URLS];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("🚫 Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  try {
    if (!req.headers.origin || !req.headers.referer) {
      throw new Error("🚫 Unauthorized Request");
    }
    const isValidOrigin = allowedOrigins.includes(req.headers.origin);
    const isValidReferer = allowedOrigins.some((url) => req.headers.referer.startsWith(url));
    if (isValidOrigin && isValidReferer) {
      return next();
    }
    throw new Error("🚫 Unauthorized Request");
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(403).sendFile(path.join(__dirname, "views", "error.html"));
});

app.get('/check-dev-mode', (req, res) => {
  res.send(process.env.NODE_ENV === 'development' ? 'Development mode' : 'Production mode');
});

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

app.use("/super/admin", superAdminLimiter, require("./routes/superAdmin"));
app.use("/admin", isLoggedIn, isAdmin, adminLimiter, require("./routes/admin"));
app.use("/", require("./routes/user"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Error 404! Not found. Sorry, the page you are looking for does not exist. don't try to access it.",
  });
});

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3001;

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
