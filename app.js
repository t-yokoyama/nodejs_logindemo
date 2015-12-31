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

var dbConfig = require('./config/db.js');
var mongoose = require('mongoose');
mongoose.connect(dbConfig.url);

var passport = require('passport');
var expressSession = require('express-session');
var flash = require('connect-flash');
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

var bcrypt = require('bcrypt-nodejs');

var isValidPassword = function(user, password) {
  return bcrypt.compareSync(password, user.password);
}

var createHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

var LocalStrategy = require('passport-local').Strategy;
var User = require('./models/user.js');

passport.use('login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback : true
  },
  function(req, username, password, done) {

    console.log('searching database for user (login)');
    User.findOne(
      { 'username' : username },
      function(err, user) {

        console.log('entered database callback (login)');

        // case 1) error
        if (err) {
          console.log('login error: ' + err);
          return done(err);
        }

        // case 2) username does not exist
        if (!user) {
          console.log('user not found with username ' + username);
          return done(null, false,
                      req.flash('loginMessage', 'User not found'));
        }

        // case 3) user exists, but wrong password
        if (!isValidPassword(user, password)) {
          console.log('invalid password');
          return done(null, false,
                      req.flash('loginMessage', 'Invalid password'));
        }

        // case 4) user and password match
        console.log('login success');
        return done(null, user);
      }
    );
}));

passport.use('signup', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback : true
  },
  function(req, username, password, done) {

    findOrCreateUser = function() {

      console.log('searching database for user (signup)');
      User.findOne(
        { 'username' : username },
        function(err, user) {

          console.log('entered database callback (signup)');

          // case 1) error
          if (err) {
            console.log('signup error: ' + err);
            return done(err);
          }

          // case 2) username already exists
          if (user) {
            console.log('user already exists: ' + username);
            return done(null, false,
                        req.flash('signupMessage', 'User already exists'));
          } else {

            var newUser = new User();
            newUser.username = username;
            newUser.password = createHash(password);
            newUser.email = req.param('email');

            console.log('attempting to save user to database');
            newUser.save(function(err){
              if (err) {
                console.log('error saving new user: ' + err);
                throw err;
                // FIXME why do we throw here but not above in login?
              }

              console.log('user registration successful');
              return done(null, newUser);
            });
          }
        }
      );
    };

    // FIXME why is this necessary?
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
