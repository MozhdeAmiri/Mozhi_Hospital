const patientController = require('../controllers/patientController');

module.exports = (uri, app) => {

  // / PATIENT ROUTES ///
  app.route(`${uri}/create`).get(patientController.patient_create_get) // GET request for creating Patient. NOTE This must come before route for id (i.e. display patient).
    .post(patientController.patient_create_post); // POST request for creating Patient.

  app.route(`${uri}/:id/delete`).get(patientController.patient_delete_get) // GET request to delete Patient.
    .post(patientController.patient_delete_post); // POST request to delete Patient.

  app.route(`${uri}/:id/update`).get(patientController.patient_update_get) // GET request to update Patient.
    .post(patientController.patient_update_post); // POST request to update Patient.

  app.route(`${uri}/:id`).get(patientController.patient_detail); // GET request for one Patient.

  app.route('/patients').get(patientController.patient_list); // GET request for list of all Patients.

};
