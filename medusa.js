var axios = require("axios"),
  token = "405151ef51ac897ee11aae1d58e7d4f8",
  baseUrl = "http://192.168.1.84:8082/api/v2/";

const ax = axios.create({
  baseURL: baseUrl,
  timeout: 1000,
  headers: { "x-api-key": `${token}` }
});

function init(app, route) {
  app.get(`${route}/memory`, function(req, res) {
    ax.get("config/system/memoryUsage")
      .then(result => {
        res.json({ memoryUsage: result.data });
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
    ax.get("config/system/memoryUsage")
      .then(result => {
        if (result && result.data) {
          res.json({ alive: true });
        }
      })
      .catch(error => {
        console.log(error);
        res.json({
          status: error.response.status,
          statusText: error.response.statusText
        });
      });
  });
}
module.exports.init = init;
