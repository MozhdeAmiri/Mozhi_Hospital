const Doctor = require('../models/doctor');
const Surgery = require('../models/surgery');
const async = require('async');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all Doctors.
exports.doctor_list = (req, res, next) => {
  Doctor.find()
    .exec((err, list_doctors) => {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('doctor_list', { title: 'Doctor List', doctor_list: list_doctors });
    });
};

// Display detail page for a specific Doctor.
exports.doctor_detail = (req, res, next) => {
  async.parallel({
    doctor(callback) {
      Doctor.findById(req.params.id).exec(callback);
    },
    surgery_doctors(callback) {
      Surgery.find({ doctor: req.params.id }).populate('doctor').exec(callback);
    },
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.doctor == null) { // No results.
      res.redirect('/catalog/doctors');
    }
    // Successful, so render.
    res.render('doctor_detail', { title: 'Doctor', doctor: results.doctor, surgeries: results.surgery_doctors });
  });
};

// Display Doctor create form on GET.
exports.doctor_create_get = (req, res, next) => {
  res.render('doctor_form', { title: 'Create Doctor' });
};

// Handle Doctor create on POST.
exports.doctor_create_post = [

  // Validate fields.
  body('gender', 'Gender must be specified').isLength({ min: 1 }).trim(),
  body('date_of_birth', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody('gender').trim().escape(),
  sanitizeBody('extraInfo').trim().escape(),
  sanitizeBody('expertise').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Doctor object with escaped and trimmed data.
    const doctor = new Doctor({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      gender: req.body.gender,
      extraInfo: req.body.extraInfo,
      expertise: req.body.expertise,
      date_of_birth: req.body.date_of_birth,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      res.render('doctor_form', { title: 'Create Doctor', doctor, errors: errors.array()});
      return;
    }

    // Data from form is valid
    doctor.save((err) => {
      if (err) { return next(err); }
      // Successful - redirect to new record.
      res.redirect(doctor.url);
    });
  },
];


// Display Doctor delete form on GET.
exports.doctor_delete_get = (req, res, next) => {
  async.parallel({
    doctor(callback) {
      Doctor.findById(req.params.id).exec(callback);
    },
    surgery_doctors(callback) {
      Surgery.find({ doctor: req.params.id }).populate('doctor').exec(callback);
    },
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.doctor == null) { // No results.
      res.redirect('/catalog/doctors');
    }
    // Successful, so render.
    res.render('doctor_delete', { title: 'Delete Doctor', doctor: results.doctor, surgeries: results.surgery_doctors });
  });
};

// Handle Doctor delete on POST.
exports.doctor_delete_post = (req, res, next) => {
  // Assume the post has valid id (ie no validation/sanitization).
  async.parallel({
    doctor(callback) {
      Doctor.findById(req.params.id).populate('patient').populate('surgery').exec(callback);
    },
    surgery_doctors(callback) {
      Surgery.find({ doctor: req.params.id }).exec(callback);
    },
  }, (err, results) => {
    if (err) { return next(err); }
    // Success
    if (results.surgery_doctors.length > 0) {
      // Doctor has surgeries. Render in same way as for GET route.
      res.render('doctor_delete', { title: 'Delete Doctor', doctor: results.doctor, surgeries: results.surgery_doctors });
      return;
    }

    // Doctor has no Surgery objects. Delete object and redirect to the list of surgeries.
    Doctor.findByIdAndRemove(req.body.id, (err) => {
      if (err) { return next(err); }
      // Success, so redirect to list of Doctor items.
      res.redirect('/catalog/doctors');
    });
  });
};

// Display Doctor update form on GET.
exports.doctor_update_get = (req, res, next) => {
  // Get doctors for form.
  Doctor.findById(req.params.id, (err, doctor) => {
    if (err) { return next(err); }
    if (doctor == null) { // No results.
      var err = new Error('Doctor not found');
      err.status = 404;
      return next(err);
    }
    // Success.
    res.render('doctor_form', { title: 'Update Doctor', doctor });
  });
};

// Handle Doctor update on POST.
exports.doctor_update_post = [

  // Validate fields.
  body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric()
    .withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Doctor object with escaped/trimmed data and current id.
    const doctor = new Doctor({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      gender: req.body.gender,
      extraInfo: req.body.extraInfo,
      expertise: req.body.expertise,
      date_of_birth: req.body.date_of_birth,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values and error messages.
      res.render('doctor_form', { title: 'Update Doctor', doctor, errors: errors.array() });
    } else {
      // Data from form is valid. Update the record.
      Doctor.findByIdAndUpdate(req.params.id, doctor, {}, (err, thedoctor) => {
        if (err) { return next(err); }
        // Successful - redirect to doctor detail page.
        res.redirect(thedoctor.url);
      });
    }
  },
];
