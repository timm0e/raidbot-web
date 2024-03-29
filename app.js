//@ts-check
var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var sassMiddleware = require("node-sass-middleware");
var session = require("express-session");
var connectRedis = require("connect-redis")(session);
var ioredis = require("ioredis");
var raidbotlib = require("raidbot-redis-lib");
var flash = require("connect-flash");

var redis = new ioredis({ connectionName: "webAuth", db: 1, host: process.env.RAIDBOT_REDIS_HOST,
port: process.env.RAIDBOT_REDIS_PORT ? parseInt(process.env.RAIDBOT_REDIS_PORT, 10) : undefined });
var raidbotdb = new raidbotlib.RaidBotDB("web");
var raidbotconfig = require("raidbot-config")();

var generic = require("./routes/generic");
var jsapi = require("./routes/jsapi")(raidbotdb, raidbotconfig);
var auth = require("./routes/auth")(redis, raidbotconfig);

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Pass the req Object to PUG
app.use((req, res, next) => {
  res.locals.req = req;
  next();
});

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  sassMiddleware({
    src: path.join(__dirname, "public"),
    dest: path.join(__dirname, "public"),
    indentedSyntax: true, // true = .sass and false = .scss
    sourceMap: true
  })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));

// Auth Setup

app.use(
  session({
    secret: raidbotconfig.cookieSecret, //dank memes
    name: "RaidBot Session",
    store: new connectRedis({ client: redis})
  })
);

app.use("/auth/", auth);

app.use("/", generic("index"));
app.use("/sounds", auth.authMiddleware, generic("sounds"));
app.use("/upload", auth.authMiddleware, generic("upload"));
app.use("/jsapi", auth.authMiddleware, jsapi);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
