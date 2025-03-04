import express from "express";
import path from "path";

// Initialize express
const app = express();

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views")); 

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(process.cwd(), "public")));

// Route for Home Page (Registration Page)
app.get("/", (req, res) => {
    res.render("index"); 
});

// Route for /index (Prevents 404 error)
app.get("/index", (req, res) => {
    res.redirect("/");
});

// Route for Dashboard (After successful registration)
app.get("/dashboard", (req, res) => {
    res.render("dashboard", { user: "John Doe" });
});

// Route for Earnings
app.get("/earnings", (req, res) => {
    res.render("earnings", { user: "John Doe" });
});

// Route for Help
app.get("/help", (req, res) => {
    res.render("help", { user: "John Doe" }); 
});

// Route for Validator
app.get("/validator", (req, res) => {
    res.render("validator", { user: "John Doe" }); 
});

// Route for Referral
app.get("/referral", (req, res) => {
    res.render("referral", { user: "John Doe" }); 
});

// Route for Withdraw
app.get("/withdraw", (req, res) => {
    res.render("withdraw", { user: "John Doe" }); 
});

// Route for Profile
app.get("/profile", (req, res) => {
    res.render("profile", { user: "John Doe" }); 
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
