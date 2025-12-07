const express = require("express");
const router = express.Router();
const FAQ = require("../models/faqsModel");

// GET /faqs
router.get("/", async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
