require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔹 Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const port = process.env.PORT || 5000;

// 🔹 Middleware
app.use(express.json());
app.use(cors());

// 🔹 Multer setup for file uploads (screenshots)
const upload = multer({ dest: "uploads/" });

// ✅ API: Submit Payment Details
app.post("/api/submit-payment", upload.single("screenshot"), async (req, res) => {
    try {
        const { txid, walletAddress, email } = req.body;
        const file = req.file;

        if (!txid || !walletAddress || !email || !file) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // 🔹 Upload screenshot to Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(file.path, {
            folder: "payments",
        });

        // 🔹 Delete file after upload
        fs.unlinkSync(file.path);

        // 🔹 Save to Firestore
        await db.collection("payments").add({
            email,
            txid,
            walletAddress,
            screenshotURL: cloudinaryResponse.secure_url,
            status: "pending",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ message: "Payment submitted successfully. Await validation." });
    } catch (error) {
        console.error("❌ Error submitting payment:", error);
        res.status(500).json({ error: "Server error. Try again later." });
    }
});

// ✅ API: Get Payment Status
app.get("/api/check-payment/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const snapshot = await db.collection("payments").where("email", "==", email).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: "No payment found." });
        }

        const paymentData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json({ payments: paymentData });
    } catch (error) {
        console.error("❌ Error fetching payments:", error);
        res.status(500).json({ error: "Server error." });
    }
});

// ✅ Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

