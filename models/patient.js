const mongoose = require('mongoose');
const moment = require('moment'); // For date handling.

const Schema = mongoose.Schema;

const PatientSchema = new Schema({
  first_name: { type: String, required: true, max: 100 },
  family_name: { type: String, required: true, max: 100 },
  date_of_birth: { type: Date },
  gender: { type: Array, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String },
} );

// Virtual for patient "full" name.
PatientSchema
  .virtual('name')
  .get(function () {
    return `${this.family_name}, ${this.first_name}`;
  });

// Virtual for this patient instance URL.
PatientSchema
  .virtual('url')
  .get(function () {
    return `/patient/${this._id}`;
  });


PatientSchema
  .virtual('date_of_birth_yyyy_mm_dd')
  .get(function () {
    return moment(this.date_of_birth).format('YYYY-MM-DD');
  });

// Export model.
module.exports = mongoose.model('Patient', PatientSchema);
