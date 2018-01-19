const restRoute = require('./restRoute');
const surgeryRoute = require('./surgeryRoute');
const patientRoute = require('./patientRoute');
const doctorRoute = require('./doctorRoute');

module.exports = (app) => {

  doctorRoute('/doctor', app); // register the doctorRoute
  patientRoute('/patient', app); // register the patientRoute
  surgeryRoute('/surgery', app); // register the surgeryRoute

  restRoute('/api', app); // register the REST route

};
