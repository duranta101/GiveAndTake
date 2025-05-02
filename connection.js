var mysql = require("mysql");

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "give_&_take"
});

con.connect((err) => {
    if (err) throw err;
    console.log("Connected to the database!");
});

module.exports = con;