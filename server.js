const express = require('express');
const path = require('path');
const mysql = require('./dbcon.js');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const flash = require('connect-flash');
const morgan = require('morgan');
const multer = require('multer');
require('./config/passport')(passport);
const app = express();
const handlebars = require('express-handlebars').create({
    defaultLayout: 'main'
});
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
          cb(null, 'uploads/notes/')
        },
    filename: (req, file, cb) => {
          cb(null, file.fieldname + '-' + Date.now())
        }
});
const upload = multer({storage: storage});
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true
    })
);
app.use(passport.initialize());
app.use(passport.session()); // Persistent login sessions
app.use(flash()); // Flash messages stored in session

app.use(function (req, res, next) {
    res.locals.user =
        req.session.passport && req.session.passport.user
            ? req.session.passport.user
            : null;
    console.log(res.locals);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/util', express.static('util'));

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
app.set('port', 3000);

app.get('/', function (req, res, next) {
    res.render('home');
});

app.get('/login', function (req, res, next) {
    res.render('login');
})

app.post(
    "/login",
    passport.authenticate("local-login", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true
    }),
    function (req, res) {
        if (req.body.remember) {
            req.session.cookie.maxAge = 1000 * 60 * 30;
        } else {
            req.session.cookie.expires = false;
        }
        res.redirect("/");
    }
);

app.get("/logout", function (req, res) {
    res.locals.user = null;
    req.logout();
    res.redirect("/");
});

app.get('/register', function (req, res, next) {
    res.render('register');
})

app.post(
    "/register",
    passport.authenticate("local-signup", {
        successRedirect: "/survey",
        failureRedirect: "/register",
        failureFlash: true
    })
);

app.route('/survey')
    .get(function(req, res){
        mysql.pool.query(
            "SELECT * FROM question INNER JOIN survey ON question.survey_id=survey.survey_id WHERE survey.name = 'registration'",
            function (err, questions) {
                if (err) {
                    res.end();
                } else {
                    const context = {};
                    context.questions = questions;
                    res.render('survey', context);
                }
            }
        );
    })
    .post(function(req, res){
        var answers = req.body;

        for (var a in answers) {
            mysql.pool.query(
                "INSERT INTO answer (user_id, question_id, text) VALUES (?, ?, ?)",
                [res.locals.user, a, answers[a]],
                function (err, result) {
                    if (err) {
                        res.end();
                    }
                    else {
                        //
                    }
                }
            );
        }
        res.redirect('/');
    })

function isLoggedIn(req, res, next) {
    // If user is athenticated in the session, carry on
    if (req.isAuthenticated()) return next();
    // If they aren't redirect them to the home page
    res.redirect("/");
}

function makeGroup(groupname){
  console.log("Adding group ",groupname," to database.");
  mysql.pool.query(
    "INSERT INTO groups (group_id, name) VALUES (?, ?)",
    [groupname, 1],
    function (err, result) {
      if (err) {
        console.log("AAAAAa");
        res.end();
      }
      else {
        //
      }
    });
  }

// Only allows user to access profile if they are authenticated
app.get("/profile", isLoggedIn, function (req, res, next) {
  const userId = req.session.passport.user;
  const context = {};
  mysql.pool.query(
    "SELECT * FROM user WHERE user.user_id = ?",
    [userId],
    function (err, user) {
      if (err) {
        res.end();
      } else {
        context.user = user[0];
        console.log("Querying from profile page", user);
      }
      });
                  console.log("Querying Groups");
      mysql.pool.query(
        "SELECT * FROM groups",
        function (err,groups) {
          if (err){
            res.end();
          }else{
            var testgroups = [{name: "test12", group_id: "1111"},{name: "test0", group_id: "1112"}]
            context.groups = testgroups;
          }
        });
      res.render("profile", context);
    });
// TODO:
// - add a CR system so user can upload and view notes
//   - get controller
//   - get view
//   - post controller logic
// - add tests to system so we can have validation around this process
//
// add route here that allows the user to add notes, only if they're logged in
app.get("/notes", isLoggedIn, function (req, res, next) {
    const userId = req.session.passport.user;
    mysql.pool.query(
        "SELECT * FROM notes WHERE notes.user_id = ?",
        [userId],
        function (err, notes) {
            if (err) {
                res.end();
            } else {
                const context = {};
                context.notes = notes;
                console.log("Querying from note page", notes);
                res.render("notes", context);
            }
        }
    );
});

app.post("/notes", [isLoggedIn, upload.single("note-upload")], function (req, res) {
    var queryString;
    var queryValues;
    const userId = req.session.passport.user;
    if(req.file === undefined) {
      queryString = "INSERT INTO notes (user_id, title, text) VALUES (?,?,?)";
      queryValues = [userId, req.body.title, req.body.text]
    }
    else {
      queryString = "INSERT INTO notes (user_id, title, text, attachment, file_name) VALUES (?,?,?,?,?)";
      queryValues = [userId, req.body.title, req.body.text, __dirname + "/" + req.file.path, req.file.filename]
    }
    mysql.pool.query(
        queryString,
        queryValues,
        function (err, notes) {
            if (err) {
                res.end();
            } else {
              console.log("New note creation successful ", notes);
              res.redirect('notes');
            }
        }
    );
});

app.get('/note-download/:file', function(req, res){
  var file = __dirname + "/uploads/notes/" + req.params.file;
  res.download(file);
});


app.use(function (req, res) {
    res.status(404);
    res.render('404');
});


app.listen(app.get('port'), function () {
    console.log(
        'Express started on http://localhost:' +
        app.get('port') +
        '; press Ctrl-C to terminate.'
    );
});
