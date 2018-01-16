const express = require('express');

const router = express.Router();


// Require our controllers.
const surgery_controller = require('../controllers/surgeryController');
const patient_controller = require('../controllers/patientController');
const doctor_controller = require('../controllers/doctorController');


// / SURGERY ROUTES ///

// GET catalog home page.
router.get('/', surgery_controller.index);

// GET request for creating a Surgery. NOTE This must come before routes that display Surgery (uses id).
router.get('/surgery/create', surgery_controller.surgery_create_get);

// POST request for creating Surgery.
router.post('/surgery/create', surgery_controller.surgery_create_post);

// GET request to delete Surgery.
router.get('/surgery/:id/delete', surgery_controller.surgery_delete_get);

// POST request to delete Surgery.
router.post('/surgery/:id/delete', surgery_controller.surgery_delete_post);

// GET request to update Surgery.
router.get('/surgery/:id/update', surgery_controller.surgery_update_get);

// POST request to update Surgery.
router.post('/surgery/:id/update', surgery_controller.surgery_update_post);

// GET request for one Surgery.
router.get('/surgery/:id', surgery_controller.surgery_detail);

// GET request for list of all Surgery.
router.get('/surgeries', surgery_controller.surgery_list);

// POST request for creating Surgery.
router.post('/surgeries', surgery_controller.surgery_list_post);


// / PATINT ROUTES ///

// GET request for creating Patient. NOTE This must come before route for id (i.e. display patient).
router.get('/patient/create', patient_controller.patient_create_get);

// POST request for creating Patient.
router.post('/patient/create', patient_controller.patient_create_post);

// GET request to delete Patient.
router.get('/patient/:id/delete', patient_controller.patient_delete_get);

// POST request to delete Patient
router.post('/patient/:id/delete', patient_controller.patient_delete_post);

// GET request to update Patient.
router.get('/patient/:id/update', patient_controller.patient_update_get);

// POST request to update Patient.
router.post('/patient/:id/update', patient_controller.patient_update_post);

// GET request for one Patient.
router.get('/patient/:id', patient_controller.patient_detail);

// GET request for list of all Patients.
router.get('/patients', patient_controller.patient_list);


// / DOCTOR ROUTES ///

// GET request for creating a Doctor. NOTE This must come before route that displays Doctor (uses id).
router.get('/doctor/create', doctor_controller.doctor_create_get);

// POST request for creating Doctor.
router.post('/doctor/create', doctor_controller.doctor_create_post);

// GET request to delete Doctor.
router.get('/doctor/:id/delete', doctor_controller.doctor_delete_get);

// POST request to delete Doctor.
router.post('/doctor/:id/delete', doctor_controller.doctor_delete_post);

// GET request to update Doctor.
router.get('/doctor/:id/update', doctor_controller.doctor_update_get);

// POST request to update Doctor.
router.post('/doctor/:id/update', doctor_controller.doctor_update_post);

// GET request for one Doctor.
router.get('/doctor/:id', doctor_controller.doctor_detail);

// GET request for list of all Doctor.
router.get('/doctors', doctor_controller.doctor_list);


module.exports = router;
