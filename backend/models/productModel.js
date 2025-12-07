const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  salePrice: Number,
  hot: Boolean
});

module.exports = mongoose.model("Product", productSchema);
