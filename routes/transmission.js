const Transmission = require("services/transmission");
const transmission = new Transmission();

function init(app, route) {
  app.get(`${route}/active`, function(req, res) {
    transmission
      .getActiveTorrents()
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/torrents/completed`, function(req, res) {
    transmission
      .getCompletedTorrents()
      .then(result => {
        result.count = result.torrents.length;
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/torrents/completed/stale`, function(req, res) {
    transmission
      .getStaleCompletedTorrents()
      .then(result => {
        result.count = result.torrents.length;
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/torrents/paused`, function(req, res) {
    transmission
      .getPausedTorrents()
      .then(result => {
        result.count = result.torrents.length;
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/torrents/shows`, function(req, res) {
    transmission
      .getTorrentsByShow()
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/torrents`, function(req, res) {
    transmission
      .getAllTorrents()
      .then(result => {
        result.count = result.torrents.length;
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/session`, function(req, res) {
    transmission
      .getSession()
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/sessionStats`, function(req, res) {
    transmission
      .getSessionStats()
      .then(result => {
        result["cumulative-stats"].downloadedKilobytes =
          result["cumulative-stats"].downloadedBytes / 1024;
        result["cumulative-stats"].downloadedMegabytes =
          result["cumulative-stats"].downloadedKilobytes / 1024;
        result["cumulative-stats"].downloadedGigabytes =
          result["cumulative-stats"].downloadedMegabytes / 1024;
        result["cumulative-stats"].downloadedTerabytes =
          result["cumulative-stats"].downloadedGigabytes / 1024;

        result["cumulative-stats"].uploadedKilobytes =
          result["cumulative-stats"].uploadedBytes / 1024;
        result["cumulative-stats"].uploadedMegabytes =
          result["cumulative-stats"].uploadedKilobytes / 1024;
        result["cumulative-stats"].uploadedGigabytes =
          result["cumulative-stats"].uploadedMegabytes / 1024;
        result["cumulative-stats"].uploadedTerabytes =
          result["cumulative-stats"].uploadedGigabytes / 1024;
        res.json(result);
      })
      .catch(error => {
        res.json(error);
      });
  });
  app.get(`${route}/sessionStats`, function(req, res) {
    transmission
      .getSessionStats()
      .then(result => {
        res.json({ alive: true });
      })
      .catch(error => {
        res.json(error);
      });
  });
}

module.exports.init = init;
