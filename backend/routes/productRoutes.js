const mongoose = require("mongoose");
const express = require("express");
const Product = require("../models/productModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function toAbsoluteImage(req, img) {
  if (!img) return null;
  if (/^https?:\/\//i.test(img)) return img;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (img.startsWith('/uploads/')) return baseUrl + img;
  if (img.startsWith('/images/')) return baseUrl + img;
  if (img.startsWith('images/')) return baseUrl + '/' + img;
  return img;
}

async function findAndUpdateProduct(pid, update) {
  const asNumber = Number(pid);

  // ưu tiên numeric id
  if (!Number.isNaN(asNumber)) {
    const doc = await Product.findOneAndUpdate(
      { id: asNumber },
      { $set: update },
      { new: true }
    ).lean();
    if (doc) return doc;
  }

  // fallback Mongo _id
  if (mongoose.Types.ObjectId.isValid(pid)) {
    return Product.findByIdAndUpdate(
      pid,
      { $set: update },
      { new: true }
    ).lean();
  }

  return null;
}

// GET all products
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};

    if (search) {
      query = {
        name: { $regex: search, $options: "i" } //match input
      };
    }

    const products = await Product.find(query).lean();
    res.json(products);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// GET low stock products (sorted by smallest variant stock). Optional query: ?limit=5
router.get("/low-stock", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 5));
    const products = await Product.find({}).lean();

    const items = products.map(p => {
      let variant = null;
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        const minV = p.variants.reduce((a, b) => ((Number(a.stock) || 0) <= (Number(b.stock) || 0) ? a : b));
        const nameParts = [];
        if (minV.storage) nameParts.push(minV.storage);
        if (minV.color) nameParts.push(minV.color);
        if (minV.version && !nameParts.length) nameParts.push(minV.version);
        variant = { name: nameParts.join(' '), stock: Number(minV.stock) || 0 };
      } else {
        variant = { name: '', stock: 0 };
      }

      return {
        id: p._id || p.id,
        name: p.name,
        variant: variant.name || '',
        left: (Array.isArray(p.variants) && p.variants.length > 0) ? (Number(variant.stock) || 0) : (Number(p.stock) || 0),
        image: toAbsoluteImage(req, p.image)
      };
    });

    items.sort((a, b) => a.left - b.left);
    res.json(items.slice(0, limit));
  } catch (err) {
    console.error('GET /products/low-stock error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET one product by id (accept numeric `id` or Mongo `_id`)
router.get("/:id", async (req, res) => {
  try {
    const pid = req.params.id;

    // try numeric `id` field first
    let product = null;
    const asNumber = Number(pid);
    if (!Number.isNaN(asNumber)) {
      product = await Product.findOne({ id: asNumber }).lean();
    }

    // fallback: try Mongo _id
    if (!product) {
      const mongoose = require("mongoose");
      if (mongoose.Types.ObjectId.isValid(pid)) {
        product = await Product.findById(pid).lean();
      }
    }

    if (!product) return res.status(404).json({ message: "Product not found" });
    // Normalize image URLs for cross-app rendering
    product.image = toAbsoluteImage(req, product.image);
    product.featuredImg = toAbsoluteImage(req, product.featuredImg);
    res.json(product);
  } catch (err) {
    console.error("GET /products/:id error", err);
    res.status(500).json({ message: "Server error" });
  }
});


// POST create product (admin only)
router.post('/', requireAuth, async (req, res) => {
  if (req.userRole !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới có quyền tạo sản phẩm' });
  try {
    const data = req.body || {};

    // auto-increment numeric `id` if not provided
    let nextId = 1;
    const last = await Product.findOne({}).sort({ id: -1 }).lean();
    if (last && typeof last.id === 'number') nextId = last.id + 1;
    if (!data.id) data.id = nextId;

    // ensure variants is an array if single variant fields were submitted
    if (data.variant && !data.variants) {
      data.variants = [{ version: data.variant, color: data.color, storage: data.capacity, stock: Number(data.stock) || 0 }];
    }

    // handle base64 image upload for product image or featuredImg
    if (data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
      const fs = require('fs');
      const path = require('path');

      const matches = data.image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ message: 'Image must be a base64 image' });

      const mime = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // no size limit for product images (allow larger uploads)

      let ext = 'png';
      if (mime === 'image/jpeg' || mime === 'image/jpg') ext = 'jpg';
      else if (mime === 'image/png') ext = 'png';
      else if (mime === 'image/webp') ext = 'webp';
      else if (mime === 'image/gif') ext = 'gif';

      const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
      fs.mkdirSync(uploadsDir, { recursive: true });

      const filename = `product-${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, buffer);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      data.image = `${baseUrl}/uploads/products/${filename}`;
    }

    if (data.featuredImg && typeof data.featuredImg === 'string' && data.featuredImg.startsWith('data:')) {
      const fs = require('fs');
      const path = require('path');

      const matches = data.featuredImg.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ message: 'Featured image must be a base64 image' });

      const mime = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // no size limit for product featured images

      let ext = 'png';
      if (mime === 'image/jpeg' || mime === 'image/jpg') ext = 'jpg';
      else if (mime === 'image/png') ext = 'png';
      else if (mime === 'image/webp') ext = 'webp';
      else if (mime === 'image/gif') ext = 'gif';

      const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
      fs.mkdirSync(uploadsDir, { recursive: true });

      const filename = `product-featured-${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, buffer);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      data.featuredImg = `${baseUrl}/uploads/products/${filename}`;
    }

    // coerce featured/new/hot to booleans (default false when not provided)
    const toBool = (v) => {
      if (v === undefined) return false;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v === 'true' || v === '1';
      return !!v;
    };
    data.featured = toBool(data.featured);
    data.new = toBool(data.new);
    data.hot = toBool(data.hot);

    const p = new Product(data);
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    console.error('POST /products error', err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.put('/:id', requireAuth, async (req, res) => {
  try {
    const pid = req.params.id;
    const body = req.body || {};
    const role = String(req.userRole || '').toLowerCase();

    // Helper: process base64 image field (for both admin and staff)
    async function processBase64Image(fieldName) {
      if (fieldName in body && typeof body[fieldName] === 'string' && body[fieldName].startsWith('data:')) {
        const matches = body[fieldName].match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ message: `${fieldName} must be a base64 image` });
        const mime = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        let ext = 'png';
        if (mime === 'image/jpeg' || mime === 'image/jpg') ext = 'jpg';
        else if (mime === 'image/png') ext = 'png';
        else if (mime === 'image/webp') ext = 'webp';
        else if (mime === 'image/gif') ext = 'gif';

        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
        fs.mkdirSync(uploadsDir, { recursive: true });
        const filename = `${fieldName}-${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buffer);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        body[fieldName] = `${baseUrl}/uploads/products/${filename}`;
      }
    }

    // Allow admins full control, staff limited edits
    if (role === 'admin') {
      // process images first (may mutate body.image / body.featuredImg)
      await processBase64Image('image');
      await processBase64Image('featuredImg');

      const update = {};
      if ('name' in body) update.name = body.name;
      if ('description' in body) update.description = body.description;
      if ('discount' in body) update.discount = body.discount;
      if ('featured' in body) update.featured = body.featured;
      if ('hot' in body) update.hot = body.hot;
      if ('new' in body) update.new = body.new;
      if ('image' in body) update.image = body.image;
      if ('featuredImg' in body) update.featuredImg = body.featuredImg;
      if (Array.isArray(body.variants)) update.variants = body.variants;
      if ('stock' in body) update.stock = body.stock;

      let updated = null;
      const asNumber = Number(pid);
      const mongoose = require("mongoose");

      if (!Number.isNaN(asNumber)) {
        updated = await Product.findOneAndUpdate(
          { id: asNumber },
          { $set: update },
          { new: true, runValidators: true }
        ).lean();
      }

      if (!updated && mongoose.Types.ObjectId.isValid(pid)) {
        updated = await Product.findByIdAndUpdate(
          pid,
          { $set: update },
          { new: true, runValidators: true }
        ).lean();
      }

      if (!updated) return res.status(404).json({ message: 'Product not found' });
      return res.json(updated);
    }

    // Staff: limited fields only
    if (role === 'staff') {
      // allowed top-level fields for staff
      const permitted = ['description', 'image', 'featured', 'hot', 'new', 'discount', 'featuredImg', 'stock'];

      // process images if present
      await processBase64Image('image');
      await processBase64Image('featuredImg');

      const update = {};
      permitted.forEach(k => { if (k in body) update[k] = body[k]; });

      // Handle variants updates for staff: merge into existing variants, only allow modifying numeric fields (price, stock)
      if (Array.isArray(body.variants)) {
        // fetch current product
        const mongoose = require('mongoose');
        let product = null;
        const asNumber = Number(pid);
        if (!Number.isNaN(asNumber)) {
          product = await Product.findOne({ id: asNumber }).lean();
        }
        if (!product && mongoose.Types.ObjectId.isValid(pid)) {
          product = await Product.findById(pid).lean();
        }
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const existing = Array.isArray(product.variants) ? [...product.variants] : [];
        const incoming = body.variants;

        const merged = existing.map((v, i) => {
          const inc = incoming[i] || {};
          return {
            ...v,
            price: ('price' in inc) ? Number(inc.price) : v.price,
            stock: ('stock' in inc) ? Number(inc.stock) : v.stock
          };
        });

        // If incoming array length matches existing but has extra indexes, ignore extras
        update.variants = merged;
      }

      // Apply update
      let updated = null;
      const asNumber = Number(pid);
      const mongoose = require("mongoose");

      if (!Number.isNaN(asNumber)) {
        updated = await Product.findOneAndUpdate(
          { id: asNumber },
          { $set: update },
          { new: true, runValidators: true }
        ).lean();
      }

      if (!updated && mongoose.Types.ObjectId.isValid(pid)) {
        updated = await Product.findByIdAndUpdate(
          pid,
          { $set: update },
          { new: true, runValidators: true }
        ).lean();
      }

      if (!updated) return res.status(404).json({ message: 'Product not found' });
      return res.json(updated);
    }

    // default: forbidden
    return res.status(403).json({ message: 'Admin hoặc Staff mới có quyền cập nhật' });

  } catch (err) {
    console.error('PUT /products/:id error', err);
    res.status(500).json({ message: 'Server error' });
  }
});




// DELETE product (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  if (req.userRole !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới có quyền xóa sản phẩm' });
  try {
    const pid = req.params.id;
    let removed = null;
    const asNumber = Number(pid);
    if (!Number.isNaN(asNumber)) {
      removed = await Product.findOneAndDelete({ id: asNumber }).lean();
    }

    if (!removed) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(pid)) {
        removed = await Product.findByIdAndDelete(pid).lean();
      }
    }

    if (!removed) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Deleted', product: removed });
  } catch (err) {
    console.error('DELETE /products/:id error', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
