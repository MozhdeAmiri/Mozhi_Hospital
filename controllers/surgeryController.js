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
  async (req, res, next) => {
    console.log(' LOG : in surgery_list ');
    try {
      const surgeryList = await Surgery.find({})
        .populate('patient')
        .populate('doctor')
        .exec();
      const doctors = await Doctor.find().exec(); // for filter
      return res.render('surgery_list', {// Successful, so render
        title: 'Surgery List',
        surgeryList,
        doctors,
      });
    } catch (err) {
      console.log(` ERROR in surgery_list : ${err}`);
      return next(err);
    }
  },
];
// Display list of all surgeries.
exports.surgery_list_post = [
  (req, res, next) => {
    console.log(` LOG : in surgery_list_post - req.body :  ${JSON.stringify(req.body)}`);
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
    // console.log(`startDate--------${startDate}`);
    // console.log(`filterDate--------${filterDate}`);
    // console.log(`endDate--------${endDate}`);

    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') {
        req.body.doctor = [];
      } else {
        req.body.doctor = new Array(req.body.doctor);
      }
    }
    async.parallel({
      surgeries(callback) {
        if (req.body.btn === 'search') {
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
      return res.render('surgery_list', {
        title: 'Surgery List',
        surgeryList: results.surgeries,
        doctors: results.doctors,
        filterDate,
        filteredDoctor,
        statusFilter,
      });
    });
  },
];

// Display detail page for a specific surgery.
exports.surgery_detail = async (req, res, next) => {
  console.log(` LOG : in surgery_detail - req.params :  ${JSON.stringify(req.params)}`);
  try {
    const surgery = await Surgery.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .exec();
    const doctors = await Doctor.find({ surgery: req.params.id }).exec();

    if (surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      return next(err);
    }
    return res.render('surgery_detail', {// Successful, so render.
      title: 'Title',
      surgery,
      doctors,
    });
  } catch (err) {
    return next(err);
  }
};


async function getActiveSurgeries(req, res, next) {
  if (!(req.body.doctor instanceof Array)) {
    if (typeof req.body.doctor === 'undefined') {
      req.body.doctor = [];
    } else {
      req.body.doctor = new Array(req.body.doctor);
    }
  }
  let startDate;
  let endDate;

  if (undefined === req.body.date || req.body.date === '' || req.body.date === null) {
    startDate = new Date('1000/1/1');
    endDate = new Date('9999/1/1');
  } else {
    startDate = moment(req.body.date).startOf('day');
    endDate = moment(startDate).add(1, 'days');
  }
  console.log(`  LOG :   REQ.BODY.STATUS :  ${req.body.status}`);
  console.log(`  LOG :   req.body.doctor :  ${req.body.doctor}`);
  console.log(`  LOG :   req.body.daate :  ${startDate}  -    ${endDate}   `);
  try {
    const activeSurgeries = await Surgery.find().and([
      { _id: { $ne: req.params.id } },
      { status: true },
      { date: { $gte: startDate, $lt: endDate } },
      { doctor: { $in: req.body.doctor } },
    ]).populate('patient').populate('doctor')
      .exec();
    return activeSurgeries;
  } catch (err) {
    return next(err);
  }
}

async function printActiveDoctor(activeSurgeries, req) {
  let myErr = '';
  if (activeSurgeries.length > 0) {
    console.log(`LLLLLIIIIIIIIIISSSSSSSSSSSSTTTTTTTT   ${activeSurgeries}`);
    const activeDoc = [];
    await activeSurgeries.forEach((activeSurgery) => {
      activeSurgery.doctor.forEach((d) => {
        activeDoc.push(d.name);
        console.log(` activeDoc ${activeDoc}`);
      });
    });

    if (activeDoc.length > 1) {
      myErr = `These doctors have active surgery on ${req.body.date} :
      `;
      activeDoc.forEach((a) => {
        myErr += `${a} - `;
      });
    } else {
      myErr = `This doctor has active surgery on ${req.body.date} : 
      ${activeDoc[0]} `;
    }
    console.log(myErr);
  }
  return myErr;
}
// Display surgery create form on GET.
exports.surgery_create_get = async (req, res, next) => {
  console.log(' LOG : in surgery_create_get ');
  // Get all patients and doctors, which we can use for adding to our surgery.
  try {
    const patients = await Patient.find();
    const doctors = await Doctor.find({}).exec();
    return res.render('surgery_form', {
      title: 'Create Surgery',
      patients,
      doctors,
    });
  } catch (err) {
    return next(err);
  }
};

// Handle surgery create on POST.
exports.surgery_create_post = [
  // Convert the doctors to an array.
  (req, res, next) => {
    console.log(' LOG : in surgery_create_post ');
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
  body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
  body('patient', 'Patient must not be empty.').isLength({ min: 1 }).trim(),
  body('doctor', 'Doctor(s) must not be empty.').isLength({ min: 1 }).trim(),
  body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
  body('date', 'Date must not be empty').isLength({ min: 1 }).trim(),

  // Sanitize fields.
  sanitizeBody('*').trim().escape(),
  // Process request after validation and sanitization.
  async (req, res, next) => {
    // Extract the validation errors from a request.
    let errors = validationResult(req);

    // Create a Surgery object with escaped and trimmed data.
    const surgery = new Surgery({
      title: req.body.title,
      patient: req.body.patient,
      summary: req.body.summary,
      date: req.body.date,
      status: req.body.status !== undefined,
      doctor: req.body.doctor,
    });
    const patients = await Patient.find();
    const doctors = await Doctor.find();
    let myErr = '';

    if (undefined === req.body.status || req.body.status !== 'on') {
      myErr = '';
      console.log('  LOG : REQ.BODY.STATUS !== ON ');
    } else {
      try {
        const activeSurgeries = await getActiveSurgeries(req, res, next);
        const printError = await printActiveDoctor(activeSurgeries, req);
        myErr += printError;
      } catch (err) {
        return next(err);
      }
    }

    if (myErr || !errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      errors = errors.isEmpty() ? [] : errors.array();
      errors.push({
        msg: myErr,
      });
      return res.render('surgery_form', {
        title: 'Create Surgery', patients, doctors, surgery, errors,
      });
    }
    return surgery.save((err) => { // Data from form is valid. Save surgery.
      if (err) {
        return next(err);
      }
      return res.redirect(surgery.url);// Successful - redirect to new surgery record.
    });
  },
];

// Display surgery delete form on GET.
exports.surgery_delete_get = async (req, res, next) => {
  console.log(` LOG : in surgery_delete_get : req.params  ${req.params.id}`);
  try {
    const surgery = await Surgery.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .exec();
    if (surgery == null) { // No results.
      res.redirect('/surgeries');
    }
    return res.render('surgery_delete', { // Successful, so render.
      title: 'Delete Surgery',
      surgery,
    });
  } catch (err) {
    return next(err);
  }
};
// Handle surgery delete on POST.
exports.surgery_delete_post = async (req, res, next) => {
  console.log(` LOG : in surgery_delete_post : req.body  ${req.body.id}`);
  try {
  // Surgery has no deependencies. Delete object and redirect to the list of bookinstances.
    return Surgery.findByIdAndRemove(req.body.id, (err) => {
      if (err) { return next(err); }
      return res.redirect('/surgeries'); // Success - go to surgeries list
    });
  } catch (err) { return next(err); }
};

// Display surgery update form on GET.
exports.surgery_update_get = async (req, res, next) => {
  // Get surgery, patients and doctors for form.
  console.log(` LOG : in surgery_update_get : req.params  ${req.params.id}`);
  try {
    const surgery = await Surgery.findById(req.params.id).populate('patient').populate('doctor').exec();
    const patients = await Patient.find();
    const doctors = await Doctor.find();

    if (surgery == null) { // No results.
      const err = new Error('Surgery not found');
      err.status = 404;
      return next(err);
    }
    // Success.
    // Mark our selected doctors as selected.
    await surgery.doctor.forEach((s) => {
      doctors.forEach((d) => {
        if (d._id.toString() === s._id.toString()) {
          d.selected = 'true';
        }
      });
    });
    return res.render('surgery_form', {
      title: 'Update Surgery',
      patients,
      doctors,
      surgery,
    });
  } catch (err) {
    return next(err);
  }
};


async function updateSurgeryFunction(req, res, next, myErr) {
  console.log(' LOG : in updateSurgeryFunction for surgery_update_post ');
  try {
    // Create a Surgery object with escaped/trimmed data and old id.
    const surgery = new Surgery({
      title: req.body.title,
      patient: (typeof req.body.patient === 'undefined') ? [] : req.body.patient,
      summary: req.body.summary,
      date: req.body.date,
      status: req.body.status !== undefined,
      doctor: (typeof req.body.doctor === 'undefined') ? [] : req.body.doctor,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });
    const patients = await Patient.find();
    const doctors = await Doctor.find();
    // Mark our selected doctors as checked.
    for (let i = 0; i < doctors.length; i++) {
      if (surgery.doctor.indexOf(doctors[i]._id) > -1) {
        doctors[i].selected = 'true';
        doctors[i].checked = 'true';
      }
    }
    let errors = validationResult(req); // Extract the validation errors from a request.

    if (myErr || !errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      // Get all patients and doctors for form
      errors = errors.isEmpty() ? [] : errors.array();
      errors.push({
        msg: myErr,
      });
      return res.render('surgery_form', {
        title: 'Update Surgery', patients, doctors, surgery, errors,
      });
    }
    // Data from form is valid. Update the record.
    return Surgery.findByIdAndUpdate(req.params.id, surgery, {}, (err, thesurgery) => {
      if (err) {
        return next(err);
      }
      // Successful - redirect to surgery detail page.
      return res.redirect(thesurgery.url);
    });
  } catch (err) {
    return next(err);
  }
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
  async (req, res, next) => {
    console.log(' LOG : in surgery_update_post ');
    let myErr = '';
    console.log(req.params.id);

    if (!(req.body.doctor instanceof Array)) {
      if (typeof req.body.doctor === 'undefined') {
        req.body.doctor = [];
      } else {
        req.body.doctor = new Array(req.body.doctor);
      }
    }

    if (undefined === req.body.status || req.body.status !== 'on') {
      myErr = '';
      console.log('  LOG : REQ.BODY.STATUS !== ON ');
    } else {
      try {
        const activeSurgeries = await getActiveSurgeries(req, res, next);
        const printError = await printActiveDoctor(activeSurgeries, req);
        myErr += printError;
      } catch (err) {
        return next(err);
      }
    }
    return updateSurgeryFunction(req, res, next, myErr);
  },
];
