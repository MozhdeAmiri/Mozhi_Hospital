const Patient = require('../../models/patient');
const async = require('async');
const Surgery = require('../../models/surgery');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all Patients.
exports.patient_list = (req, res, next) => {
  Patient.find()
    .sort([['family_name', 'ascending']])
    .exec((err, listPatients) => {
      if (err) { res.json(err); return; }
      // Successful, so render.
      res.json({ title: 'Patient List', patient_list: listPatients });
    });
};

// Display detail page for a specific Patient.
exports.patient_detail = (req, res, next) => {
  async.parallel({
    patient(callback) {
      Patient.findById(req.params.id)
        .exec(callback);
    },
    patients_surgeries(callback) {
      Surgery.find({ patient: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) { res.json(err); return; } // Error in API usage.
    if (results.patient == null) { // No results.
      const err = new Error('Patient not found');
      err.status = 404;
      res.json(err);
      return;
    }
    // Successful, so render.
    res.json({ title: 'Patient Detail', patient: results.patient, patient_surgeries: results.patients_surgeries });
  });
};

// Handle Patient create on POST.
exports.patient_create_post = [

  // Validate fields.
  body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('diagnosis').isLength({ min: 1 }).trim().withMessage('Diagnosis must be specified.'),
  body('treatment'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.json({ title: 'Create Patient', patient: req.body, errors: errors.array() });
      return;
    }

    // Data from form is valid.
    // Create an Patient object with escaped and trimmed data.
    const patient = new Patient({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      diagnosis: req.body.diagnosis,
      treatment: req.body.treatment,
      date_of_birth: req.body.date_of_birth,
      gender: req.body.gender,
    });
    patient.save((err, savedPatient) => {
      if (err) { res.json(err); return; }
      res.json(savedPatient);
    });
  },
];

// Handle Patient delete on POST.
exports.patient_delete = (req, res, next) => {
  // async.parallel({
  //   patient(callback) {
  //     Patient.findById(req.params.patientid).exec(callback);
  //   },
  //   patients_surgeries(callback) {
  //     Surgery.find({ patient: req.params.patientid }).populate('doctor').exec(callback);
  //   },
  // }, (err, results) => {
  //   if (err) { res.json(err); return; }
  //   // Success.
  //   if (results.patients_surgeries.length > 0) {
  //     // Patient has surgeries. Render in same way as for GET route.
  //     res.json({ ERROR: 'Patient has surgeries - can not be deleted', patient: results.patient, patient_surgeries: results.patients_surgeries });
  //     return;
  //   }
  // Patient has no surgeries. Delete object and redirect to the list of patients.

  Patient.remove({
    _id: req.params.id,
  }, (errP, deletedPatient) => {
    if (errP) { res.json(errP); return; }
    // Success - go to patient list.
    res.json({ message: 'Patient successfully deleted', deletedPatient });
  });
  // });
};

// Handle Patient update on POST.
exports.patient_update_put = [

  // Validate fields.
  body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('diagnosis').isLength({ min: 1 }).trim().withMessage('Diagnosis must be specified.'),
  body('treatment'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create Patient object with escaped and trimmed data (and the old id!)
    const patient = new Patient({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      diagnosis: req.body.diagnosis,
      treatment: req.body.treatment,
      date_of_birth: req.body.date_of_birth,
      gender: req.body.gender,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values and error messages.
      res.json({ title: 'Update Patient', patient, errors: errors.array() });
    } else {
      // Data from form is valid. Update the record.
      Patient.findByIdAndUpdate(req.params.id, patient, {}, (err, thepatient) => {
        if (err) { res.json(err); return; }
        // Successful - redirect to patient detail page.
        res.json(thepatient.url);
      });
    }
  },
];
