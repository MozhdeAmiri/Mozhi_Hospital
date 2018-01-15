const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const index = require('./routes/index');
const users = require('./routes/users');
const catalog = require('./routes/catalog'); // Import routes for "catalog" area of site
const compression = require('compression');
const helmet = require('helmet');

// SET DEBUG=express-locallibrary-tutorial:* & npm start
// SET DEBUG=express-locallibrary-tutorial:* & npm run devstart
// nodemon


// Create the Express application object
const app = express();

app.use(helmet());

// Set up mongoose connection
const mongoose = require('mongoose');

const dev_db_url = 'mongodb://mozhde:mozhde@ds251217.mlab.com:51217/mozhde_hospital';
const mongoDB = process.env.MONGODB_URI || dev_db_url;
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

// Uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(compression()); // Compress all routes

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/catalog', catalog); // Add catalog routes to middleware chain.

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
