const express = require("express");  // Importing Express Framework
const bodyParser = require("body-parser");
const session = require("express-session");
const app = express();
const con = require("./connection"); // Database connection import

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure session middleware
app.use(
  session({
    secret: "your_secret_key", // Replace with a secure key
    resave: false,  
    saveUninitialized: true,
  })
);

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files (e.g., CSS, images, or JS files for the pages)
app.use(express.static("public"));

// Route to serve the Sign In page
app.get("/signin", (req, res) => {
  res.sendFile(__dirname + "/signin.html");
});

// Route to handle sign-in
app.post("/signin", (req, res) => {
  const { phone, password } = req.body;

  const sql = "SELECT * FROM users WHERE phone = ? AND password = ?";
  con.query(sql, [phone, password], (error, results) => {
    if (error) {
      console.error("Error during sign-in:", error);
      return res.status(500).send("An error occurred during sign-in.");
    }

    if (results.length > 0) {
      // Save user info in session
      req.session.user = results[0];
      console.log(`User ${results[0].name} logged in`);
      res.redirect("/dashboard"); // Redirect to the main page or dashboard
    } else {
      res.status(401).send("Invalid phone number or password.");
    }
  });
});

// Middleware to protect routes
const authenticate = (req, res, next) => {
  if (req.session.user) {
    next(); // User is authenticated, proceed to the next middleware or route
  } else {
    res.redirect("/signin"); // Redirect to sign-in page if not authenticated
  }
};

// Route to serve the Give page (authenticated)
app.get("/", authenticate, (req, res) => {
  res.sendFile(__dirname + "/give.html");
});

// Route to handle form submission
app.post("/", authenticate, (req, res) => {
  const { food_name, amount, expiry_time, pickup_location, phone } = req.body;

  const sql = `
    INSERT INTO food (food_item, amount, expiry_time, pickup_location, contact) 
    VALUES (?, ?, ?, ?, ?)
  `;

  con.query(sql, [food_name, amount, expiry_time, pickup_location, phone], (error, result) => {
    if (error) {
      console.error("Database insertion failed:", error);
      return res.status(500).send("An error occurred while saving the data.");
    }
    // Render the thank-you page after successful submission
    res.render("thanks");
  });
});

// Dashboard route (authenticated)
app.get("/dashboard", authenticate, (req, res) => {
  res.render("dashboard", { user: req.session.user });
});

// Remaining routes
app.get("/take", authenticate, (req, res) => {
  const sql = "SELECT * FROM food ORDER BY given_at DESC";

  con.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching food data:", error);
      return res.status(500).send("An error occurred while retrieving the food data.");
    }

    res.render("take", { take: results });
  });
});

app.get("/impact", authenticate, (req, res) => {
  const sql = "SELECT SUM(amount) AS total_food FROM food";

  con.query(sql, (error, result) => {
    if (error) {
      console.error("Error fetching total food data:", error);
      return res.status(500).send("An error occurred while retrieving the impact data.");
    }

    const totalFood = result[0].total_food || 0; // Default to 0 if no data
    res.render("impact", { totalFood });
  });
});

app.get("/members", authenticate, (req, res) => {
  const sql = `
    SELECT u.name, u.phone, SUM(f.amount) AS total_amount
    FROM users u
    LEFT JOIN food f ON u.phone = f.contact
    GROUP BY u.phone
    ORDER BY total_amount DESC
  `;

  con.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching members data:", error);
      return res.status(500).send("An error occurred while retrieving members data.");
    }

    res.render("members", { members: results });
  });
});

app.get("/foundations", authenticate, (req, res) => {
  const sql = "SELECT * FROM foundations";

  con.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching foundation data:", error);
      return res.status(500).send("An error occurred while retrieving the foundation data.");
    }

    results = results.map(foundation => ({
      name: foundation.name,
      address: foundation.address || "Not available",
      phone: foundation.phone || "Not available",
      email: foundation.email || "Not available"
    }));

    res.render("foundations", { foundations: results });
  });
});

// Route to handle sign-out
app.get("/signout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error during sign-out:", err);
      return res.status(500).send("An error occurred during sign-out.");
    }
    res.redirect("/signin");
  });
});

// Route to serve the signup page (GET request)
app.get("/signup", (req, res) => {
  res.render("signup");  // Render the signup.ejs page
});

// Route to handle user sign-up (POST request)
app.post("/signup", (req, res) => {
  const { name, nid_no, phone, password } = req.body;

  // Check if the phone already exists
  const checkSql = "SELECT * FROM users WHERE phone = ?";
  con.query(checkSql, [phone], (error, results) => {
    if (error) {
      console.error("Error checking phone number:", error);
      return res.status(500).send("An error occurred while checking the phone number.");
    }

    if (results.length > 0) {
      // If phone number already exists
      return res.status(400).send("This phone number is already registered.");
    }

    // Insert new user data into the "users" table
    const sql = "INSERT INTO users (name, nid_no, phone, password) VALUES (?, ?, ?, ?)";
    con.query(sql, [name, nid_no, phone, password], (error, result) => {
      if (error) {
        console.error("Error inserting user data:", error);
        return res.status(500).send("An error occurred while registering the user.");
      }
      
      // Redirect to the sign-in page after successful registration
      res.redirect("/signin");
    });
  });
});

// Start the server
app.listen(5500, () => {
  console.log("Server is running on http://localhost:5500");
});