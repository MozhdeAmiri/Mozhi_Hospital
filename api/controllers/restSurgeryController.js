const Surgery = require('../../models/surgery');
const Patient = require('../../models/patient');
const Doctor = require('../../models/doctor');
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
    res.json({
      title: 'Mozhi Hospital Home',
      error: err,
      data: results,
    });
  });
};

// Display list of all surgeries.
exports.surgery_list = [
  (req, res, next) => {
    console.log('IN GET surgery_list 1 GET');
    console.log(req.query);
    let filteredDoctor = [];
    let filterDate = req.query.date;
    let startDate;
    let endDate;
    let statusFilter;
    if (undefined === filterDate || filterDate === '' || filterDate === null) {
      startDate = new Date('1000/1/1');
      endDate = new Date('9999/1/1');
    } else {
      startDate = moment(filterDate).startOf('day');
      endDate = moment(startDate).add(1, 'days');
    }
    if (undefined !== req.query.status && req.query.status === 'on') {
      statusFilter = true;
    } else {
      statusFilter = false;
    }
    if (!(req.query.doctor instanceof Array)) {
      if (typeof req.query.doctor === 'undefined') {
        req.query.doctor = [];
      } else {
        req.query.doctor = new Array(req.query.doctor);
      }
    }
    async.parallel({
      surgeries(callback) {
        if (req.query.btn == 'search') {
          if (req.query.doctor.length > 0) {
            req.query.doctor.forEach((d) => {
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
        res.json(err);
        return;
      }
      console.log(filteredDoctor);
      res.json({
        title: 'Surgery List',
        surgery_list: results.surgeries,
        doctors: results.doctors,
        filterDate,
        filteredDoctor,
        statusFilter,
      });
    });
  },
  (req, res, next) => {
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
        res.json(err);
        return;
      }
      res.json({
        title: 'Surgery List',
        surgery_list: result.surgery,
        doctors: result.doctors,
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
      res.json(err);
      return;
    }
    if (results.surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      res.json(err);
      return;
    }
    res.json({
      title: 'Title',
      surgery: results.surgery,
      doctors: results.doctor,
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
                res.json(err);
                return;
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
          res.json(err);
          return;
        }
        // Mark our selected doctors as selected.
        for (let i = 0; i < results.doctors.length; i++) {
          if (surgery.doctor.indexOf(results.doctors[i]._id) > -1) {
            results.doctors[i].selected = 'true';
          }
        }
        res.json({
          title: 'Create Surgery',
          patients: results.patients,
          doctors: results.doctors,
          surgery,
          errors: errors.array(),
        });
      });
    } else {
      // Data from form is valid. Save surgery.
      surgery.save((err, savedSurgery) => {
        if (err) {
          res.json(err);
          return;
        }
        res.json(savedSurgery);
      });
    }
  },
];

// Handle surgery delete on POST.
exports.surgery_delete = (req, res, next) => {
  Surgery.remove({
    _id: req.params.id,
  }, (errS, deletedSurgery) => {
    if (errS) { res.json(errS); return; }
    res.json({ message: 'Surgery successfully deleted', deletedSurgery });
    console.log('DELETEEEEEEEEEEEEE shoddddddddddddddd');
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
      res.json(err);
      return;
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
      res.json({
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
          res.json(err);
          return;
        }
        res.json(thesurgery);
      });
    }
  });
}

// Handle surgery update on POST.
exports.surgery_update_put = [

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
  sanitizeBody('doctor').trim().escape(),

  // Convert the doctor to an array.
  (req, res, next) => {
    // Extract the validation errors from a request.
    let myErr = '';
    const filterDate = req.body.date;
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
      myChecks(req, res, next, myErr);
    } else {
      console.log(`|||||||||||||||||||  req.body.doctor :  ${req.body.doctor}`);
      Surgery.find().and([
        // _id: { $ne: req.params.id },
        { status: true },
        { date: { $gte: startDate, $lt: endDate } },
        { doctor: { $in: req.body.doctor } },
      ]).populate('patient')
        .exec((err, list) => {
          if (err) {
            res.json(err);
            return;
          }
          // Successful
          if (list.length > 0) {
            myErr = `This doctor has active surgery on ${req.body.date}`;
            res.json(myErr);
            return;
          }
          myChecks(req, res, next, myErr);
        });
    }
  },
];
