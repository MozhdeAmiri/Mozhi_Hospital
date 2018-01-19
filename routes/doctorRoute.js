const doctorController = require('../controllers/doctorController');

module.exports = (uri, app) => {

  // / DOCTOR ROUTES ///
  app.route(`${uri}/create`)
    .get(doctorController.doctor_create_get) // GET request for creating a Doctor. NOTE This must come before route that displays Doctor (uses id).
    .post(doctorController.doctor_create_post); // POST request for creating Doctor.

  app.route(`${uri}/:id/delete`).get(doctorController.doctor_delete_get) // GET request to delete Doctor.
    .post(doctorController.doctor_delete_post); // POST request to delete Doctor.

  app.route(`${uri}/:id/update`).get(doctorController.doctor_update_get) // GET request to update Doctor.
    .post(doctorController.doctor_update_post); // POST request to update Doctor.

  app.route(`${uri}/:id`).get(doctorController.doctor_detail); // GET request for one Doctor.

  app.route('/doctors').get(doctorController.doctor_list); // GET request for list of all Doctor.
};
