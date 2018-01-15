const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;

const SurgerySchema = new Schema({
  title: { type: String, required: true },
  patient: { type: Schema.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, required: true },
  doctor: [{ type: Schema.ObjectId, ref: 'Doctor', required: true }],
  summary: { type: String, required: true },
  status: { type: Boolean, default: false },
});

SurgerySchema.index({ doctor: 1, status: 1 }, { unique: true });

// Virtual for this surgery URL.
SurgerySchema
  .virtual('url')
  .get(function () {
    return `/catalog/surgery/${this._id}`;
  });

SurgerySchema
  .virtual('date_formatted')
  .get(function () {
    return moment(this.date).format('YYYY-MM-DD');
  });

// Export model.
module.exports = mongoose.model('Surgery', SurgerySchema);
