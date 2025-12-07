const express = require("express");
const router = express.Router();
const News = require("../models/newsModel");

// GET /news
router.get("/", async (req, res) => {
  try {
    const news = await News.find({});
    res.status(200).json(news);
  } catch (err) {
    console.error("Error fetching news:", err);   // 👈 thêm log
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
