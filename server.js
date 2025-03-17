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


const FRONTEND_URL = config.get("FRONT_END_URI");
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  if (req.headers.origin !== FRONTEND_URL) {
    return res.status(403).json({ 
      success: false, 
      message: "🚫 Access Denied! You are not authorized to view this content. 🔒",
      suggestion: "🔄 Please check your permissions or contact support if you believe this is an error."
    });
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

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated.");
  });
});
