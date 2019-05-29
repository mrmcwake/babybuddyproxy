var express = require("express"),
  axios = require("axios"),
  moment = require("moment"),
  app = express(),
  port = 8088,
  bodyParser = require("body-parser"),
  token = "c7f43bad5bf33ec89df985ea1d21bd8c127b08f7",
  baseUrl = "http://192.168.1.84:8000/api/";

const ax = axios.create({
  baseURL: baseUrl,
  timeout: 1000,
  headers: { Authorization: `Token ${token}` }
});

function formatDuration(duration) {
  var totalSeconds = Math.floor(duration.asSeconds());
  var totalHours = Math.floor(duration.asHours());

  totalSeconds -= totalHours * 3600;

  var remainingDuration = moment.duration(totalSeconds, "s");
  var totalMinutes = Math.floor(remainingDuration.asMinutes());

  totalSeconds -= totalMinutes * 60;

  return (
    totalHours.toString().padStart(2, "0") +
    ":" +
    totalMinutes.toString().padStart(2, "0") +
    ":" +
    totalSeconds.toString().padStart(2, "0")
  );
}

function queryBabyBuddy(route, offset, limit) {
  console.log(`${route}?offset=${offset}&limit=${limit}`);
  return ax.get(`${route}?offset=${offset}&limit=${limit}`);
}

function queryBabyBuddyByDay(
  route,
  dayOffset,
  dateField,
  offset,
  limit,
  dailyEntries
) {
  if (!dailyEntries) {
    dailyEntries = [];
  }

  if (!offset) {
    offset = 0;
  }
  if (!limit) {
    limit = 50;
  }

  return queryBabyBuddy(route, offset, limit).then(r => {
    var endOfDay = moment()
      .subtract(dayOffset, "day")
      .endOf("day");
    var startOfDay = moment()
      .subtract(dayOffset, "day")
      .startOf("day");

    if (r.data && r.data.results && r.data.results.length) {
      var feedings = r.data.results;

      feedings.map(f => {
        var start = moment(f[dateField]);
        if (start >= startOfDay && start <= endOfDay) {
          dailyEntries.push(f);
        }
      });

      var lastStart = moment(feedings[feedings.length - 1][dateField]);

      if (
        lastStart > endOfDay ||
        (lastStart >= startOfDay && lastStart <= endOfDay)
      ) {
        return queryBabyBuddyByDay(
          route,
          dayOffset,
          dateField,
          offset + limit,
          limit,
          dailyEntries
        );
      } else {
        return dailyEntries;
      }
    }
  });
}

function getTotalMls(feedings) {
  var totalMls = 0;
  if (feedings && feedings.length) {
    feedings.map(f => {
      if (f.amount && f.amount > 0) {
        totalMls += f.amount;
      }
    });
  }

  return totalMls;
}

function getTotalDuration(feedings) {
  var totalDuration = moment.duration("00:00:00");

  if (feedings && feedings.length) {
    feedings.map(f => {
      if (f.duration && f.method !== "bottle") {
        var duration = moment.duration(f.duration);
        totalDuration.add(duration);
      }
    });
  }

  return totalDuration.asHours().toFixed(2);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.route("/feedings/ml/today").get(function(req, res) {
  queryBabyBuddyByDay("feedings", 0, "start")
    .then(feedings => {
      var totalMls = getTotalMls(feedings);
      res.json({
        totalMls: totalMls
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/feedings/ml/yesterday").get(function(req, res) {
  queryBabyBuddyByDay("feedings", 1, "start")
    .then(feedings => {
      var totalMls = getTotalMls(feedings);
      res.json({
        totalMls: totalMls
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/feedings/ml/total").get(function(req, res) {
  queryBabyBuddy("feedings", 0, 20000)
    .then(response => {
      var totalMls = getTotalMls(response.data.results);
      res.json({
        totalMls: totalMls
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/feedings/duration/yesterday").get(function(req, res) {
  queryBabyBuddyByDay("feedings", 1, "start")
    .then(feedings => {
      var totalDuration = getTotalDuration(feedings);
      res.json({
        totalDuration: totalDuration
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/feedings/duration/today").get(function(req, res) {
  queryBabyBuddyByDay("feedings", 0, "start")
    .then(feedings => {
      var totalDuration = getTotalDuration(feedings);
      res.json({
        totalDuration: totalDuration
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/feedings/duration/total").get(function(req, res) {
  queryBabyBuddy("feedings", 0, 20000)
    .then(response => {
      var totalDuration = getTotalDuration(response.data.results);
      res.json({
        totalDuration: totalDuration
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});
app.route("/feedings/last").get(function(req, res) {
  queryBabyBuddy("feedings", 0, 1)
    .then(response => {
      res.json({
        lastFeeding: response.data.results[0].end
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});
app.route("/changes/yesterday").get(function(req, res) {
  queryBabyBuddyByDay("changes", 1, "time")
    .then(changes => {
      res.json({
        totalChanges: changes.length
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/changes/today").get(function(req, res) {
  queryBabyBuddyByDay("changes", 0, "time")
    .then(changes => {
      res.json({
        totalChanges: changes.length
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});
app.route("/changes/total").get(function(req, res) {
  queryBabyBuddy("changes", 0, 20000)
    .then(response => {
      res.json({
        totalChanges: response.data.results.length
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});
app.route("/changes/last").get(function(req, res) {
  queryBabyBuddy("changes", 0, 1)
    .then(response => {
      res.json({
        lastChange: response.data.results[0].time
      });
    })
    .catch(error => {
      console.log(error);
      res.json({
        status: error.response.status,
        statusText: error.response.statusText
      });
    });
});

app.route("/test").get(function(req, res) {
  res.json({
    test: true
  });
});

app.listen(port);

console.log("Server started on: " + port);
