var express = require("express"),
  app = express(),
  port = 8088,
  bodyParser = require("body-parser"),
  babybudy = require("./babybudy"),
  medusa = require("./routes/medusa"),
  transmission = require("./routes/transmission");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
babybudy.init(app, "/babybuddy");
medusa.init(app, "/medusa");
transmission.init(app, "/transmission");
app.listen(port);

console.log("Server started on: " + port);
