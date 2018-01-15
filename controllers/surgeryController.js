const Surgery = require('../models/surgery');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const async = require('async');

exports.index = (req, res) => {
  async.parallel({
    surgery_count(callback) {
      Surgery.count(callback);
    },
    doctor_count(callback) {
      Doctor.count(callback);
    },
    surgery_available_count(callback) {
      Surgery.count({ status: true }, callback);
    },
    patient_count(callback) {
      Patient.count(callback);
    },
  }, (err, results) => {
    res.render('index', { title: 'Mozhi Hospital Home', error: err, data: results });
  });
};


// Display list of all surgeries.
exports.surgery_list = (req, res, next) => {
  Surgery.find({})
    .populate('patient')
    .populate('doctor')
    .exec((err, list_surgeries) => {
      if (err) { return next(err); }
      // Successful, so render
      res.render('surgery_list', { title: 'Surgery List', surgery_list: list_surgeries });
    });
};

// Display detail page for a specific surgery.
exports.surgery_detail = (req, res, next) => {
  async.parallel({
    surgery(callback) {
      Surgery.findById(req.params.id)
        .populate('patient')
        .populate('doctor')
        .exec(callback);
    },
    doctor(callback) {
      Doctor.find({ surgery: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      return next(err);
    }
    // Successful, so render.
    res.render('surgery_detail', { title: 'Title', surgery: results.surgery, doctors: results.doctor });
  });
};

// Display surgery create form on GET.
exports.surgery_create_get = (req, res, next) => {
  // Get all patients and doctors, which we can use for adding to our surgery.
  async.parallel({
    patients(callback) {
      Patient.find(callback);
    },
    doctors(callback) {
      Surgery.find({ status: true })
        .populate('doctor')
        .exec((err, listActiveSurgeries) => {
          if (err) { return next(err); }
          // Successful
          const activeDoctors = [];
          listActiveSurgeries.forEach((s) => {
            activeDoctors.push(s.doctor[0]._id);
          });
          Doctor.find({ _id: { $nin: activeDoctors } })
            .exec(callback);
        });
    },
  }, (err, results) => {
    if (err) { return next(err); }

    res.render('surgery_form', { title: 'Create Surgery', patients: results.patients, doctors: results.doctors });
  });
};

// Handle surgery create on POST.
exports.surgery_create_post = [
  // Convert the doctors to an array.
  (req, res, next) => {
    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') { req.body.doctor = []; } else { req.body.doctor = new Array(req.body.doctor); }
    }
    next();
  },

  // Validate fields.
  body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
  body('patient', 'Patient must not be empty.').isLength({ min: 1 }).trim(),
  body('doctor', 'Doctor(s) must not be empty.').isLength({ min: 1 }).trim(),
  body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
  body('date', 'Date must not be empty').isLength({ min: 1 }).trim(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  sanitizeBody('doctor.*').trim().escape(),
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Surgery object with escaped and trimmed data.
    const surgery = new Surgery({
      title: req.body.title,
      patient: req.body.patient,
      summary: req.body.summary,
      date: req.body.date,
      status: req.body.status != undefined,
      doctor: req.body.doctor,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all patients and doctors for form.
      async.parallel({
        patients(callback) {
          Patient.find(callback);
        },
        doctors(callback) {
          Surgery.find({ status: true })
            .populate('doctor')
            .exec((err, listActiveSurgeries) => {
              if (err) { return next(err); }
              // Successful
              const activeDoctors = [];
              listActiveSurgeries.forEach((s) => {
                activeDoctors.push(s.doctor[0]._id);
              });
              Doctor.find({ _id: { $nin: activeDoctors } })
                .exec(callback);
            });
        },
      }, (err, results) => {
        if (err) { return next(err); }

        // Mark our selected doctors as selected.
        for (let i = 0; i < results.doctors.length; i++) {
          if (surgery.doctor.indexOf(results.doctors[i]._id) > -1) {
            results.doctors[i].selected = 'true';
          }
        }
        res.render('surgery_form', {
          title: 'Create Surgery', patients: results.patients, doctors: results.doctors, surgery, errors: errors.array(),
        });
      });
    } else {
      // Data from form is valid. Save surgery.
      surgery.save((err) => {
        if (err) { return next(err); }
        // Successful - redirect to new surgery record.
        res.redirect(surgery.url);
      });
    }
  },
];


// Display surgery delete form on GET.
exports.surgery_delete_get = (req, res, next) => {
  Surgery.findById(req.params.id)
    .populate('patient')
    .populate('doctor')
    .exec((err, surgery) => {
      if (err) { return next(err); }
      if (surgery == null) { // No results.
        res.redirect('/catalog/surgeries');
      }
      // Successful, so render.
      res.render('surgery_delete', { title: 'Delete Surgery', surgery });
    });
};

// Handle surgery delete on POST.
exports.surgery_delete_post = (req, res, next) => {
  // Assume valid Doctor id in field.
  Doctor.findByIdAndRemove(req.body.id, (err) => {
    if (err) { return next(err); }
    // Success, so redirect to list of Doctor items.
    res.redirect('/catalog/doctors');
  });
};

// Display surgery update form on GET.
exports.surgery_update_get = (req, res, next) => {
  // Get surgery, patients and doctors for form.
  async.parallel({
    surgery(callback) {
      Surgery.findById(req.params.id).populate('patient').populate('doctor').exec(callback);
    },
    patients(callback) {
      Patient.find(callback);
    },
    doctors(callback) {
      Doctor.find(callback);
    },
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      return next(err);
    }
    // Success.
    // Mark our selected doctors as selected.

    // console.log(results.doctors);
    // console.log('--------------------------')
    // results.surgery.doctor.forEach((s) => {
    //   if (!results.doctors.includes(s)) {
    //     results.doctors.push(s);
    //     console.log(s);
    //   }
    // });

    results.surgery.doctor.forEach((s) => {
      results.doctors.forEach((d) => {
        if (d._id.toString() == s._id.toString()) {
          d.selected = 'true';
        }
      });
    });
    // for (let s = 0; s < results.surgery.doctor.length; s++) {
    //   console.log(results.surgery.doctor[s]);
    //   if (!results.doctors.includes(results.surgery.doctor[s])) {
    //     results.doctors.push(results.surgery.doctor[s]);
    //   }
    //   for (let d = 0; d < results.doctors.length; d++) {
    //     if (results.doctors[d]._id.toString() == results.surgery.doctor[s]._id.toString()) {
    //       results.doctors[d].selected = 'true';
    //     }
    //   }
    // }

    res.render('surgery_form', {
      title: 'Update Surgery', patients: results.patients, doctors: results.doctors, surgery: results.surgery,
    });
  });
};


// Handle surgery update on POST.
exports.surgery_update_post = [

  // Convert the doctor to an array.
  (req, res, next) => {
    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') { req.body.doctor = []; } else { req.body.doctor = new Array(req.body.doctor); }
    }
    next();
  },

  // Validate fields.
  body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
  body('patient', 'Patient must not be empty.').isLength({ min: 1 }).trim(),
  body('doctor', 'Doctor must not be empty.').isLength({ min: 1 }).trim(),
  body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
  body('date', 'Date must not be empty').isLength({ min: 1 }).trim(),

  // Sanitize fields.
  sanitizeBody('title').trim().escape(),
  sanitizeBody('patient').trim().escape(),
  sanitizeBody('summary').trim().escape(),
  sanitizeBody('date').trim().escape(),
  sanitizeBody('doctor.*').trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Surgery object with escaped/trimmed data and old id.
    const surgery = new Surgery({
      title: req.body.title,
      patient: req.body.patient,
      summary: req.body.summary,
      date: req.body.date,
      status: req.body.status != undefined,
      // doctor: req.body.doctor,
      doctor: (typeof req.body.doctor === 'undefined') ? [] : req.body.doctor,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all patients and doctors for form
      async.parallel({
        patients(callback) {
          Patient.find(callback);
        },
        doctors(callback) {
          Doctor.find(callback);
        },
      }, (err, results) => {
        if (err) { return next(err); }

        // Mark our selected doctors as checked.
        for (let i = 0; i < results.doctors.length; i++) {
          if (surgery.doctor.indexOf(results.doctors[i]._id) > -1) {
            results.doctors[i].selected = 'true';
            results.doctors[i].checked = 'true';
          }
        }

        res.render('surgery_form', {
          title: 'Update Surgery', patients: results.patients, doctors: results.doctors, surgery, errors: errors.array(),
        });
      });
    } else {
      // Data from form is valid. Update the record.
      Surgery.findByIdAndUpdate(req.params.id, surgery, {}, (err, thesurgery) => {
        if (err) { return next(err); }
        // Successful - redirect to surgery detail page.
        res.redirect(thesurgery.url);
      });
    }
  },
];

