var axios = require("axios");
var config = require("config");

class Medusa {
  constructor() {
    this.ax = axios.create({
      baseURL: config.medusa.url,
      headers: { "x-api-key": `${config.medusa.token}` }
    });
    this.api = "/api/v2/";
  }
  getConfig(section, field) {
    var route = `${this.api}config/`;
    if (section) {
      route = `${route}${section}/`;
      if (field) {
        route = `${route}${field}/`;
      }
    }
    return this.ax.get(route);
  }
  getSeries(id, field, isDetailed) {
    var route = `${this.api}series/`;
    var config = { params: {} };
    if (id) {
      route = `${route}${id}/`;
      if (field) {
        route = `${route}${field}/`;
      }
    }
    if (isDetailed) {
      config.params.detailed = true;
    }
    return this.ax.get(route, config);
  }
}

module.exports = Medusa;
