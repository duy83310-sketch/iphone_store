const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Product = require('../models/productModel');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const cursor = Product.find({ price: { $exists: true } }).cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const price = Number(doc.price) || 0;
      if (!price) {
        // nothing to move, just unset
        await Product.updateOne({ _id: doc._id }, { $unset: { price: '' } });
        count++;
        continue;
      }

      const variants = Array.isArray(doc.variants) ? [...doc.variants] : [];

      if (variants.length === 0) {
        // move product price into a new base variant
        const newVariant = { version: 'base', color: null, storage: null, stock: Number(doc.stock) || 0, price };
        await Product.updateOne({ _id: doc._id }, { $set: { variants: [newVariant] }, $unset: { price: '' } });
        count++;
        continue;
      }

      // For existing variants, set price for variants missing a price
      const updated = variants.map(v => ({ ...v, price: Number(v.price) || price }));
      await Product.updateOne({ _id: doc._id }, { $set: { variants: updated }, $unset: { price: '' } });
      count++;
    }

    console.log(`Migrated ${count} products (moved top-level price to variants)`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration error', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

migrate();