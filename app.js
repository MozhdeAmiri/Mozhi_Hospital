const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');

const router = require('./routes/router');

// SET DEBUG=mozhde_hospital:* & npm run devstart

// Create the Express application object
const app = express();

app.use(helmet());

// Set up mongoose connection
const mongoose = require('mongoose');

const devDbUrl = 'mongodb://mozhde:mozhde@ds251217.mlab.com:51217/mozhde_hospital';
const mongoDB = process.env.MONGODB_URI || devDbUrl;
mongoose.connect(mongoDB, {
  useMongoClient: true,
});
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.collection('surgery').createIndex({ title: 1, status: 1 }, { unique: true });

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(compression()); // Compress all routes

app.use(express.static(path.join(__dirname, 'public')));

router(app); // register the route

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  console.log(' LOG : in app.use((req, res, next) ');
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  console.log(' LOG : in app.use((err, req, res, next) ');
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
