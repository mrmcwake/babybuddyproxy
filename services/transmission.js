const config = require("config");
const transmissionConfig = config.get("transmission");
const TransmissionClient = require("transmission-promise");
const Medusa = require("../services/medusa");
const moment = require("moment");
const tnp = require("torrent-name-parser");

class Transmission {
  constructor() {
    this.medusaClient = new Medusa();
    this.transmissionClient = new TransmissionClient(transmissionConfig);
  }
  getSession() {
    return this.transmissionClient.session();
  }
  getSessionStats() {
    return this.transmissionClient.sessionStats();
  }
  getAllTorrents() {
    return this.transmissionClient
      .get(false, [
        "id",
        "name",
        "activityDate",
        "status",
        "isFinished",
        "isStalled",
        "error",
        "errorString",
        "percentDone",
        "rateDownload",
        "rateUpload"
      ])
      .then(result => {
        return result;
      });
  }
  getActiveTorrents() {
    return this.transmissionClient.active();
  }
  getCompletedTorrents() {
    return getAllTorrents().then(result => {
      result.torrents = processTorrents(
        result.torrents,
        Transmission.isTorrentComplete
      );
      return result;
    });
  }
  getPausedTorrents() {
    return getAllTorrents().then(result => {
      result.torrents = processTorrents(
        result.torrents,
        Transmission.isTorrentPaused
      );
      return result;
    });
  }
  getStaleCompletedTorrents() {
    return getAllTorrents().then(result => {
      result.torrents = processTorrents(result.torrents, torrent => {
        return isTorrentComplete(torrent) && isTorrentStale(torrent);
      });
      return result;
    });
  }
  getTorrentsByShow() {
    return getAllTorrents().then(result => {
      var showMap = {};
      result.torrents.forEach(torrent => {
        Transmission.parseTorrentNames(torrent);

        var title = torrent.parsedName.title
          .replace(/\s|\+/g, ".")
          .replace(/\.\./g, ".")
          .toLowerCase();
        var season = torrent.parsedName.season;
        var episode = torrent.parsedName.episode;

        if (season && episode) {
          if (!showMap[title]) {
            showMap[title] = {};
          }
          if (!showMap[title][season]) {
            showMap[title][season] = {};
          }
          if (!showMap[title][season][episode]) {
            showMap[title][season][episode] = [];
          }
          showMap[title][season][episode].push(torrent);
        } else {
          if (!showMap[title]) {
            showMap[title] = [];
          }
          showMap[title].push(torrent);
        }
      });
      return showMap;
    });
  }
  removeStaleCompletedTorrents() {
    console.log("Removing stale torrents...");
    return this.getStaleCompletedTorrents().then(result => {
      console.log(result.torrents.length + " stale torrents found to remove.");
      result.torrents.forEach(torrent => {
        console.log("Removing torrent: " + torrent.id);
        this.transmissionClient
          .remove(torrent.id, false)
          .then(() => {
            console.log("Deleted torrent id: " + torrent.id);
          })
          .catch(() => {
            console.log("Failed to delete torrent id: " + torrent.id);
          });
      });
      return result.torrents.length;
    });
  }
  static isTorrentComplete(torrent) {
    return (
      torrent.status === 0 && torrent.isFinished && torrent.percentDone >= 1
    );
  }
  static isTorrentPaused(torrent) {
    return (
      torrent.status === 0 && !torrent.isFinished && torrent.percentDone < 1
    );
  }
  static parseTorrentNames(torrent) {
    torrent.name = torrent.name.replace(/^(www\..+\..+)\s-\s/i, "[$1]");
    torrent.parsedName = tnp(torrent.name);
  }
  static addMomentDate(torrent) {
    torrent.activityDateMoment = moment.unix(torrent.activityDate).fromNow();
  }
  static processTorrents(torrents, filter) {
    return torrents.filter(torrent => {
      if (filter(torrent)) {
        Transmission.parseTorrentNames(torrent);
        Transmission.addMomentDate(torrent);
        return true;
      }
      return false;
    });
  }
  static isTorrentStale(torrent) {
    var aWeekAgo = moment()
      .subtract(7, "days")
      .startOf("day");
    var activityDate = moment.unix(torrent.activityDate);

    return activityDate.isBefore(aWeekAgo);
  }
}

module.exports = Transmission;
