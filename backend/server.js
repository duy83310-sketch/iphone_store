require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const newsRoutes = require("./routes/newsRoutes");
const faqsRoutes = require("./routes/faqsRoutes");
const authRoutes = require("./routes/authRoutes");
console.log("--- Server file loaded ---");


const app = express();

// ----- Middleware -----
app.use(cors());
app.use(express.json());

// ----- Database connection -----
connectDB();

// ----- API routes -----

app.use("/products", productRoutes);
app.use("/news", newsRoutes);
app.use("/faqs", faqsRoutes);
app.use("/auth", authRoutes);

// ----- Root endpoint -----
app.get("/", (req, res) => {
  res.send("iPhone Store API running...");
});

// ----- Server start -----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

