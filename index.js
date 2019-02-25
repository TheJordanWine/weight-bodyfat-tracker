const express = require("express");
const pug = require("pug");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var plotly = require("plotly")("thejordanwine", "OaGitqpOafDTJLS66xop");

var mongodb = "mongodb://127.0.0.1/weight-tracker";
mongoose.connect(mongodb, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB Connection Error"));

var app = express();
app.use(cookieParser());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(express.static("public"));

// Set up connection to view
app.set("views", "./views");
app.set("view engine", "pug");
app.engine("pug", pug.__express);

// Define Schema
var Schema = mongoose.Schema;

var entryModelSchema = new Schema({
  weight: { type: Number, min: 100, max: 300, required: true },
  bfp: { type: Number, min: 5, max: 30, required: true },
  date: Date
});

var entryModel = mongoose.model("entryModel", entryModelSchema);

/* CONTROLLER */
// Default Route
app.get("/", (req, res) => {
  //res.render("index", { value: calculator.peek() });
  res.render("index");
});

app.post("/submit", (req, res) => {
  var instance = new entryModel({
    weight: req.body.weight,
    bfp: req.body.bfp,
    date: convertUTCDateToLocalDate(new Date())
  });
  console.log(instance);
  instance.save(function(err) {
    if (err) return handleError(err); // saved!
  });
  submitEntries(() => {
    res.redirect("/");
  });
});

app.post("/refresh", (req, res) => {
  console.log("refreshing");
  submitEntries(() => {
    console.log("redirecting");
    res.redirect("/");
  });
});

app.listen(8001, () => {
  console.log("Starting server");
});

function convertUTCDateToLocalDate(date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    )
  );
}

function submitEntries(callback) {
  var cutoff = new Date();
  // Only show the last 60 days
  cutoff.setDate(cutoff.getDate() - 60);
  entryModel
    .find()
    .where("date")
    .gt(cutoff)
    .sort({ date: "asc" })
    .exec((err, entries) => {
      if (err) return handleError(err);
      var dates = [];
      var weights = [];
      var bfps = [];
      console.log(entries);
      entries.forEach(entry => {
        dates.push(entry.date);
        weights.push(entry.weight);
        bfps.push(entry.bfp);
      });
      var data0 = [
        {
          x: dates,
          y: weights,
          mode: "markers",
          type: "scatter"
        }
      ];
      var data1 = [
        {
          x: dates,
          y: bfps,
          mode: "markers",
          type: "scatter"
        }
      ];
      var graph0Options = {
        filename: "weights",
        fileopt: "overwrite",
        layout: {
          title: "Weight"
        }
      };
      var graph1Options = {
        filename: "bfps",
        fileopt: "overwrite",
        layout: {
          title: "Body Fat Percent"
        }
      };
      plotly.plot(data0, graph0Options, (err, msg) => {
        console.log(msg);
      });
      plotly.plot(data1, graph1Options, (err, msg) => {
        console.log(msg);
      });
    });

  callback();
}
