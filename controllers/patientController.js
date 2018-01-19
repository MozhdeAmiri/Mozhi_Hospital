const Patient = require('../models/patient');
const Surgery = require('../models/surgery');

const {
  body,
  validationResult,
} = require('express-validator/check');
const {
  sanitizeBody,
} = require('express-validator/filter');

// Display list of all Patients.
exports.patient_list = async (req, res, next) => {
  console.log(' LOG : in patient_list ');
  try {
    const listPatients = await Patient.find()
      .sort([['family_name', 'ascending']])
      .exec();
    return res.render('patient_list', {
      title: 'Patient List',
      listPatients,
    }); // Successful, so render.
  } catch (err) {
    console.log(` ERROR in patient_list : ${err}`);
    return next(err);
  }
};

// Display detail page for a specific Patient.
exports.patient_detail = async (req, res, next) => {
  console.log(' LOG : in patient_detail ');
  try {
    const patient = await Patient.findById(req.params.id).exec();
    const patientSurgeries = await Surgery.find({
      patient: req.params.id,
    }).populate('doctor').populate('patient').exec();
    if (patient == null) { // No results.
      const err = new Error('Patient not found');
      err.status = 404;
      console.log(` ERROR in patient_detail : Patient not found : ${err}`);
      return next(err);
    }
    // Successful, so render.
    return res.render('patient_detail', {
      title: 'Patient Detail',
      patient,
      patientSurgeries,
    });
  } catch (err) {
    console.log(` ERROR in patient_detail : ${err}`);
    return next(err);
  } // Error in API usage.
};

// Display Patient create form on GET.
exports.patient_create_get = (req, res) => {
  console.log(' LOG : in patient_create_get ');
  return res.render('patient_form', {
    title: 'Create Patient',
  });
};

// Handle Patient create on POST.
exports.patient_create_post = [
  // Validate fields.
  body('first_name').isLength({
    min: 1,
  }).trim().withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({
    min: 1,
  }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('diagnosis').isLength({
    min: 1,
  }).trim().withMessage('Diagnosis must be specified.'),
  body('treatment'),
  body('date_of_birth', 'Invalid date of birth').optional({
    checkFalsy: true,
  }).isISO8601(),
  body('gender', 'Gender must be specified').isLength({
    min: 1,
  }).trim(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    console.log(' LOG : in patient_create_post ');
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      return res.render('patient_form', {
        title: 'Create Patient',
        patient: req.body,
        errors: errors.array(),
      });
    }
    // Data from form is valid.
    const patient = new Patient({ // Create an Patient object with escaped and trimmed data.
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      diagnosis: req.body.diagnosis,
      treatment: req.body.treatment,
      date_of_birth: req.body.date_of_birth,
      gender: req.body.gender,
    });

    return patient.save((err) => {
      if (err) {
        console.log(` ERROR in saving Patient : ${err}`);
        return next(err);
      }
      return res.redirect(patient.url); // Successful - redirect to new patient record.
    });
  },
];

// Display Patient delete form on GET.
exports.patient_delete_get = async (req, res, next) => {
  console.log(' LOG : in patient_delete_get ');
  try {
    const patient = await Patient.findById(req.params.id).exec();
    const patientsSurgeries = await Surgery.find({
      patient: req.params.id,
    }).populate('doctor').populate('patient').exec();
    if (patient == null) { // No results.
      res.redirect('/patients');
    }
    return res.render('patient_delete', {
      title: 'Delete Patient',
      patient,
      patientsSurgeries,
    }); // Successful, so render.
  } catch (err) {
    console.log(` ERROR in patient_delete_get : ${err}`);
    return next(err);
  }
};

// Handle Patient delete on POST.
exports.patient_delete_post = async (req, res, next) => {
  console.log(' LOG : in patient_delete_post ');
  try {
    const patient = await Patient.findById(req.body.patientid).exec();
    const patientSurgeries = await Surgery.find({
      patient: req.body.patientid,
    }).populate('doctor').exec();

    if (patientSurgeries.length > 0) {
      // Patient has surgeries. Render in same way as for GET route.
      return res.render('patient_delete', {
        title: 'Delete Patient',
        patient,
        patientSurgeries,
      });
    }
    // Patient has no surgeries. Delete object and redirect to the list of patients.
    return Patient.findByIdAndRemove(req.body.patientid, (err) => {
      if (err) {
        console.log(` ERROR in findByIdAndRemove Patient : ${err}`);
        return next(err);
      }
      // Success - go to patient list.
      return res.redirect('/patients');
    });
  } catch (err) {
    console.log(` ERROR in patient_delete_post : ${err}`);
    return next(err);
  }
};

// Display Patient update form on GET.
exports.patient_update_get = async (req, res, next) => {
  console.log(' LOG : in patient_update_get ');
  try {
    const patient = await Patient.findById(req.params.id);
    if (patient == null) { // No results.
      const err = new Error('Patient not found');
      err.status = 404;
      console.log(` ERROR in patient_update_get : Patient not found : ${err}`);
      return next(err);
    }
    return res.render('patient_form', {
      title: 'Update Patient',
      patient,
    });
  } catch (err) {
    console.log(` ERROR in patient_update_get : ${err}`);
    return next(err);
  }
};

// Handle Patient update on POST.
exports.patient_update_post = [
  // Validate fields.
  body('first_name').isLength({
    min: 1,
  }).trim().withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({
    min: 1,
  }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('diagnosis').isLength({
    min: 1,
  }).trim().withMessage('Diagnosis must be specified.'),
  body('treatment'),
  body('date_of_birth', 'Invalid date of birth').optional({
    checkFalsy: true,
  }).isISO8601(),
  body('gender', 'Gender must be specified').isLength({
    min: 1,
  }).trim(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    console.log(' LOG : in patient_update_post ');
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
      res.render('patient_form', {
        title: 'Update Patient',
        patient,
        errors: errors.array(),
      });
    } else {
      // Data from form is valid. Update the record.
      await Patient.findByIdAndUpdate(req.params.id, patient, {}, (err, thepatient) => {
        if (err) {
          console.log(` ERROR in findByIdAndUpdate patient_update_post : ${err}`);
          return next(err);
        }
        return res.redirect(thepatient.url); // Successful - redirect to patient detail page.
      });
    }
  },
];
