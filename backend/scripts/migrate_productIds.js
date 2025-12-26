// Usage: node backend/scripts/migrate_productIds.js
// This script converts cart/wishlist/order items that have productId set to a Mongo _id
// into the canonical numeric product.id string.

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');

async function run() {
  await connectDB();

  const users = await User.find({}).lean();
  let updatedUsers = 0;
  for (const u of users) {
    const userDoc = await User.findById(u._id);
    let changed = false;

    if (Array.isArray(userDoc.cart)) {
      for (const it of userDoc.cart) {
        // if productId looks like an ObjectId and the product exists, replace it with numeric id
        if (typeof it.productId === 'string') {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(it.productId)) {
            const prod = await Product.findById(it.productId).lean();
            if (prod && prod.id !== undefined) {
              it.productId = String(prod.id);
              changed = true;
              console.log(`User ${String(userDoc._id)}: cart item converted from ${String(prod._id)} to ${prod.id}`);
            }
          }
        }
      }
    }

    if (Array.isArray(userDoc.wishlist)) {
      for (const it of userDoc.wishlist) {
        if (typeof it.productId === 'string') {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(it.productId)) {
            const prod = await Product.findById(it.productId).lean();
            if (prod && prod.id !== undefined) {
              it.productId = String(prod.id);
              changed = true;
              console.log(`User ${String(userDoc._id)}: wishlist item converted from ${String(prod._id)} to ${prod.id}`);
            }
          }
        }
      }
    }

    if (changed) {
      await userDoc.save();
      updatedUsers++;
    }
  }

  // Migrate orders
  const orders = await Order.find({}).lean();
  let updatedOrders = 0;
  for (const o of orders) {
    const orderDoc = await Order.findById(o._id);
    let changed = false;
    if (Array.isArray(orderDoc.items)) {
      for (const it of orderDoc.items) {
        if (typeof it.productId === 'string') {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(it.productId)) {
            const prod = await Product.findById(it.productId).lean();
            if (prod && prod.id !== undefined) {
              it.productId = String(prod.id);
              changed = true;
              console.log(`Order ${String(orderDoc._id)}: item converted from ${String(prod._id)} to ${prod.id}`);
            }
          }
        }
      }
    }
    if (changed) {
      await orderDoc.save();
      updatedOrders++;
    }
  }

  console.log(`Migration finished. Users updated: ${updatedUsers}. Orders updated: ${updatedOrders}.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });