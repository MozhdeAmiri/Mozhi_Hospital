const Doctor = require('../models/doctor');
const Surgery = require('../models/surgery');

const {
  body,
  validationResult,
} = require('express-validator/check');
const {
  sanitizeBody,
} = require('express-validator/filter');

// Display list of all Doctors.
exports.doctor_list = async (req, res, next) => {
  console.log(' LOG : in doctor_list ');
  try {
    const listDoctors = await Doctor.find().exec();
    return res.render('doctor_list', { title: 'Doctor List', listDoctors }); // Successful, so render.
  } catch (err) {
    console.log(` ERROR in doctor_list : ${err}`);
    return next(err);
  }
};

// Display detail page for a specific Doctor.
exports.doctor_detail = async (req, res, next) => {
  console.log(' LOG : in doctor_detail ');
  try {
    const doctor = await Doctor.findById(req.params.id).exec();
    if (doctor == null) { // No results.
      return res.redirect('/doctors');
    }
    const surgeryDoctors = await Surgery.find({ doctor: req.params.id }).populate('doctor').populate('patient').exec();
    return res.render('doctor_detail', { title: 'Doctor', doctor, surgeryDoctors }); // Successful, so render.
  } catch (err) {
    console.log(` ERROR in doctor_detail : ${err}`);
    return next(err);
  }
};

// Display Doctor create form on GET.
exports.doctor_create_get = (req, res) => {
  console.log(` LOG : in doctor_create_get --- req.params : ${req.params}`);
  res.render('doctor_form', { title: 'Create Doctor' });
};

// Handle Doctor create on POST.
exports.doctor_create_post = (req, res, next) => {
  console.log(` LOG : in doctor_create_post --- req.body : ${JSON.stringify(req.body)}`);

  // Process request after validation and sanitization.
  const errors = validationResult(req); // Extract the validation errors from a request.
  // Validate fields.
  body('gender', 'Gender must be specified').isLength({ min: 1 }).trim();
  body('date_of_birth', 'Invalid date').optional({ checkFalsy: true }).isISO8601();

  // Sanitize fields.
  sanitizeBody('gender').trim().escape();
  sanitizeBody('extraInfo').trim().escape();
  sanitizeBody('expertise').trim().escape();
  sanitizeBody('date_of_birth').toDate();

  const doctor = new Doctor({ // Create a Doctor object with escaped and trimmed data.
    first_name: req.body.first_name,
    family_name: req.body.family_name,
    gender: req.body.gender,
    extraInfo: req.body.extraInfo,
    expertise: req.body.expertise,
    date_of_birth: req.body.date_of_birth,
  });
  if (!errors.isEmpty()) { // errors. Render form again with sanitized values and error messages.
    res.render('doctor_form', {
      title: 'Create Doctor',
      doctor,
      errors: errors.array(),
    });
    return;
  }
  // Data from form is valid
  doctor.save((err) => {
    if (err) {
      console.log(` ERROR in saving Doctor : ${err}`);
      return next(err);
    }
    return res.redirect(doctor.url); // Successful - redirect to new record.
  });
};

// Display Doctor delete form on GET.
exports.doctor_delete_get = async (req, res, next) => {
  console.log(' LOG : in doctor_delete_get ');
  try {
    const doctor = await Doctor.findById(req.params.id).exec();
    const surgeryDoctors = await Surgery.find({
      doctor: req.params.id,
    }).populate('doctor').populate('patient').exec();

    if (doctor == null) { // No results.
      return res.redirect('/doctors');
    }
    return res.render('doctor_delete', { title: 'Delete Doctor', doctor, surgeryDoctors }); // Successful, so render.
  } catch (err) {
    console.log(` ERROR in doctor_delete_get : ${err}`);
    return next(err);
  }
};

// Handle Doctor delete on POST.
exports.doctor_delete_post = async (req, res, next) => {
  try {
    console.log(' LOG : in doctor_delete_post ');
    // Assume the post has valid id (ie no validation/sanitization).
    const doctor = await Doctor.findById(req.params.id).populate('patient').populate('surgery').exec();
    const surgeryDoctors = await Surgery.find({ doctor: req.params.id }).exec();

    if (surgeryDoctors.length > 0) {
      // Doctor has surgeries. Render in same way as for GET route.
      return res.render('doctor_delete', {
        title: 'Delete Doctor',
        doctor,
        surgeryDoctors,
      });
    }
    // Doctor has no Surgery objects. Delete object and redirect to the list of surgeries.
    return Doctor.findByIdAndRemove(req.body.id, (errDB) => {
      if (errDB) {
        console.log(` ERROR in findByIdAndRemove : ${errDB}`);
        return next(errDB);
      }
      return res.redirect('/doctors'); // Success, so redirect to list of Doctor items.
    });
  } catch (err) {
    console.log(` ERROR in doctor_delete_post : ${err}`);
    return next(err);
  }
};

// Display Doctor update form on GET.
exports.doctor_update_get = async (req, res, next) => {
  console.log(' LOG : in doctor_update_get ');
  try {
    const doctor = await Doctor.findById(req.params.id);// Get doctors for form.
    if (doctor == null) { // No results.
      const err = new Error('Doctor not found');
      err.status = 404;
      return next(err);
    }
    return res.render('doctor_form', { title: 'Update Doctor', doctor });
  } catch (errDB) {
    return next(errDB);
  }
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
  async (req, res, next) => {
    console.log(' LOG : in doctor_update_post ');
    const errors = validationResult(req); // Extract the validation errors from a request.
    const doctor = new Doctor({// Create a Doctor object with escaped/trimmed data and current id.
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      gender: req.body.gender,
      extraInfo: req.body.extraInfo,
      expertise: req.body.expertise,
      date_of_birth: req.body.date_of_birth,
      _id: req.params.id,
    });
    if (!errors.isEmpty()) { // errors. Render the form again with sanitized values and error msgs
      res.render('doctor_form', {
        title: 'Update Doctor',
        doctor,
        errors: errors.array(),
      });
    } else { // Data from form is valid. Update the record.
      await Doctor.findByIdAndUpdate(req.params.id, doctor, {}, (err, thedoctor) => {
        if (err) { return next(err); }
        // Successful - redirect to doctor detail page.
        return res.redirect(thedoctor.url);
      });
    }
  },
];
