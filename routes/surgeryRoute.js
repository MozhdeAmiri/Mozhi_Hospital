const surgeryController = require('../controllers/surgeryController');

module.exports = (uri, app) => {

  // / SURGERY ROUTES ///
  app.route('/').get(surgeryController.index);// GET home page.

  app.route(`${uri}/create`)
    .get(surgeryController.surgery_create_get) // GET request for creating a Surgery. NOTE This must come before routes that display Surgery (uses id).
    .post(surgeryController.surgery_create_post); // POST request for creating Surgery.

  app.route(`${uri}/:id/delete`)
    .get(surgeryController.surgery_delete_get) // GET request to delete Surgery.
    .post(surgeryController.surgery_delete_post); // POST request to delete Surgery.

  app.route(`${uri}/:id/update`)
    .get(surgeryController.surgery_update_get) // GET request to update Surgery.
    .post(surgeryController.surgery_update_post);

  app.route(`${uri}/:id`).get(surgeryController.surgery_detail); // GET request for one Surgery.

  app.route('/surgeries').get(surgeryController.surgery_list) // GET request for list of all Surgery.
    .post(surgeryController.surgery_list_post); // POST request for creating Surgery.

};
