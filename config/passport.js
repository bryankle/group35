const LocalStrategy = require('passport-local').Strategy;
const mysql = require('../dbcon.js');
const bcrypt = require('bcrypt-nodejs');

module.exports = function(passport) {
    // Serialize user for this session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    })

    // Deserialize user
    passport.deserializeUser(function(id, done) {
        console.log('Deserializing user id: ', id);
        const query = 'SELECT * FROM user WHERE user_id = ?';
        mysql.pool.query(query, [id], function(err, rows) {
            done(err, rows[0]);
        });
    });
    passport.use(
        "local-signup",
        new LocalStrategy(
          {
            usernameField: "email", // Change to email
            passwordField: "password",
            passReqToCallback: true // Allows us to pass back the entire request to the callback
          },
          function(req, email, password, done) {
            const {
              first_name,
              last_name
            } = req.body; // Receiving additional form fields
            // Find a user whose email is the same as the forms email
            // Checking to see if the user trying to login already exists
    
            console.log("Inside passport sign up strategy", req.body);
    
            mysql.pool.query(
              "SELECT * FROM user WHERE email = ?",
              [email],
              function(err, rows) {
                if (err) return done(err);
                if (rows.length) {
                  return done(
                    null,
                    false,
                    req.flash("signupMessage", "That username is already taken.")
                  );
                } else {
                  // If no users exist with that user name
                  // Create the user
                  const newUserMysql = {
                    username: email,
                    password: bcrypt.hashSync(password, null, null) // Use generate hash function in User model
                  };
                  console.log("Attempting to create new user");
                  const insertQuery =
                    "INSERT INTO user (email, password, first_name, last_name) VALUES(?, ?, ?, ?)"; // Add entry for first and last name later
                  mysql.pool.query(
                    insertQuery,
                    [
                      newUserMysql.username,
                      newUserMysql.password,
                      first_name,
                      last_name
                    ],
                    function(err, result) {
                      newUserMysql.id = result.insertId; // Testing, change back to rows.id
                      console.log("newUserMysql", newUserMysql);
                      return done(null, newUserMysql);
                    }
                  );
                }
              }
            );
          }
        )
      );
    
      /******************************************************/
      /******************** Local Login ********************/
      /******************************************************/
    
      passport.use(
        "local-login",
        new LocalStrategy(
          {
            // by default, local strategy uses username and password, we will override with email
            usernameField: "email",
            passwordField: "password",
            passReqToCallback: true // allows us to pass back the entire request to the callback,
          },
          function(req, email, password, done) {
            // callback with email and password from our form
            mysql.pool.query(
              "SELECT * FROM user WHERE email = ?",
              [email],
              function(err, rows) {
                
                console.log('logging in', rows)
                console.log('err', err);
                console.log('rows', rows[0]);
                console.log('Password correct: ', bcrypt.compareSync(password, rows[0].password));
                if (err) {
                  console.log("Error", error);
                  return done(err);
                }
                if (!rows.length) {
                  console.log("!rows.length");
                  return done(
                    null,
                    false,
                    req.flash("loginMessage", "No user found.")
                  ); // req.flash is the way to set flashdata using connect-flash
                }
    
                // if the user is found but the password is wrong
                if (!bcrypt.compareSync(password, rows[0].password))
                  return done(
                    null,
                    false,
                    req.flash("loginMessage", "Oops! Wrong password.")
                  ); // create the loginMessage and save it to session as flashdata
    
                // all is well, return successful user
                rows[0].id = rows[0].user_id; // Fix for deserialize, 'user_id' is not valid, must be converted to 'id'
                return done(null, rows[0]);
              }
            );
          }
        )
      );
}

