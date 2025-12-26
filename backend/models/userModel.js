const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    default: "female"
  },
  dob: {
    type: Date
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ["admin", "staff", "client"],
    default: "client"
  },
  status: {
    type: String,
    enum: ["active", "disabled"],
    default: "active"
  },
  wishlist: [
    {
      productId: {
        type: String,
        required: true
      },
      // optional selected color info
      colorLabel: String,
      colorValue: String,
      // optional selected variant info (version, storage, color, price)
      selectedVariant: {
        version: String,
        storage: String,
        color: String,
        price: Number
      }
    }
  ],
  cart: [
    {
      productId: String,
      quantity: {
        type: Number,
        default: 1
      },
      // optional selected color info
      colorLabel: String,
      colorValue: String,
      // optional selected variant info
      selectedVariant: {
        version: String,
        storage: String,
        color: String,
        price: Number
      }
    }
  ],
  addresses: [
    {
      label: String,
      country: String,
      province: String,
      district: String,
      ward: String,
      details: String,
      phone: String,
      isDefault: { type: Boolean, default: false }
    }
  ],
}, { timestamps: true });

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);

