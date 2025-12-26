const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: Number,
  name: String,
  image: String,
  stock: Number, //sum of all variant stocks
  discount: {
    type: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent'
    },
    value: Number,
    startAt: Date,
    endAt: Date
  },
  featuredImg: String,
  variants: [
    {
      version: String,
      color: String,
      storage: String,
      stock: Number,
      price: Number
    }
  ],
  description: String,
  featured: Boolean,
  new: Boolean,
  hot: Boolean
});

module.exports = mongoose.model("Product", productSchema);
