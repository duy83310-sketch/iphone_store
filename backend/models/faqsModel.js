const mongoose = require("mongoose");

const faqsSchema = new mongoose.Schema({
  id: Number,
  question: String,
  answer: [String]
});

module.exports = mongoose.model("FAQ", faqsSchema);
