require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const newsRoutes = require("./routes/newsRoutes");
const faqsRoutes = require("./routes/faqsRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes"); // { changed code }
console.log("--- Server file loaded ---");


const app = express();

// ----- Middleware -----
app.use(cors());
// Increase request body size to allow base64 avatar uploads (limit set above expected 2MB avatar size)
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));
const path = require('path');

// Serve uploaded static files (avatars etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend-user public images through backend for cross-app access
// This lets admin UI load images stored under frontend-user/public/images
app.use('/images', express.static(path.join(__dirname, '..', 'frontend-user', 'public', 'images')));

// ----- Database connection -----
connectDB();

// ----- API routes -----

app.use("/products", productRoutes);
app.use("/news", newsRoutes);
app.use("/faqs", faqsRoutes);
app.use("/reviews", reviewRoutes);
app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);

// mount user-admin routes BEFORE /admin
app.use("/admin/users", userRoutes);

app.use("/admin", adminRoutes);

// ----- Root endpoint -----
app.get("/", (req, res) => {
  res.send("iPhone Store API running...");
});

// ----- Server start -----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

