const express = require('express');
const path = require('path');
const mysql = require('./dbcon.js');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const flash = require('connect-flash');
const morgan = require('morgan');
require('./config/passport')(passport);
const app = express();
const handlebars = require('express-handlebars').create({
    defaultLayout: 'main'
});
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


// Only allows user to access profile if they are authenticated
app.get("/profile", isLoggedIn, function (req, res, next) {
    const userId = req.session.passport.user;
    mysql.pool.query(
        "SELECT * FROM user WHERE user.user_id = ?",
        [userId],
        function (err, user) {
            if (err) {
                res.end();
            } else {
                const context = {};
                context.user = user[0];
                console.log("Querying from profile page", user);
                res.render("profile", context);
            }
        }
    );
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
