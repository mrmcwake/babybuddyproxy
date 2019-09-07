var axios = require("axios"),
  moment = require("moment"),
  config = require("config"),
  babybuddyConfig = config.get("babybuddy"),
  token = babybuddyConfig.token,
  baseUrl = babybuddyConfig.url;

const ax = axios.create({
  baseURL: baseUrl,
  timeout: 1000,
  headers: { Authorization: `Token ${token}` }
});
function getTime(dateTime) {
  return moment({ h: dateTime.hours(), m: dateTime.minutes() });
}
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

function queryBabyBuddy(route, offset, limit, filterFn) {
  return ax.get(`${route}?offset=${offset}&limit=${limit}`).then(response => {
    if (typeof filterFn === "function") {
      var newResults = [];
      response.data.results.forEach(item => {
        if (filterFn(item)) {
          newResults.push(item);
        }
      });
      response.data.results = newResults;
    }
    return response;
  });
}

function queryBabyBuddyByDay(
  route,
  dayOffset,
  dateField,
  offset,
  limit,
  dailyEntries,
  filterFn
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
        var start =
          typeof dateField === "function" ? dateField(f) : moment(f[dateField]);

        if (start >= startOfDay && start <= endOfDay) {
          if (typeof filterFn === "function") {
            if (filterFn(f)) {
              dailyEntries.push(f);
            }
          } else {
            dailyEntries.push(f);
          }
        }
      });

      var lastStart =
        typeof dateField === "function"
          ? dateField(feedings[feedings.length - 1])
          : moment(feedings[feedings.length - 1][dateField]);

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
          dailyEntries,
          filterFn
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

function getNoteDate(note) {
  let noteTokens = note.note.split("@");
  let actualTime;
  if (noteTokens.length > 1) {
    actualTime = moment(noteTokens[1].trim(), "HHmm");
    if (actualTime.isValid) {
      let noteTime = moment(note.time);

      if (getTime(noteTime).isBefore(getTime(actualTime), "minutes")) {
        note.a = "a";
        actualTime = moment({
          y: noteTime.year(),
          M: noteTime.month(),
          d: noteTime.date(),
          h: actualTime.hour(),
          m: actualTime.minute()
        }).subtract(1, "days");
      } else {
        note.a = "b";
        actualTime = moment({
          y: noteTime.year(),
          M: noteTime.month(),
          day: noteTime.date(),
          h: actualTime.hour(),
          m: actualTime.minute()
        });
      }
    } else {
      note.a = "c";
      actualTime = moment(noteTokens[1].trim(), [
        "MMM D, hh:mma",
        "MMM D hh:mma",
        "MMM D, hha",
        "MMM D hha"
      ]);
      if (!actualTime.isValue()) {
        note.a = "d";
        actualTime = moment(note.time);
      }
    }
  } else {
    note.a = "e";
    actualTime = moment(note.time);
  }
  note.actualTime = actualTime;
  return actualTime;
}
function filterNotes(note, type) {
  let noteTokens = note.note.split("@");

  if (noteTokens.length > 0 && noteTokens[0].trim().toLowerCase() === type) {
    note.type = noteTokens[0].trim().toLowerCase();
    return true;
  }
  return false;
}
function init(app, route) {
  app.get(`${route}/feedings/ml/today`, function(req, res) {
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

  app.get(`${route}/feedings/ml/yesterday`, function(req, res) {
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

  app.get(`${route}/feedings/ml/total`, function(req, res) {
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

  app.get(`${route}/feedings/duration/yesterday`, function(req, res) {
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

  app.get(`${route}/feedings/duration/today`, function(req, res) {
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

  app.get(`${route}/feedings/duration/total`, function(req, res) {
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
  app.get(`${route}/feedings/last`, function(req, res) {
    queryBabyBuddy("feedings", 0, 1)
      .then(response => {
        res.json({
          lastFeeding: moment(response.data.results[0].end).fromNow()
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
  app.get(`${route}/changes/yesterday`, function(req, res) {
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

  app.get(`${route}/changes/today`, function(req, res) {
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
  app.get(`${route}/changes/total`, function(req, res) {
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
  app.get(`${route}/changes/last`, function(req, res) {
    queryBabyBuddy("changes", 0, 1)
      .then(response => {
        res.json({
          lastChange: moment(response.data.results[0].time).fromNow()
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
  app.get(`${route}/pukes/yesterday`, function(req, res) {
    queryBabyBuddyByDay("notes", 1, getNoteDate, null, null, null, note => {
      return filterNotes(note, "puke");
    })
      .then(pukes => {
        res.json({ totalPukes: pukes.length });
      })
      .catch(error => {
        console.log(error);
        res.json({
          status: error.response.status,
          statusText: error.response.statusText
        });
      });
  });
  app.get(`${route}/pukes/today`, function(req, res) {
    queryBabyBuddyByDay("notes", 0, getNoteDate, null, null, null, note => {
      return filterNotes(note, "puke");
    })
      .then(pukes => {
        res.json({ totalPukes: pukes.length });
      })
      .catch(error => {
        console.log(error);
        res.json({
          status: error.response.status,
          statusText: error.response.statusText
        });
      });
  });
  app.get(`${route}/pukes/last`, function(req, res) {
    queryBabyBuddy("notes", 0, 2000, note => {
      return filterNotes(note, "puke");
    })
      .then(response => {
        res.json({
          lastPuke: moment(getNoteDate(response.data.results[0])).fromNow()
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
  app.get(`${route}/pukes/total`, function(req, res) {
    queryBabyBuddy("notes", 0, 20000, note => {
      return filterNotes(note, "puke");
    })
      .then(response => {
        res.json({
          totalPukes: response.data.results.length
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
  app.get(`${route}/pumps/yesterday`, function(req, res) {
    queryBabyBuddyByDay("notes", 1, getNoteDate, null, null, null, note => {
      return filterNotes(note, "pump");
    })
      .then(pumps => {
        res.json({ totalPumps: pumps.length });
      })
      .catch(error => {
        console.log(error);
        res.json({
          status: error.response.status,
          statusText: error.response.statusText
        });
      });
  });
  app.get(`${route}/pumps/today`, function(req, res) {
    queryBabyBuddyByDay("notes", 0, getNoteDate, null, null, null, note => {
      return filterNotes(note, "pump");
    })
      .then(pumps => {
        res.json({ totalPumps: pumps.length });
      })
      .catch(error => {
        console.log(error);
        res.json({
          status: error.response.status,
          statusText: error.response.statusText
        });
      });
  });
  app.get(`${route}/pumps/last`, function(req, res) {
    queryBabyBuddy("notes", 0, 2000, note => {
      return filterNotes(note, "pump");
    })
      .then(response => {
        res.json({
          lastPump: moment(getNoteDate(response.data.results[0])).fromNow()
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
  app.get(`${route}/pumps/total`, function(req, res) {
    queryBabyBuddy("notes", 0, 20000, note => {
      return filterNotes(note, "pump");
    })
      .then(response => {
        res.json({
          totalPumps: response.data.results.length
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
  app.get(`${route}/notes`, function(req, res) {
    queryBabyBuddy("notes", 0, 20000)
      .then(response => {
        res.json(response.data);
      })
      .catch(error => {
        console.log(error);
        res.json({
          status: error.response.status,
          statusText: error.response.statusText
        });
      });
  });

  app.get(`${route}/health`, function(req, res) {
    queryBabyBuddy("changes", 0, 1)
      .then(response => {
        res.json({
          alive: true
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

  app.get(`${route}/test`, function(req, res) {
    res.json({
      test: true
    });
  });
}

module.exports.init = init;
