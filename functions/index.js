const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Configure email transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "toni4pius@gmail.com",
        pass: "tqxqohsissvipikk" // Use an App Password instead of your actual password
    }
});

// Cloud Function to send approval email
exports.sendApprovalEmail = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(400).send("Only POST requests allowed.");
        }

        const { validatorEmail, txid } = req.body;

        if (!validatorEmail || !txid) {
            return res.status(400).send("Missing required data.");
        }

        const mailOptions = {
            from: "YOUR_EMAIL@gmail.com",
            to: validatorEmail,
            subject: "New Payment Approval Request",
            html: `
                <h2>New Payment Approval Needed</h2>
                <p>Hello,</p>
                <p>You have been selected to approve a new payment.</p>
                <p><strong>Transaction ID:</strong> ${txid}</p>
                <p>Please log in to your dashboard and review the request.</p>
                <br>
                <p>Thank you!</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            return res.status(200).send("Email sent successfully.");
        } catch (error) {
            console.error("Error sending email:", error);
            return res.status(500).send("Failed to send email.");
        }
    });
});
