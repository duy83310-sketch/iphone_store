const User = require("../models/userModel");
const Order = require("../models/orderModel");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // { changed code }

// Compute "delivered" statuses to consider as đã giao
const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'delivered', 'completed'];

// Helper: compute final price from a base price and product discount
function computeFinalPriceFromBase(base, product) {
  const b = Number(base) || 0;
  const d = product?.discount;
  if (!d || typeof d !== 'object') return b;
  const now = new Date();
  if (d.startAt && new Date(d.startAt) > now) return b;
  if (d.endAt && new Date(d.endAt) < now) return b;
  const t = String(d.type || '').toLowerCase();
  if (t === 'percent') {
    const pct = Number(d.value) || 0;
    return Math.round(b * (1 - pct / 100));
  }
  if (t === 'fixed') {
    const val = Number(d.value) || 0;
    return Math.max(0, Math.round(b - val));
  }
  return b;
}

// Helper: derive base price of a product from its variants (returns minimum variant.price or 0)
function getProductBasePrice(product) {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return 0;
  const vals = product.variants.map(v => Number(v?.price) || 0).filter(v => v > 0);
  if (vals.length === 0) return 0;
  return Math.min(...vals);
} 

// Helper: return wishlist with product details
async function getFullWishlist(userIdOrReq) {
  const userId = (typeof userIdOrReq === 'object' && userIdOrReq.userId) ? userIdOrReq.userId : userIdOrReq;
  const user = await User.findById(userId);
  if (!user || !user.wishlist) return [];

  const Product = require("../models/productModel");

  return Promise.all(
    user.wishlist.map(async item => {
      const product = await Product.findOne({ id: Number(item.productId) });

      // determine price: if wishlist item stored a variant.price, use that as base; otherwise derive from variants
      const base = Number(item.selectedVariant?.price) || getProductBasePrice(product);

      // apply product-level discount if active
      const discount = product?.discount;
      let finalPrice = computeFinalPriceFromBase(base, product);

      return {
        // return product id as `id` so components expecting product shape still work
        id: item.productId,
        productId: item.productId,
        // include wishlist subdoc id for remove operations if needed
        wishlistId: String(item._id),
        name: product?.name ?? "Unknown",
        image: product?.image ?? "",
        price: finalPrice,
        // color info
        selectedColor: item.colorLabel ?? null,
        selectedColorValue: item.colorValue ?? null,
        // variant info (if saved)
        selectedVariant: item.selectedVariant ?? null
      };
    })
  );
}

// Helper: return cart with product details
async function getFullCart(userIdOrReq) {
  const userId = (typeof userIdOrReq === 'object' && userIdOrReq.userId) ? userIdOrReq.userId : userIdOrReq;
  const user = await User.findById(userId);
  if (!user || !user.cart) return [];

  const Product = require("../models/productModel");

  return Promise.all(
    user.cart.map(async item => {
      const product = await Product.findOne({ id: Number(item.productId) });

      // determine base price: prefer stored variant.price when available
      const base = Number(item.selectedVariant?.price) || getProductBasePrice(product);
      // apply product-level discount using helper
      const discount = product?.discount;
      let finalPrice = computeFinalPriceFromBase(base, product);

      return {
        // return unique cart item id (_id of the subdocument)
        id: String(item._id),
        productId: item.productId,
        quantity: item.quantity,
        name: product?.name ?? "Unknown",
        image: product?.image ?? "",
        price: finalPrice,
        // color info (optional)
        selectedColor: item.colorLabel ?? null,
        selectedColorValue: item.colorValue ?? null,
        // variant info (if saved)
        selectedVariant: item.selectedVariant ?? null
      };
    })
  );
}

// GET wishlist
async function getWishlist(req, res) {
  const full = await getFullWishlist(req.userId);
  res.json(full);
}

// POST wishlist (add)
async function addWishlist(req, res) {
  try {
    const { productId } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const id = String(Number(productId));
    if (!id || id === "NaN") {
      return res.status(400).json({ msg: "Invalid productId" });
    }

    if (!Array.isArray(user.wishlist)) user.wishlist = [];

    const exists = user.wishlist.some(p => p.productId === id);
    if (!exists) {
      user.wishlist.push({ productId: id });
      await user.save();
    }

    // return full wishlist (same as GET)
    const full = await getFullWishlist(req.userId);
    res.json(full);
  } catch (err) {
    console.error("addWishlist error:", err);
    res.status(500).json({ msg: err.message });
  }
}



// DELETE wishlist
async function deleteWishlist(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const id = String(Number(req.params.id));
    user.wishlist = user.wishlist.filter(p => p.productId !== id);

    await user.save();

    // return full wishlist (same as GET)
    const full = await getFullWishlist(req.userId);
    res.json(full);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}


// GET cart
async function getCart(req, res) {
  const fullCart = await getFullCart(req.userId);
  res.json(fullCart);
}

// POST cart (add)
async function addCart(req, res) {
  try {
    const { product } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Require numeric productId only (no Mongo _id accepted)
    if (!product || product.productId === undefined || product.productId === null) {
      return res.status(400).json({ msg: "Missing productId" });
    }

    const resolvedId = Number(product.productId);
    if (!Number.isFinite(resolvedId)) {
      return res.status(400).json({ msg: "Invalid productId" });
    }

    const resolvedIdStr = String(resolvedId);

    // accept optional selected color info
    const colorLabel = product.selectedColor ?? null;
    const colorValue = product.selectedColorValue ?? null;

    // accept optional variant info
    const variant = product.selectedVariant ?? null;

    // if same product + same color + same storage exists, increase quantity; otherwise push new cart item
    let exist = false;
    user.cart = (user.cart || []).map(item => {
      if (
        String(item.productId) === resolvedIdStr &&
        ((item.colorLabel ?? null) === (colorLabel ?? null)) &&
        ((item.selectedVariant?.storage ?? null) === (variant?.storage ?? null))
      ) {
        exist = true;
        return {
          ...item,
          quantity: (item.quantity || 1) + 1
        };
      }
      return item;
    });

    if (!exist) {
      const newItem = { productId: resolvedIdStr, quantity: 1 };
      if (colorLabel) newItem.colorLabel = colorLabel;
      if (colorValue) newItem.colorValue = colorValue;
      if (variant && typeof variant === 'object') newItem.selectedVariant = {
        version: variant.version ?? null,
        storage: variant.storage ?? null,
        color: variant.color ?? null,
        price: Number(variant.price) || 0
      };

      user.cart.push(newItem);
    }

    await user.save();

    // { changed code } use req.userId
    const fullCart = await getFullCart(req.userId);
    res.json(fullCart);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// PATCH cart/:id quantity
async function updateCart(req, res) {
  try {
    let { quantity } = req.body;
    quantity = Math.max(1, Number(quantity) || 1);
    const paramId = req.params.id;

    // First try matching by cart subdocument _id
    let result = await User.updateOne(
      { _id: req.userId, "cart._id": String(paramId) },
      { $set: { "cart.$.quantity": quantity } }
    );

    // If nothing modified, try atomic update by stored productId
    if (result.modifiedCount === 0) {
      result = await User.updateOne(
        { _id: req.userId, "cart.productId": String(paramId) },
        { $set: { "cart.$.quantity": quantity } }
      );
    }

    // No further fallbacks: only cart subdoc _id or stored productId are accepted.

    // { changed code } use req.userId
    const fullCart = await getFullCart(req.userId);
    res.json(fullCart);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// DELETE cart/:id
async function deleteCart(req, res) {
  try {
    const paramId = req.params.id;

    // Try removing by cart subdocument _id first
    let result = await User.updateOne(
      { _id: req.userId },
      { $pull: { cart: { _id: paramId } } }
    );

    // If nothing was removed, try atomic $pull by stored productId
    if (result.modifiedCount === 0) {
      result = await User.updateOne(
        { _id: req.userId },
        { $pull: { cart: { productId: String(paramId) } } }
      );
    }

    // No further fallbacks: only cart subdoc _id or stored productId are accepted.

    // { changed code } use req.userId
    const fullCart = await getFullCart(req.userId);
    res.json(fullCart);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// DELETE /cart (clear all items)
async function clearCart(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.cart = [];
    await user.save();

    // { changed code } use req.userId
    const fullCart = await getFullCart(req.userId);
    res.json(fullCart);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// GET /me
async function getMe(req, res) {
  const user = await User.findById(req.userId).select("name email _id phone gender dob avatar role");
  res.json(user);
}

// PATCH /me
async function updateMe(req, res) {
  try {
    const { name, phone, gender, dob, avatar } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (gender !== undefined) update.gender = gender;
    if (dob !== undefined) update.dob = dob;

    // If avatar is provided as a data URL (base64), save it to disk under uploads/avatars
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
      const fs = require('fs');
      const path = require('path');

      // parse data URL: data:[<mediatype>][;base64],<data>
      const matches = avatar.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ msg: 'Avatar must be a base64 image' });

      const mime = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // limit size to 2MB
      const MAX_BYTES = 2 * 1024 * 1024;
      if (buffer.length > MAX_BYTES) return res.status(400).json({ msg: 'Avatar file too large (max 2MB)' });

      // determine extension
      let ext = 'png';
      if (mime === 'image/jpeg' || mime === 'image/jpg') ext = 'jpg';
      else if (mime === 'image/png') ext = 'png';
      else if (mime === 'image/webp') ext = 'webp';
      else if (mime === 'image/gif') ext = 'gif';

      const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
      fs.mkdirSync(uploadsDir, { recursive: true });

      const filename = `${req.user}-${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, buffer);

      // set avatar to full URL so frontend can load it regardless of origin
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      update.avatar = `${baseUrl}/uploads/avatars/${filename}`;
    } else if (avatar !== undefined) {
      // if avatar provided as URL or empty, accept it
      update.avatar = avatar;
    }

    const updated = await User.findByIdAndUpdate(req.userId, update, { new: true }).select("name email _id phone gender dob avatar role");
    if (!updated) return res.status(404).json({ msg: "User not found" });

    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// === Addresses handlers ===
async function getAddresses(req, res) {
  try {
    const user = await User.findById(req.userId).select("addresses");
    res.json(Array.isArray(user?.addresses) ? user.addresses : []);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

async function addAddress(req, res) {
  try {
    const { label, country, province, district, ward, details, phone, isDefault } = req.body;
    // { changed code } use req.userId
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const addr = { label, country, province, district, ward, details, phone, isDefault: !!isDefault };

    if (addr.isDefault) {
      user.addresses = (user.addresses || []).map(a => ({ ...a, isDefault: false }));
    }

    user.addresses = user.addresses || [];
    user.addresses.push(addr);
    await user.save();

    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

async function updateAddress(req, res) {
  try {
    const id = req.params.id;
    const { label, country, province, district, ward, details, phone, isDefault } = req.body;
    // { changed code } use req.userId
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const idx = (user.addresses || []).findIndex((a, i) => String(i) === String(id) || String(a._id) === String(id));
    if (idx === -1) return res.status(404).json({ msg: "Address not found" });

    if (isDefault) user.addresses = user.addresses.map(a => ({ ...a, isDefault: false }));

    user.addresses[idx] = { ...user.addresses[idx], label, country, province, district, ward, details, phone, isDefault: !!isDefault };
    await user.save();

    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

async function deleteAddress(req, res) {
  try {
    const id = req.params.id;
    // { changed code } use req.userId
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.addresses = (user.addresses || []).filter((a, i) => !(String(i) === String(id) || String(a._id) === String(id)));
    await user.save();

    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// POST: change password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Vui lòng điền tất cả các trường" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    // { changed code } use req.userId
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Mật khẩu hiện tại không chính xác" });
    }

    // Hash and update new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ msg: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

// ADMIN: create a staff account (admin-only)
async function createStaff(req, res) {
  try {
    // Quick check using middleware-provided role (requireAdmin already ran)
    if (!req.userId) {
      return res.status(401).json({ msg: 'Không có token' });
    }

    // Double-check admin in DB to be extra safe
    const admin = await User.findById(req.userId).lean();
    if (!admin) return res.status(403).json({ msg: 'Quyền truy cập bị từ chối (người dùng không tồn tại)' });
    if (String(admin.role).toLowerCase() !== 'admin') return res.status(403).json({ msg: 'Quyền truy cập bị từ chối', role: admin.role });

    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' });
    if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ msg: 'Mật khẩu phải có ít nhất 6 ký tự' });

    // Basic email format validation
    const emailRe = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailRe.test(String(email).toLowerCase())) return res.status(400).json({ msg: 'Email không hợp lệ' });

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(400).json({ msg: 'Email đã tồn tại' });

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);

    // Create user explicitly with role 'staff'
    let userDoc = await User.create({ name: String(name).trim(), email: String(email).toLowerCase().trim(), password: hashed, role: 'staff' });

    // Force role field in database using updateOne (handles cases where defaults or schema didn't persist)
    await User.updateOne({ _id: userDoc._id }, { $set: { role: 'staff' } });

    // Re-fetch final document and log
    const finalDoc = await User.findById(userDoc._id).lean();
    console.log(`Staff created by admin=${req.userId}: id=${finalDoc._id} email=${finalDoc.email} role=${finalDoc.role}`);

    res.json({ msg: 'Nhân viên được tạo thành công', user: { id: finalDoc._id, name: finalDoc.name, email: finalDoc.email, role: finalDoc.role } });
  } catch (err) {
    console.error('createStaff error', err);
    res.status(500).json({ msg: err.message });
  }
}

// ADMIN/STaff: list client users with orders count
async function listClients(req, res) {
  try {
    // { changed code } allow fetch single client by id via query (?id=) or param (:id)
    const idFilterRaw = req?.query?.id || req?.params?.id;
    const hasIdFilter = !!idFilterRaw;

    const page = hasIdFilter ? 1 : Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = hasIdFilter ? 1 : Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const q = hasIdFilter ? "" : String(req.query.q || '').trim();

    const filter = { role: 'client' };

    if (hasIdFilter) {
      const idStr = String(idFilterRaw).trim();
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        return res.status(400).json({ msg: "Invalid id" });
      }
      filter._id = new mongoose.Types.ObjectId(idStr);
    } else if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email phone status createdAt updatedAt role gender dob wishlist cart addresses')
      .lean();

    const ids = users.map(u => u._id);

    // Aggregate: count all orders, sum spent only for delivered ones, prefer totalPrice
    const countsAgg = await Order.aggregate([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: '$userId',
          orders: { $sum: 1 },
          spent: {
            $sum: {
              $cond: [
                { $in: ['$status', DELIVERED_STATUSES] },
                {
                  $ifNull: [
                    '$totalPrice',
                    { $ifNull: ['$total', { $ifNull: ['$grandTotal', 0] }] }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);
    const countsMap = new Map(countsAgg.map(x => [String(x._id), x]));

    const data = users.map(u => {
      const agg = countsMap.get(String(u._id)) || { orders: 0, spent: 0 };
      return {
        id: u._id,
        name: u.name || '-',
        email: u.email || '',
        phone: u.phone || '',
        status: u.status || 'active',
        role: u.role || 'client',
        gender: u.gender || '',
        dob: u.dob || null,
        createdAt: u.createdAt || null,
        updatedAt: u.updatedAt || null,
        // expose arrays for detail drawer
        wishlist: Array.isArray(u.wishlist) ? u.wishlist : [],
        cart: Array.isArray(u.cart) ? u.cart : [],
        addresses: Array.isArray(u.addresses) ? u.addresses : [],
        // summary fields
        registeredAt: u.createdAt || null,
        orders: agg.orders || 0,
        spent: agg.spent || 0,
        // simple tiering based on spent
        tier: (agg.spent || 0) >= 50000000 ? 'VIP' : ((agg.spent || 0) >= 20000000 ? 'GOLD' : 'STANDARD')
      };
    });

    res.json({ data, total, page, limit });
  } catch (err) {
    console.error('listClients error', err);
    res.status(500).json({ msg: err.message });
  }
}

// { changed code } add full client detail endpoint
async function getClient(req, res) {
  try {
    const id = req.params.id;
    const user = await User.findById(id)
      .select('name email phone status createdAt updatedAt role gender dob avatar wishlist cart addresses')
      .lean();
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const agg = await Order.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$userId',
          orders: { $sum: 1 },
          spent: {
            $sum: {
              $cond: [
                { $in: ['$status', DELIVERED_STATUSES] },
                {
                  $ifNull: [
                    '$totalPrice',
                    { $ifNull: ['$total', { $ifNull: ['$grandTotal', 0] }] }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);
    const summary = agg[0] || { orders: 0, spent: 0 };

    res.json({
      ...user,
      id: user._id,
      orders: summary.orders || 0,
      spent: summary.spent || 0,
      tier: (summary.spent || 0) >= 50000000 ? 'VIP' : ((summary.spent || 0) >= 20000000 ? 'GOLD' : 'STANDARD')
    });
  } catch (err) {
    console.error('getClient error', err);
    res.status(500).json({ msg: err.message });
  }
}

// ADMIN/STAFF: bulk update client status (lock/unlock)
async function updateClientsStatus(req, res) {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ msg: "Vui lòng chọn ít nhất 1 khách hàng" });
    }

    const nextStatus = String(status || "disabled");
    if (!["active", "disabled"].includes(nextStatus)) {
      return res.status(400).json({ msg: "Trạng thái không hợp lệ" });
    }

    const result = await User.updateMany(
      { _id: { $in: ids }, role: "client" },
      { $set: { status: nextStatus } }
    );

    res.json({ modified: result.modifiedCount || 0, status: nextStatus });
  } catch (err) {
    console.error("updateClientsStatus error:", err);
    res.status(500).json({ msg: err.message });
  }
}

// { changed code } ADMIN/STAFF: update a client basic fields
async function adminUpdateClient(req, res) {
  try {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Invalid id" });
    }

    // only allow updating safe fields
    const { name, phone, gender, dob, status, avatar, newPassword } = req.body || {}; // { changed code }
    const update = {};

    if (name !== undefined) update.name = String(name).trim();
    if (phone !== undefined) update.phone = String(phone).trim();
    if (gender !== undefined) update.gender = gender;
    if (dob !== undefined) update.dob = dob || null;

    // { changed code } validate + set status (avoid throwing 500 on validator error)
    if (status !== undefined) {
      const nextStatus = String(status);
      if (!["active", "disabled"].includes(nextStatus)) {
        return res.status(400).json({ msg: "Trạng thái không hợp lệ" });
      }
      update.status = nextStatus;
    }

    if (avatar !== undefined) update.avatar = avatar;

    // { changed code } allow admin to reset client password without ever returning it
    if (newPassword !== undefined) {
      const np = String(newPassword || "");
      if (np.length < 6) {
        return res.status(400).json({ msg: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      }
      update.password = await bcrypt.hash(np, 10);
    }

    const updated = await User.findOneAndUpdate(
      { _id: id, role: "client" },
      { $set: update },
      { new: true, runValidators: true }
    ).select("name email phone status createdAt updatedAt role gender dob avatar");

    if (!updated) return res.status(404).json({ msg: "User not found" });

    // never include password in response
    res.json({ data: { ...updated.toObject(), id: String(updated._id) } });
  } catch (err) {
    console.error("adminUpdateClient error:", err);
    res.status(500).json({ msg: err.message });
  }
}

// ADMIN/STAFF: list staff users
async function listStaff(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
    const q = String(req.query.q || "").trim();

    const filter = { role: "staff" };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ];
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name email phone status createdAt updatedAt role")
      .lean();

    return res.json({
      users: users.map(u => ({ ...u, id: String(u._id) })),
      total,
      page,
      limit
    });
  } catch (err) {
    console.error("listStaff error:", err);
    return res.status(500).json({ msg: err.message });
  }
}

// ADMIN/STAFF: update staff basic fields (+ optional reset password)
async function adminUpdateStaff(req, res) {
  try {
    if (!req.userId) return res.status(401).json({ msg: "Không có token" });

    // verify requester is admin
    const admin = await User.findById(req.userId).select("role").lean();
    if (!admin) return res.status(403).json({ msg: "Quyền truy cập bị từ chối (người dùng không tồn tại)" });
    if (String(admin.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ msg: "Quyền truy cập bị từ chối", role: admin.role });
    }

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: "Invalid id" });

    const { name, email, phone, status, newPassword } = req.body || {};
    const update = {};

    if (name !== undefined) update.name = String(name).trim();

    if (email !== undefined) {
      const nextEmail = String(email).trim().toLowerCase();
      const emailRe = /^[^@]+@[^@]+\.[^@]+$/;
      if (!emailRe.test(nextEmail)) return res.status(400).json({ msg: "Email không hợp lệ" });

      // unique check (exclude self)
      const exists = await User.findOne({ email: nextEmail, _id: { $ne: id } }).select("_id").lean();
      if (exists) return res.status(400).json({ msg: "Email đã tồn tại" });

      update.email = nextEmail;
    }

    if (phone !== undefined) update.phone = String(phone).trim();

    if (status !== undefined) {
      const nextStatus = String(status);
      if (!["active", "disabled"].includes(nextStatus)) {
        return res.status(400).json({ msg: "Trạng thái không hợp lệ" });
      }
      update.status = nextStatus;
    }

    if (newPassword !== undefined) {
      const np = String(newPassword || "");
      if (np.length < 6) return res.status(400).json({ msg: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      update.password = await bcrypt.hash(np, 10);
    }

    // keep role locked to staff
    update.role = "staff";

    const updated = await User.findOneAndUpdate(
      { _id: id, role: "staff" },
      { $set: update },
      { new: true, runValidators: true }
    ).select("name email phone status role createdAt updatedAt");

    if (!updated) return res.status(404).json({ msg: "User not found" });

    return res.json({ msg: "Cập nhật nhân viên thành công", user: { ...updated.toObject(), id: String(updated._id) } });
  } catch (err) {
    console.error("adminUpdateStaff error:", err);
    return res.status(500).json({ msg: err.message });
  }
}

// ADMIN: delete staff account
async function adminDeleteStaff(req, res) {
  try {
    if (!req.userId) return res.status(401).json({ msg: "Không có token" });

    // verify requester is admin
    const admin = await User.findById(req.userId).select("role").lean();
    if (!admin) return res.status(403).json({ msg: "Quyền truy cập bị từ chối (người dùng không tồn tại)" });
    if (String(admin.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ msg: "Quyền truy cập bị từ chối", role: admin.role });
    }

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: "Invalid id" });

    // prevent deleting self
    if (String(id) === String(req.userId)) {
      return res.status(400).json({ msg: "Không thể xóa chính bạn" });
    }

    const deleted = await User.findOneAndDelete({ _id: id, role: "staff" }).select("_id name email role");
    if (!deleted) return res.status(404).json({ msg: "User not found" });

    return res.json({ msg: "Xóa nhân viên thành công", user: { id: String(deleted._id), name: deleted.name, email: deleted.email, role: deleted.role } });
  } catch (err) {
    console.error("adminDeleteStaff error:", err);
    return res.status(500).json({ msg: err.message });
  }
}

// { changed code } ADMIN: delete client account (+ optionally delete their orders)
async function adminDeleteClient(req, res) {
  try {
    if (!req.userId) return res.status(401).json({ msg: "Không có token" });

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: "Invalid id" });

    // prevent deleting self (safety)
    if (String(id) === String(req.userId)) {
      return res.status(400).json({ msg: "Không thể xóa chính bạn" });
    }

    const target = await User.findOne({ _id: id, role: "client" }).select("_id name email role").lean();
    if (!target) return res.status(404).json({ msg: "User not found" });

    // Delete user first, then cleanup orders (avoid orphan user doc if order cleanup fails)
    const userDel = await User.deleteOne({ _id: id, role: "client" });
    if (!userDel?.deletedCount) return res.status(500).json({ msg: "Xóa khách hàng thất bại" });

    // Cleanup orders belonging to this user (optional but recommended)
    const ordersDel = await Order.deleteMany({ userId: new mongoose.Types.ObjectId(id) }).catch(() => null);

    return res.json({
      msg: "Xóa khách hàng thành công",
      user: { id: String(target._id), name: target.name, email: target.email, role: target.role },
      deletedOrders: ordersDel?.deletedCount ?? undefined
    });
  } catch (err) {
    console.error("adminDeleteClient error:", err);
    return res.status(500).json({ msg: err.message });
  }
}

module.exports = {
  getWishlist,
  addWishlist,
  deleteWishlist,
  getCart,
  addCart,
  updateCart,
  deleteCart,
  clearCart,
  getMe,
  updateMe,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  createStaff,
  listClients,
  getClient,
  updateClientsStatus,
  adminUpdateClient,
  listStaff, // add
  adminUpdateStaff,
  adminDeleteStaff, // ...existing code...
  adminDeleteClient // { changed code }
};

