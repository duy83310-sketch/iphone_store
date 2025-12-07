const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  wishlist: {
    type: Array,
    default: []
  },
  cart: [
    {
      productId: String,
      quantity: {
        type: Number,
        default: 1
      }
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
