const restSurgeryController = require('../api/controllers/restSurgeryController');
const restPatientController = require('../api/controllers/restPatientController');
const restDoctorController = require('../api/controllers/restDoctorController');

module.exports = (uri, app) => {

  // REST SURGERY ROUTES //
  app.route(`${uri}/`)
    .get(restSurgeryController.index);

  app.route(`${uri}/surgery/create`)
    .post(restSurgeryController.surgery_create_post);

  app.route(`${uri}/surgery/:id/delete`)
    .delete(restSurgeryController.surgery_delete);

  app.route(`${uri}/surgery/:id/update`)
    .put(restSurgeryController.surgery_update_put);

  app.route(`${uri}/surgery/:id`)
    .get(restSurgeryController.surgery_detail);

  app.route(`${uri}/surgeries`)
    .get(restSurgeryController.surgery_list);

  // REST PATINT ROUTES ///
  app.route(`${uri}/patient/create`)
    .post(restPatientController.patient_create_post);

  app.route(`${uri}/patient/:id/delete`)
    .delete(restPatientController.patient_delete);

  app.route(`${uri}/patient/:id/update`)
    .put(restPatientController.patient_update_put);

  app.route(`${uri}/patient/:id`)
    .get(restPatientController.patient_detail);

  app.route(`${uri}/patients`)
    .get(restPatientController.patient_list);

  // REST DOCTOR ROUTES ///
  app.route(`${uri}/doctor/create`)
    .post(restDoctorController.doctor_create_post);

  app.route(`${uri}/doctor/:id/delete`)
    .delete(restDoctorController.doctor_delete);

  app.route(`${uri}/doctor/:id/update`)
    .put(restDoctorController.doctor_update_put);

  app.route(`${uri}/doctor/:id`)
    .get(restDoctorController.doctor_detail);

  app.route(`${uri}/doctors`)
    .get(restDoctorController.doctor_list);
};
