module.exports = function(app, passport) {

  /* GET home page. */
  app.get('/', function(req, res) {
    res.render('index');
  });

  /* GET login page. */
  app.get('/login', function(req, res) {
    res.render('login', { loginMessage: req.flash('loginMessage') });
  });

  /* GET signup page. */
  app.get('/signup', function(req, res) {
    res.render('signup', { signupMessage: req.flash('signupMessage') });
  });

  /* GET profile page. */
  app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile', { user: req.user });
  });

  /* Handle login POST */
  app.post('/login', passport.authenticate('login', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash : true
  }));

  /* Handle Registration POST */
  app.post('/signup', passport.authenticate('signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash : true
  }));

  /* Handle logout. */
  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });
}

function isLoggedIn(req, res, next) {

  if (req.isAuthenticated())
  	return next();

  res.redirect('/login');
}


