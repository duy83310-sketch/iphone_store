const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Product = require("../models/productModel");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    // Find products with salePrice field present
    const cursor = Product.find({ salePrice: { $exists: true } }).cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const price = Number(doc.price) || (Array.isArray(doc.variants) && doc.variants[0] ? Number(doc.variants[0].price) || 0 : 0);
      const sale = Number(doc.salePrice) || 0;
      if (!price || !sale) {
        // If salePrice present but not meaningful, just unset it
        await Product.updateOne({ _id: doc._id }, { $unset: { salePrice: "" } });
        count++;
        continue;
      }

      // if sale is less than price, prefer percent calculation when clean
      if (sale < price) {
        const pct = Math.round((1 - sale / price) * 100 * 100) / 100; // round to 2 decimals
        const discount = { type: 'percent', value: pct };
        await Product.updateOne({ _id: doc._id }, { $set: { discount }, $unset: { salePrice: "" } });
        count++;
      } else {
        // fallback to fixed discount value
        const diff = Math.max(0, price - sale);
        const discount = { type: 'fixed', value: diff };
        await Product.updateOne({ _id: doc._id }, { $set: { discount }, $unset: { salePrice: "" } });
        count++;
      }
    }

    console.log(`Migrated ${count} products`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration error', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

migrate();