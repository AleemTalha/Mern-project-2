const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const config = require("config");
require("dotenv").config();
const mongoSanitize = require("express-mongo-sanitize");
require("./config/mongoose-connection");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();

app.use(express.json());
app.use(helmet());
app.use(mongoSanitize());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(compression());
app.use(cookieParser());

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

// ✅ Only allow requests from your frontend
const allowedOrigin = config.get("FRONT_END_URI");
app.use(
  cors({
    origin: function (origin, callback) {
      if (origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ✅ Middleware to block non-frontend requests completely
app.use((req, res, next) => {
  if (req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Welcome to the server");
});

app.use("/", require("./routes/user"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      "Error 404! Not found. Sorry, the page you are looking for does not exist.",
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
