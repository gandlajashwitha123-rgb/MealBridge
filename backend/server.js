const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");

dotenv.config();

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to MealBridge API",
        status: "Running"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "MealBridge backend is healthy."
    });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Food routes
app.use("/api/food", foodRoutes);

// Recommendation routes
app.use("/api/recommendations", recommendationRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("======================================");
    console.log("MEALBRIDGE BACKEND");
    console.log("======================================");
    console.log("Server: http://localhost:" + PORT);
    console.log("API: http://localhost:" + PORT + "/api");
    console.log("Food API: http://localhost:" + PORT + "/api/food");
    console.log("Admin API: http://localhost:" + PORT + "/api/admin");
});