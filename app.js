/*
reference links:

http://code.tutsplus.com/tutorials/authenticating-nodejs-applications-with-passport--cms-21619
https://scotch.io/tutorials/easy-node-authentication-setup-and-local
https://truongtx.me/2014/03/29/authentication-in-nodejs-and-expressjs-with-passportjs-part-1/
*/

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// ! BEGIN LOGIN CODE

console.log('begin login configuration');

var passport = require('passport');
var expressSession = require('express-session');
var flash = require('connect-flash');
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var bcrypt = require('bcrypt-nodejs');

var isValidPassword = function(passwordHash, password) {
  return bcrypt.compareSync(password, passwordHash);
}

var createHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

var LocalStrategy = require('passport-local').Strategy;
var db = require('./config/db.js');

passport.use('login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback : true
  },
  function(req, username, password, done) {
    console.log('searching database for user (login)');

    db.query(
      'SELECT * FROM users u WHERE u.username = $1::text',
      [username],
      function(err, result) {
        if (err) {
          return console.error('error running query', err);
        }

        if (result.rows.length < 1) {
          console.log('user not found with username ' + username);
          return done(null, false,
                      req.flash('loginMessage', 'User not found'));
        }

        if (!isValidPassword(result.rows[0].password, password)) {
          console.log('invalid password');
          return done(null, false,
                      req.flash('loginMessage', 'Invalid password'));
        }

        console.log('login success');
        var user = { id: result.rows[0].id,
                     username: username,
                     password: result.rows[0].password,
                     email: result.rows[0].email }
        return done(null, user);
      }
    );
  }
));

passport.use('signup', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback : true
  },
  function(req, username, password, done) {

    findOrCreateUser = function() {
      console.log('searching database for user (signup)');

      db.query(
        'SELECT u.password FROM users u WHERE u.username = $1::text',
        [username],
        function(err, result) {
          if (err) {
            return console.error('error running query', err);
          }

          if (result.rows.length > 0) {
            console.log('user already exists: ' + username);
            return done(null, false,
                        req.flash('signupMessage', 'User already exists'));
          }

          var passwordHash = createHash(password);
          var email = req.body.email;
          db.query(
            'INSERT INTO users (username, password, email) VALUES ($1::text, $2::text, $3::text) RETURNING id',
            [username, passwordHash, email],
            function(err, result) {
              if (err) {
                return console.error('error running query', err);
              }

              console.log('user registration successful');
              var user = { id: result.rows[0].id,
                           username: username,
                           password: passwordHash,
                           email: email }
              return done(null, user);
            }
          );

        }
      );

    };

    // delay execution of findOrCreateUser()
    process.nextTick(findOrCreateUser);
}));

console.log('end login configuration');

// ! END LOGIN CODE


var routes = require('./routes/index');
routes(app, passport);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
