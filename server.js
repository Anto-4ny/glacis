import express from "express";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Ensure JSON parsing is enabled

// Serve static files
app.use(express.static(path.join(process.cwd(), "public")));

// Route for Home Page (Registration Page) with Referral Code Handling
app.get("/", (req, res) => {
    const referrerId = req.query.ref || "";
    res.render("index", { referrerId });
});

// Route for Videos Page (Displays videos.ejs)
app.get("/videos", (req, res) => {
    res.render("videos", { user: "John Doe" });
});

// Fetch YouTube videos dynamically
app.get("/api/videos", async (req, res) => {
    try {
        const response = await axios.get(
            `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_API_KEY}&channelId=${process.env.YOUTUBE_CHANNEL_ID}&part=snippet&type=video&maxResults=6`
        );

        console.log("YouTube API Response:", response.data); // Debugging line

        if (!response.data.items) {
            console.error("YouTube API returned no items");
            return res.json([]);
        }

        const videos = response.data.items.map((item) => ({
            videoId: item.id?.videoId || "",
            title: item.snippet?.title || "No Title",
        }));

        res.json(videos);
    } catch (error) {
        console.error("Error fetching videos:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch videos" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
