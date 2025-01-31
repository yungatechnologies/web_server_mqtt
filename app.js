require("dotenv").config();
require("./services/mqtt");


var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var indexRouter = require("./routes/index");
var cors = require("cors")

const cron = require('node-cron');

const device_controller = require("./controllers/devices_controller")

//Connect to mqtt broker
var app = express();

app.use(cors());
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use(logger("dev"));
app.use(express.json());
app.use(
    express.urlencoded({
        extended: false,
    })
);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
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

cron.schedule('* * * * *', function() {
    console.log('running a task every minute');

    /*var today = new Date()
    var now = new Date(today.toLocaleString("en-US", {timeZone: "Africa/Kampala"}))
    var time = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
    var devices = [];*/

    device_controller.autoArm();

    device_controller.autoDisArm();



});

//device_controller.sendsmsNotification();



module.exports = app;