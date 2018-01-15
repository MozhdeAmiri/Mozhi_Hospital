const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;

const DoctorSchema = new Schema({
  first_name: { type: String, required: true, max: 100 },
  family_name: { type: String, required: true, max: 100 },
  date_of_birth: { type: Date },
  expertise: { type: Array, required: true },
  gender: { type: Array, required: true },
  extraInfo: { type: String },
});

// Virtual for doctor "full" name.
DoctorSchema
  .virtual('name')
  .get(function () {
    return `${this.family_name}, ${this.first_name}`;
  });

// Virtual for this doctor object's URL.
DoctorSchema
  .virtual('url')
  .get(function () {
    return `/catalog/doctor/${this._id}`;
  });


DoctorSchema
  .virtual('date_of_birth_formatted')
  .get(function () {
    return moment(this.date_of_birth).format('MMMM Do, YYYY');
  });

DoctorSchema
  .virtual('date_of_birth_yyyy_mm_dd')
  .get(function () {
    return moment(this.date_of_birth).format('YYYY-MM-DD');
  });


// Export model.
module.exports = mongoose.model('Doctor', DoctorSchema);
