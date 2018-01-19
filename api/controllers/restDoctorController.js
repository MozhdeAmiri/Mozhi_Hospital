const Doctor = require('../../models/doctor');
const Surgery = require('../../models/surgery');
const async = require('async');

const {
  body,
  validationResult,
} = require('express-validator/check');
const {
  sanitizeBody,
} = require('express-validator/filter');

// Display list of all Doctors.
exports.doctor_list = (req, res, next) => {
  console.log('doctor_list doctor_list doctor_list doctor_list');
  Doctor.find()
    .exec((err, doctorsList) => {
      if (err) {
        res.json(err);
        return;
      }
      res.json(doctorsList); // Successful, so render.
    });
};

// Display detail page for a specific Doctor.
exports.doctor_detail = (req, res, next) => {
  async.parallel({
    doctor(callback) {
      Doctor.findById(req.params.id).exec(callback);
    },
    surgery_doctors(callback) {
      Surgery.find({
        doctor: req.params.id,
      }).populate('doctor').exec(callback);
    },
  }, (err, results) => {
    if (err) {
      res.json(err);
      return;
    }
    if (results.doctor == null) { // No results.
      res.json({
        ERROR: 'No Doctor',
      });
    }
    // Successful, so render.
    res.json({
      title: 'Doctor',
      doctor: results.doctor,
      surgeries: results.surgery_doctors,
    });
  });
};

// Handle Doctor create on POST.
exports.doctor_create_post = [
  // Validate fields.
  body('gender', 'Gender must be specified').isLength({
    min: 1,
  }).trim(),
  body('date_of_birth', 'Invalid date').optional({
    checkFalsy: true,
  }).isISO8601(),

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
      res.json({
        title: 'Create Doctor',
        doctor,
        errors: errors.array(),
      });
      return;
    }
    // Data from form is valid
    doctor.save((err, savedDoctor) => {
      if (err) {
        res.send(err);
      }
      res.json(savedDoctor);
    });
  },
];

// Handle Doctor delete on POST.
exports.doctor_delete = (req, res, next) => {
  // Assume the post has valid id (ie no validation/sanitization).
  // async.parallel({
  //   doctor(callback) {
  //     Doctor.findById(req.params.id).populate('patient').populate('surgery').exec(callback);
  //   },
  //   surgery_doctors(callback) {
  //     Surgery.find({
  //       doctor: req.params.id
  //     }).exec(callback);
  //   },
  // }, (err, results) => {
  //   if (err) {
  //     res.json(err);
  //     return;
  //   }
  //   // Success
  //   if (results.surgery_doctors.length > 0) {
  //     // Doctor has surgeries. Render in same way as for GET route.
  //     res.json({
  //       ERROR: 'Doctor has surgeries - Cant be deleted',
  //       doctor: results.doctor,
  //       surgeries: results.surgery_doctors
  //     });
  //     return;
  //   }
  // Doctor has no Surgery objects. Delete object and redirect to the list of surgeries.
  Doctor.remove({
    _id: req.params.id,
  }, (errS, deletedDoctor) => {
    if (errS) { res.json(errS); return; }
    res.json({ message: 'Doctor successfully deleted', deletedDoctor });
    console.log('Doctor DELETEEEEEEEEEEEEE shoddddddddddddddd');
  });
  // });
};

// Handle Doctor update on POST.
exports.doctor_update_put = [
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
  body('date_of_birth', 'Invalid date of birth').optional({
    checkFalsy: true,
  }).isISO8601(),

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
      return res.json({
        title: 'There are errors in Updating Doctor',
        doctor,
        errors: errors.array(),
      });
    }
    // Data from form is valid. Update the record.
    return Doctor.findByIdAndUpdate(req.params.id, doctor, {}, (err, thedoctor) => {
      if (err) {
        return res.json(err);
      }
      // Successful - redirect to doctor detail page.
      return res.json({
        MESSAGE: 'Updated Doctor Successfully',
        thedoctor,
      });
    });
  },
];
