const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  id: Number,
  image: String,
  category: String,
  title: String,
  link: String,
  date: String
});

module.exports = mongoose.model("News", newsSchema);
