import express from "express";
import path from "path";

// Initialize express
const app = express();

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));  // Use process.cwd() for better compatibility

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(process.cwd(), "public")));

// Route for Home Page (Registration Page)
app.get("/", (req, res) => {
    res.render("index"); // Render index.ejs
});

// Route for /index (Prevents 404 error)
app.get("/index", (req, res) => {
    res.redirect("/"); // Redirect /index to /
});

// Route for Dashboard (After successful registration)
app.get("/dashboard", (req, res) => {
    res.render("dashboard", { user: "John Doe" }); // Pass dynamic data
});

// Route for Earnings
app.get("/earnings", (req, res) => {
    res.render("earnings", { user: "John Doe" }); // Pass dynamic data
});

// Route for Help
app.get("/help", (req, res) => {
    res.render("help", { user: "John Doe" }); // Pass dynamic data
});

// Route for Validator
app.get("/validator", (req, res) => {
    res.render("validator", { user: "John Doe" }); // Pass dynamic data
});

// Route for Referral
app.get("/referral", (req, res) => {
    res.render("referral", { user: "John Doe" }); // Pass dynamic data
});

// Route for Withdraw
app.get("/withdraw", (req, res) => {
    res.render("withdraw", { user: "John Doe" }); // Pass dynamic data
});

// Route for Profile
app.get("/profile", (req, res) => {
    res.render("profile", { user: "John Doe" }); // Pass dynamic data
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
