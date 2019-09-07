const Medusa = require("services/medusa");
const medusa = new Medusa();

function init(app, route) {
  app.get(`${route}/memory`, function(req, res) {
    medusa
      .getConfig("system", "memoryUsage")
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
  app.get(`${route}/series`, function(req, res) {
    medusa
      .getSeries()
      .then(result => {
        res.json(result.data);
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
    medusa
      .getConfig("system", "memoryUsage")
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
