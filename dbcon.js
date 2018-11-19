var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit : 10,
  host            : 'classmysql.engr.oregonstate.edu',
  user            : 'cs361_lebrya',
  password        : 'g35',
  database        : 'cs361_lebrya'
});

module.exports.pool = pool;

