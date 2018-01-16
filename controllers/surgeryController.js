const Surgery = require('../models/surgery');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const moment = require('moment');

const {
  body,
  validationResult,
} = require('express-validator/check');
const {
  sanitizeBody,
} = require('express-validator/filter');

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
      Surgery.count({
        status: true,
      }, callback);
    },
    patient_count(callback) {
      Patient.count(callback);
    },
  }, (err, results) => {
    res.render('index', {
      title: 'Mozhi Hospital Home',
      error: err,
      data: results,
    });
  });
};


// Display list of all surgeries.
exports.surgery_list = [
  (req, res, next) => {
    console.log('IN GET surgery_list GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEETTTTTTTTTTT');
    async.parallel({
      surgery(callback) {
        Surgery.find({})
          .populate('patient')
          .populate('doctor')
          .exec(callback);
      },
      doctors(callback) {
        Doctor.find()
          .exec(callback);
      },
    }, (err, result) => {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render('surgery_list', {
        title: 'Surgery List',
        surgery_list: result.surgery,
        doctors: result.doctors,
      });
    });
  },
];
// Display list of all surgeries.
exports.surgery_list_post = [
  (req, res, next) => {
    let filteredDoctor = [];
    let filterDate = req.body.date;
    let startDate;
    let endDate;

    let statusFilter = false;
    if (undefined === filterDate || filterDate === '' || filterDate === null) {
      startDate = new Date('1000/1/1');
      endDate = new Date('9999/1/1');
    } else {
      startDate = moment(filterDate).startOf('day');
      endDate = moment(startDate).add(1, 'days');
    }
    if (req.body.status === 'on') {
      statusFilter = true;
    }
    console.log(`startDate--------${startDate}`);
    console.log(`filterDate--------${filterDate}`);
    console.log(`endDate--------${endDate}`);

    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') {
        req.body.doctor = [];
      } else {
        req.body.doctor = new Array(req.body.doctor);
      }
    }
    async.parallel({
      surgeries(callback) {
        if (req.body.btn == 'search') {
          if (req.body.doctor.length > 0) {
            req.body.doctor.forEach((d) => {
              filteredDoctor.push(JSON.parse(d)._id.toString());
            });
            Surgery.find().and([
              { status: statusFilter },
              { date: { $gte: startDate, $lt: endDate } },
              { doctor: { $in: filteredDoctor } },
            ]).populate('patient').populate('doctor')
              .exec(callback);
          } else {
            Surgery.find().and([
              { status: statusFilter },
              { date: { $gte: startDate, $lt: endDate } },
            ]).populate('patient').populate('doctor')
              .exec(callback);
          }
        } else {
          Surgery.find({}).populate('patient').populate('doctor').exec(callback);
          filterDate = undefined;
          filteredDoctor = [];
          statusFilter = undefined;
        }
      },
      doctors(callback) {
        Doctor.find({ })
          .exec(callback);
      },
    }, (err, results) => {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render('surgery_list', {
        title: 'Surgery List',
        surgery_list: results.surgeries,
        doctors: results.doctors,
        filterDate,
        filteredDoctor,
        statusFilter,
      });
    });
  },
];

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
      Doctor.find({
        surgery: req.params.id,
      })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) {
      return next(err);
    }
    if (results.surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      return next(err);
    }
    // Successful, so render.
    res.render('surgery_detail', {
      title: 'Title',
      surgery: results.surgery,
      doctors: results.doctor,
    });
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
      Surgery.find({
        status: true,
      })
        .populate('doctor')
        .exec((err, listActiveSurgeries) => {
          if (err) {
            return next(err);
          }
          // Successful
          const activeDoctors = [];
          listActiveSurgeries.forEach((s) => {
            activeDoctors.push(s.doctor[0]._id);
          });
          Doctor.find({
            _id: {
              $nin: activeDoctors,
            },
          })
            .exec(callback);
        });
    },
  }, (err, results) => {
    if (err) {
      return next(err);
    }

    res.render('surgery_form', {
      title: 'Create Surgery',
      patients: results.patients,
      doctors: results.doctors,
    });
  });
};

// Handle surgery create on POST.
exports.surgery_create_post = [
  // Convert the doctors to an array.
  (req, res, next) => {
    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') {
        req.body.doctor = [];
      } else {
        req.body.doctor = new Array(req.body.doctor);
      }
    }
    next();
  },

  // Validate fields.
  body('title', 'Title must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('patient', 'Patient must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('doctor', 'Doctor(s) must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('summary', 'Summary must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('date', 'Date must not be empty').isLength({
    min: 1,
  }).trim(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
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
          Surgery.find({
            status: true,
          })
            .populate('doctor')
            .exec((err, listActiveSurgeries) => {
              if (err) {
                return next(err);
              }
              // Successful
              const activeDoctors = [];
              listActiveSurgeries.forEach((s) => {
                activeDoctors.push(s.doctor[0]._id);
              });
              Doctor.find({
                _id: {
                  $nin: activeDoctors,
                },
              })
                .exec(callback);
            });
        },
      }, (err, results) => {
        if (err) {
          return next(err);
        }

        // Mark our selected doctors as selected.
        for (let i = 0; i < results.doctors.length; i++) {
          if (surgery.doctor.indexOf(results.doctors[i]._id) > -1) {
            results.doctors[i].selected = 'true';
          }
        }
        res.render('surgery_form', {
          title: 'Create Surgery',
          patients: results.patients,
          doctors: results.doctors,
          surgery,
          errors: errors.array(),
        });
      });
    } else {
      // Data from form is valid. Save surgery.
      surgery.save((err) => {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new surgery record.
        res.redirect(surgery.url);
      });
    }
  },
];


// Display surgery delete form on GET.
exports.surgery_delete_get = (req, res, next) => {
  console.log(`===============surgery_delete_get   ${req.params.id}`);
  Surgery.findById(req.params.id)
    .populate('patient')
    .populate('doctor')
    .exec((err, surgery) => {
      if (err) {
        return next(err);
      }
      if (surgery == null) { // No results.
        res.redirect('/catalog/surgeries');
      }
      // Successful, so render.
      res.render('surgery_delete', {
        title: 'Delete Surgery',
        surgery,
      });
    });
};

// Handle surgery delete on POST.
exports.surgery_delete_post = (req, res, next) => {
  console.log(`-----------------surgery_delete_post   ${req.params.id}`);

  Surgery.findById(req.body.surgery).exec((err, surgery) => {
    if (err) { return next(err); }
    // Success
    // Surgery has no deependencies. Delete object and redirect to the list of bookinstances.
    Surgery.findByIdAndRemove(req.body.id, (err) => {
      if (err) { return next(err); }
      // Success - go to surgeries list
      res.redirect('/catalog/surgeries');
    });
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
    if (err) {
      return next(err);
    }
    if (results.surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      return next(err);
    }
    // Success.
    // Mark our selected doctors as selected.
    results.surgery.doctor.forEach((s) => {
      results.doctors.forEach((d) => {
        if (d._id.toString() == s._id.toString()) {
          d.selected = 'true';
        }
      });
    });
    res.render('surgery_form', {
      title: 'Update Surgery',
      patients: results.patients,
      doctors: results.doctors,
      surgery: results.surgery,
    });
  });
};


function myChecks(req, res, next, myErr) {
  // Create a Surgery object with escaped/trimmed data and old id.
  const surgery = new Surgery({
    title: req.body.title,
    patient: (typeof req.body.patient === 'undefined') ? [] : req.body.patient,
    summary: req.body.summary,
    date: req.body.date,
    status: req.body.status != undefined,
    doctor: (typeof req.body.doctor === 'undefined') ? [] : req.body.doctor,
    _id: req.params.id, // This is required, or a new ID will be assigned!
  });

  async.parallel({
    patients(callback) {
      Patient.find(callback);
    },
    doctors(callback) {
      Doctor.find(callback);
    },
  }, (err, results) => {
    if (err) {
      return next(err);
    }
    // Mark our selected doctors as checked.
    for (let i = 0; i < results.doctors.length; i++) {
      if (surgery.doctor.indexOf(results.doctors[i]._id) > -1) {
        results.doctors[i].selected = 'true';
        results.doctors[i].checked = 'true';
      }
    }
    let errors = validationResult(req);

    if (myErr || !errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      // Get all patients and doctors for form
      errors = errors.isEmpty() ? [] : errors.array();
      errors.push({
        msg: myErr,
      });
      res.render('surgery_form', {
        title: 'Update Surgery',
        patients: results.patients,
        doctors: results.doctors,
        surgery,
        errors,
      });
    } else {
      // Data from form is valid. Update the record.
      Surgery.findByIdAndUpdate(req.params.id, surgery, {}, (err, thesurgery) => {
        if (err) {
          return next(err);
        }
        // Successful - redirect to surgery detail page.
        res.redirect(thesurgery.url);
      });
    }
  });
}

// Handle surgery update on POST.
exports.surgery_update_post = [

  // Validate fields.
  body('title', 'Title must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('patient', 'Patient must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('doctor', 'Doctor must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('summary', 'Summary must not be empty.').isLength({
    min: 1,
  }).trim(),
  body('date', 'Date must not be empty').isLength({
    min: 1,
  }).trim(),

  // Sanitize fields.
  sanitizeBody('title').trim().escape(),
  sanitizeBody('patient').trim().escape(),
  sanitizeBody('summary').trim().escape(),
  sanitizeBody('date').trim().escape(),
  sanitizeBody('doctor').trim().escape(),


  // Convert the doctor to an array.
  (req, res, next) => {
    // Extract the validation errors from a request.
    let myErr = '';
    let filterDate = req.body.date;
    let startDate;
    let endDate;

    if (undefined === filterDate || filterDate === '' || filterDate === null) {
      startDate = new Date('1000/1/1');
      endDate = new Date('9999/1/1');
    } else {
      startDate = moment(filterDate).startOf('day');
      endDate = moment(startDate).add(1, 'days');
    }

    console.log(req.params.id);

    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') {
        req.body.doctor = [];
      } else {
        req.body.doctor = new Array(req.body.doctor);
      }
    }
    if (undefined === req.body.status || req.body.status !== 'on') {
      console.log('&&&&&&&&&&&&&&&&&  REQ.BODY.STATUS !== ON ');
      myChecks(req, res, next, myErr);
    } else {
      console.log('|||||||||||||||||||  REQ.BODY.STATUS ');
      console.log(`|||||||||||||||||||  req.body.doctor :  ${req.body.doctor}`);
      
      Surgery.find().and([
        // _id: { $ne: req.params.id },
        { status: true },
        { date: { $gte: startDate, $lt: endDate } },
        { doctor: { $in: req.body.doctor } },
      ]).populate('patient')
        .exec((err, list) => {
          if (err) {
            return next(err);
          }
          // Successful
          if (list.length > 0) {
            console.log(`LLLLLIIIIIIIIIIIIIIIIIIIIISSSSSSSSSSSSSSSSSSSSSSTTTTTTTTTTTTTTTTT${list}`);
            myErr = `This doctor has active surgery on ${req.body.date}`;
            console.log(myErr);
          }
          myChecks(req, res, next, myErr);
        });
    }
  },
];
