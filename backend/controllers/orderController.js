const Order = require("../models/orderModel");
const User = require("../models/userModel");

async function createOrder(req, res) {
  try {
    const userId = req.userId;
    const { items, addressId, paymentMethod, shippingMethod, deliveryEstimate, totalPrice } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: "Không có sản phẩm trong đơn" });
    }

    if (!addressId) {
      return res.status(400).json({ msg: "Thiếu địa chỉ giao hàng" });
    }

    // Load user and find the address snapshot
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "Người dùng không tồn tại" });

    // Safely resolve address (user.addresses may be undefined or a Mongoose subdocument array)
    const addr = (user.addresses && typeof user.addresses.id === 'function' ? user.addresses.id(addressId) : null)
      || (Array.isArray(user.addresses) ? user.addresses.find(a => String(a._id) === String(addressId)) : null);

    if (!addr) return res.status(400).json({ msg: "Địa chỉ không hợp lệ" });

    // --- Validate stock for each requested item ---
    const Product = require("../models/productModel");
    const productIds = items.map(i => Number(i.productId));
    // Only accept numeric productId values. No Mongo _id fallback.
    if (productIds.some(p => !Number.isFinite(p))) {
      return res.status(400).json({ msg: "Invalid productId in items" });
    }

    const products = await Product.find({ id: { $in: productIds } }).lean();

    if (!Array.isArray(products) || products.length === 0) {
      console.warn("createOrder: products lookup returned none for numeric ids:", productIds);
    }

    console.log('createOrder: numericIds=', productIds, 'productsFound=', products.map(p => ({ id: p.id, _id: String(p._id), name: p.name, variantsCount: (Array.isArray(p.variants)?p.variants.length:0) })));

    const insufficient = [];
    const productsByNumId = new Map();
    const productsByObjId = new Map();
    products.forEach(p => {
      if (p.id !== undefined) productsByNumId.set(Number(p.id), p);
      productsByObjId.set(String(p._id), p);
    });

    // Aggregate requested quantities per product-variant to detect over-request across multiple lines
    const requestedAggregate = {};
    const pendingItems = [];

    const norm = (v) => String(v ?? "").trim().toLowerCase();

    for (const i of items) {
      const pidNum = Number(i.productId);
      const qty = Number(i.quantity) || 0;
      const prod = productsByNumId.get(pidNum) || productsByObjId.get(String(i.productId));
      if (!prod) {
        console.warn('createOrder: product not found for item', { productId: i.productId });
        insufficient.push({ productId: i.productId, name: '-', requested: qty, available: 0 });
        continue;
      }

      // Normalize requested variant info from variantSnapshot (new payload)
      const reqColor = i.variantSnapshot?.color ?? null;
      const reqStorage = i.variantSnapshot?.storage ?? null;

      if (Array.isArray(prod.variants) && prod.variants.length > 0) {
        if (reqColor || reqStorage) {
          const matchIdx = prod.variants.findIndex(v => {
            const colorMatch = reqColor ? norm(v.color) === norm(reqColor) : true;
            const storageMatch = reqStorage ? norm(v.storage) === norm(reqStorage) : true;
            return colorMatch && storageMatch;
          });

          if (matchIdx >= 0) {
            const key = `${String(prod._id)}:${matchIdx}`;
            const available = Number(prod.variants[matchIdx].stock) || 0;
            if (!requestedAggregate[key]) requestedAggregate[key] = { prodId: prod._id, matchIdx, requested: 0, available, name: prod.name };
            requestedAggregate[key].requested += qty;
            continue;
          }

          // no exact match: defer computing availability until after aggregation
          pendingItems.push({ item: i, prod, reqColor, reqStorage, qty });
          continue;
        }

        // no specific variant requested: treat as aggregate across all variants
        const totalAvailable = prod.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
        if (qty > totalAvailable) insufficient.push({ productId: i.productId, name: prod.name, requested: qty, available: totalAvailable });
        continue;
      }

      // no variants: use top-level stock
      const available = Number(prod.stock) || 0;
      if (qty > available) insufficient.push({ productId: i.productId, name: prod.name, requested: qty, available });
    }

    // Validate aggregated variant requests
    Object.keys(requestedAggregate).forEach(k => {
      const a = requestedAggregate[k];
      if (a.requested > a.available) {
        insufficient.push({ productId: String(a.prodId), name: a.name, requested: a.requested, available: a.available });
      }
    });

    // Handle pending items (no exact match found) availability
    for (const pItem of pendingItems) {
      const { item, prod, reqColor, reqStorage, qty } = pItem;
      let available = 0;
      if (reqColor && !reqStorage) {
        available = prod.variants.filter(v => norm(v.color) === norm(reqColor)).reduce((s, v) => s + (Number(v.stock) || 0), 0);
      } else if (reqStorage && !reqColor) {
        available = prod.variants.filter(v => norm(v.storage) === norm(reqStorage)).reduce((s, v) => s + (Number(v.stock) || 0), 0);
      } else {
        available = prod.variants.filter(v =>
          (reqColor && norm(v.color) === norm(reqColor)) ||
          (reqStorage && norm(v.storage) === norm(reqStorage))
        ).reduce((s, v) => s + (Number(v.stock) || 0), 0);
      }
      if (qty > available) {
        insufficient.push({ productId: item.productId, name: prod.name, requested: qty, available });
      }
    }

    if (insufficient.length > 0) {
      return res.status(400).json({ msg: "Số lượng hàng tồn kho không đủ", details: insufficient });
    }

    // --- Deduct stock ---
    for (const i of items) {
      const pidNum = Number(i.productId);
      const qty = Number(i.quantity) || 0;
      const prod = products.find(p => ((p.id !== undefined) && Number(p.id) === pidNum) || String(p._id) === String(i.productId));
      if (!prod) continue;

      const reqColor = i.variantSnapshot?.color ?? null;
      const reqStorage = i.variantSnapshot?.storage ?? null;

      if (Array.isArray(prod.variants) && prod.variants.length > 0) {
        if (reqColor || reqStorage) {
          const matchIdx = prod.variants.findIndex(v => {
            const colorMatch = reqColor ? norm(v.color) === norm(reqColor) : true;
            const storageMatch = reqStorage ? norm(v.storage) === norm(reqStorage) : true;
            return colorMatch && storageMatch;
          });
          if (matchIdx >= 0) {
            const path = `variants.${matchIdx}.stock`;
            await Product.updateOne({ _id: prod._id }, { $inc: { [path]: -qty } });
          } else {
            await Product.updateOne({ _id: prod._id }, { $inc: { "variants.0.stock": -qty } });
          }
        } else {
          await Product.updateOne({ _id: prod._id }, { $inc: { "variants.0.stock": -qty } });
        }
      } else {
        await Product.updateOne({ _id: prod._id }, { $inc: { stock: -qty } });
      }
    }

    // Persist order (minimal item fields)
    const order = new Order({
      userId,
      items: items.map(i => {
        // Find product for name snapshot
        const pidNum = Number(i.productId);
        const prod = products.find(p => ((p.id !== undefined) && Number(p.id) === pidNum) || String(p._id) === String(i.productId));
        return {
          productId: String(i.productId),
          unitPrice: Number(i.unitPrice ?? 0) || 0,
          quantity: Number(i.quantity) || 0,
          name: prod?.name || undefined, // Add product name snapshot
          variantSnapshot: {
            version: i.variantSnapshot?.version ?? null,
            color: i.variantSnapshot?.color ?? null,
            storage: i.variantSnapshot?.storage ?? null
          }
        };
      }),
      address: {
        label: addr.label,
        details: addr.details,
        province: addr.province,
        country: addr.country,
        phone: addr.phone
      },
      paymentMethod,
      shippingMethod,
      deliveryEstimate,
      totalPrice
    });

    await order.save();
    return res.status(201).json(order);
  } catch (err) {
    console.error("createOrder error", err, { userId: req.userId, items: req.body.items, addressId: req.body.addressId });
    return res.status(500).json({ msg: "Lỗi server" });
  }
}

async function restoreStockForOrder(order) {
  try {
    const Product = require("../models/productModel");
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;

    const productIds = order.items.map(i => Number(i.productId));
    if (productIds.some(p => !Number.isFinite(p))) {
      console.warn('restoreStockForOrder: invalid productId in order items', order.items.map(it => it.productId));
      return;
    }

    const products = await Product.find({ id: { $in: productIds } }).lean();
    const norm = (v) => String(v ?? "").trim().toLowerCase();

    for (const it of order.items) {
      const pidNum = Number(it.productId);
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) continue;
      const prod = products.find(p => ((p.id !== undefined) && Number(p.id) === pidNum));
      if (!prod) {
        console.warn(`restoreStock: product not found for id=${it.productId}`);
        continue;
      }

      if (Array.isArray(prod.variants) && prod.variants.length > 0) {
        const reqColor = it.variantSnapshot?.color ?? null;
        const reqStorage = it.variantSnapshot?.storage ?? null;

        if (reqColor || reqStorage) {
          const matchIdx = prod.variants.findIndex(v => {
            const colorMatch = reqColor ? norm(v.color) === norm(reqColor) : true;
            const storageMatch = reqStorage ? norm(v.storage) === norm(reqStorage) : true;
            return colorMatch && storageMatch;
          });
          if (matchIdx >= 0) {
            const path = `variants.${matchIdx}.stock`;
            await Product.updateOne({ _id: prod._id }, { $inc: { [path]: qty } });
          } else {
            await Product.updateOne({ _id: prod._id }, { $inc: { "variants.0.stock": qty } });
          }
        } else {
          await Product.updateOne({ _id: prod._id }, { $inc: { "variants.0.stock": qty } });
        }
      } else {
        await Product.updateOne({ _id: prod._id }, { $inc: { stock: qty } });
      }
    }
  } catch (err) {
    console.error("restoreStockForOrder error", err);
    throw err;
  }
}

// RESTORE MISSING HANDLERS (used by orderRoutes)
async function getOrders(req, res) {
  try {
    const userId = req.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    console.error("getOrders error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

async function getAllOrders(req, res) {
  try {
    const { userId, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;

    const filter = {};
    if (userId) filter.userId = userId;
    if (status && String(status).toUpperCase() !== 'ALL') filter.status = String(status).toUpperCase();

    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name phone email')
      .lean();

    const mapped = orders.map((o) => ({
      id: o._id,
      userId: o.userId?._id || o.userId,
      customer: o.userId?.name || "-",
      phone: o.userId?.phone || "",
      email: o.userId?.email || "",
      date: o.createdAt,
      total: o.totalPrice,
      status: String(o.status || "").toUpperCase(),
      items: o.items,
      address: o.address,
      shippingMethod: o.shippingMethod,
      cancelReason: o.cancelReason,
      // NEW: fields for admin UI
      orderCode: o.orderCode,
      paymentMethod: o.paymentMethod,
      deliveryEstimate: o.deliveryEstimate,
      shippedAt: o.shippedAt,
      deliveredAt: o.deliveredAt
    }));

    res.json({ data: mapped, total });
  } catch (err) {
    console.error("getAllOrders error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('userId', 'name phone email').lean();
    if (!order) return res.status(404).json({ msg: 'Đơn hàng không tồn tại' });

    if (String(order.userId?._id || order.userId) !== String(req.userId) && req.userRole !== 'admin' && req.userRole !== 'staff') {
      return res.status(403).json({ msg: 'Không có quyền xem đơn hàng này' });
    }

    const mapped = {
      id: order._id,
      userId: order.userId?._id || order.userId,
      customer: order.userId?.name || "-",
      phone: order.userId?.phone || "",
      email: order.userId?.email || "",
      date: order.createdAt,
      total: order.totalPrice,
      status: String(order.status || "").toUpperCase(),
      items: order.items,
      address: order.address,
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      deliveryEstimate: order.deliveryEstimate,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelReason: order.cancelReason,
      // NEW: include orderCode
      orderCode: order.orderCode
    };

    res.json(mapped);
  } catch (err) {
    console.error('getOrderById error', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
}

async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const userId = req.userId;

    if (!cancelReason || !cancelReason.trim()) {
      return res.status(400).json({ msg: "Vui lòng nhập lý do hủy đơn" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ msg: "Đơn hàng không tồn tại" });

    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ msg: "Không có quyền hủy đơn hàng này" });
    }

    const st = String(order.status || "").toUpperCase();
    if (st !== "PENDING" && st !== "CONFIRMED") {
      return res.status(400).json({ msg: "Không thể hủy đơn hàng ở trạng thái hiện tại" });
    }

    order.status = "CANCELLED";
    order.cancelReason = cancelReason;

    await restoreStockForOrder(order);
    await order.save();

    res.json(order);
  } catch (err) {
    console.error("cancelOrder error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ msg: "Missing status" });

    const st = String(status).toUpperCase();
    const allowed = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];
    if (!allowed.includes(st)) return res.status(400).json({ msg: "Invalid status" });

    const role = String(req.userRole || "").toLowerCase();
    if (role !== "admin" && role !== "staff") {
      return res.status(403).json({ msg: "Chỉ admin hoặc staff mới có quyền thay đổi trạng thái" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ msg: "Đơn hàng không tồn tại" });

    const cur = String(order.status || "").toUpperCase();

    if (st === "SHIPPING" && cur !== "CONFIRMED") {
      return res.status(400).json({ msg: "Chỉ có thể bắt đầu giao khi đơn đã được xác nhận" });
    }
    if (st === "DELIVERED" && cur !== "SHIPPING") {
      return res.status(400).json({ msg: "Chỉ có thể hoàn tất khi đơn đang trong trạng thái giao" });
    }
    if (st === "CANCELLED" && cur === "SHIPPING") {
      return res.status(400).json({ msg: "Không thể hủy đơn khi đang giao" });
    }

    if (st === "CANCELLED" && cur !== "CANCELLED") {
      await restoreStockForOrder(order);
      order.status = st;
      order.cancelReason = undefined;
    } else {
      order.status = st;
      if (st === "SHIPPING") {
        order.shippedAt = new Date();
      } else if (st === "DELIVERED") {
        order.deliveredAt = new Date();
      } else if (st === "PENDING") {
        order.shippedAt = undefined;
        order.deliveredAt = undefined;
      }
      if (st !== "CANCELLED") order.cancelReason = undefined;
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error("updateOrderStatus error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

// DELETE ORDER BY ID (soft delete)
async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ msg: "Đơn hàng không tồn tại" });

    await restoreStockForOrder(order);
    await Order.deleteOne({ _id: id });

    res.json({ msg: "Đã xóa đơn hàng" });
  } catch (err) {
    console.error("deleteOrder error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

// DELETE MULTIPLE ORDERS
async function batchDeleteOrders(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ msg: "Invalid ids array" });
    }

    const orders = await Order.find({ _id: { $in: ids } });
    for (const order of orders) {
      await restoreStockForOrder(order);
    }

    await Order.deleteMany({ _id: { $in: ids } });
    res.json({ msg: "Đã xóa nhiều đơn hàng" });
  } catch (err) {
    console.error("batchDeleteOrders error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

// ADMIN STATS
// Returns totals including sold units and stock for dashboard
async function getAdminStats(req, res) {
  try {
    const totalOrders = await Order.countDocuments();

    // Revenue from delivered orders (for legacy consumers)
    const totalRevenue = await Order.aggregate([
      { $match: { status: "DELIVERED" } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", 0] } } } }
    ]).then(result => (result[0] && result[0].total) || 0);

    // Created today (orders count)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const totalToday = await Order.countDocuments({ createdAt: { $gte: todayStart } });

    // Sold units: sum of item quantities in delivered orders
    const soldAgg = await Order.aggregate([
      { $match: { status: "DELIVERED" } },
      { $unwind: "$items" },
      { $group: { _id: null, totalSold: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
    ]);
    const totalSold = (soldAgg[0] && soldAgg[0].totalSold) || 0;

    // Sold today and yesterday based on deliveredAt
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const yStart = new Date(dayStart);
    yStart.setDate(yStart.getDate() - 1);
    const yEnd = new Date(dayStart);

    const [soldTodayAgg, soldYesterdayAgg] = await Promise.all([
      Order.aggregate([
        { $match: { status: "DELIVERED", deliveredAt: { $gte: dayStart, $lt: dayEnd } } },
        { $unwind: "$items" },
        { $group: { _id: null, soldToday: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
      ]),
      Order.aggregate([
        { $match: { status: "DELIVERED", deliveredAt: { $gte: yStart, $lt: yEnd } } },
        { $unwind: "$items" },
        { $group: { _id: null, soldYesterday: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
      ])
    ]);

    const soldToday = (soldTodayAgg[0] && soldTodayAgg[0].soldToday) || 0;
    const soldYesterday = (soldYesterdayAgg[0] && soldYesterdayAgg[0].soldYesterday) || 0;

    // Total stock: sum of all variant stocks + top-level stock (for non-variant products)
    const Product = require("../models/productModel");
    const [variantAgg, topLevelAgg] = await Promise.all([
      Product.aggregate([
        { $unwind: { path: "$variants", preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$variants.stock", 0] } } } }
      ]),
      Product.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ["$stock", 0] } } } }
      ])
    ]);
    const totalStock = ((variantAgg[0] && variantAgg[0].total) || 0) + ((topLevelAgg[0] && topLevelAgg[0].total) || 0);

    res.json({
      // Existing fields
      totalOrders,
      totalRevenue,
      totalToday,
      // Dashboard fields expected by frontend
      totalSold,
      totalStock,
      soldToday,
      soldYesterday
    });
  } catch (err) {
    console.error("getAdminStats error", err);
    res.status(500).json({ msg: "Lỗi server" });
  }
}

// REVENUE RANGE
// Supports two modes:
// 1) Query by last N days: ?days=7 -> { days: [{date,total}], total, percent }
// 2) Explicit range: ?start=YYYY-MM-DD&end=YYYY-MM-DD -> { totalRevenue }
async function getRevenueRange(req, res) {
  try {
    const daysParam = req.query.days;

    // { changed code } ensure day grouping uses consistent timezone
    // Default to Vietnam timezone offset; override via env if needed
    const REPORT_TZ = process.env.REPORT_TZ || "+07:00";

    if (daysParam) {
      let days = parseInt(daysParam, 10);
      if (!Number.isFinite(days) || days <= 0) days = 7;
      days = Math.min(days, 31);

      // Local day boundaries
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const rangeStart = new Date(todayStart);
      rangeStart.setDate(rangeStart.getDate() - (days - 1));
      const rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 1); // exclusive upper bound

      // Aggregate delivered revenue grouped by day
      const agg = await Order.aggregate([
        { $match: { status: 'DELIVERED', deliveredAt: { $gte: rangeStart, $lt: rangeEnd } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt', timezone: REPORT_TZ } },
            total: { $sum: { $ifNull: [ '$totalPrice', 0 ] } }
        } },
        { $project: { _id: 0, date: '$_id', total: 1 } }
      ]);

      // Build last N-day series, filling missing days with 0
      const map = new Map(agg.map(x => [x.date, x.total]));
      const daysOut = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(rangeStart.getDate() + i);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        daysOut.push({ date: ds, total: map.get(ds) || 0 });
      }

      const total = daysOut.reduce((s, x) => s + (Number(x.total) || 0), 0);

      // Compute percent vs previous window of same length
      const prevStart = new Date(rangeStart);
      prevStart.setDate(prevStart.getDate() - days);
      const prevEnd = new Date(rangeStart);

      const prevAgg = await Order.aggregate([
        { $match: { status: 'DELIVERED', deliveredAt: { $gte: prevStart, $lt: prevEnd } } },
        { $group: { _id: null, total: { $sum: { $ifNull: [ '$totalPrice', 0 ] } } } }
      ]);
      const prevTotal = (prevAgg[0] && prevAgg[0].total) || 0;
      let percent;
      if (prevTotal === 0) percent = total === 0 ? 0 : 100;
      else percent = ((total - prevTotal) / prevTotal) * 100;

      return res.json({ days: daysOut, total, percent });
    }

    // Fallback: explicit start/end range
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ msg: 'Thiếu thông tin khoảng thời gian' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const totalRevenue = await Order.aggregate([
      { $match: { status: 'DELIVERED', deliveredAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: { $ifNull: [ '$totalPrice', 0 ] } } } }
    ]).then(result => (result[0] && result[0].total) || 0);

    res.json({ totalRevenue });
  } catch (err) {
    console.error('getRevenueRange error', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
}

// GET /orders/admin/revenue?date=YYYY-MM-DD - admin only: revenue sum for that day
async function getRevenueForDay(req, res) {
  try {
    const { date } = req.query;

    // Determine day range in server local timezone
    let dayStart, dayEnd;
    if (date) {
      const parts = String(date).split('-').map(Number);
      if (parts.length === 3 && !parts.some(Number.isNaN)) {
        dayStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      }
    }
    if (!dayStart) {
      const now = new Date();
      dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Sum totalPrice for orders delivered within the day, and count created orders
    const agg = await Order.aggregate([
      { $facet: {
          delivered: [
            { $match: { status: 'DELIVERED', deliveredAt: { $gte: dayStart, $lt: dayEnd } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", 0] } }, deliveredCount: { $sum: 1 } } }
          ],
          created: [
            { $match: { createdAt: { $gte: dayStart, $lt: dayEnd } } },
            { $group: { _id: null, createdCount: { $sum: 1 } } }
          ]
      } }
    ]);

    const delivered = (agg[0] && agg[0].delivered && agg[0].delivered[0]) ? agg[0].delivered[0] : {};
    const created = (agg[0] && agg[0].created && agg[0].created[0]) ? agg[0].created[0] : {};

    res.json({
      date: dayStart.toISOString().slice(0,10),
      total: delivered.total || 0,
      deliveredCount: delivered.deliveredCount || 0,
      createdCount: created.createdCount || 0
    });
  } catch (err) {
    console.error('getRevenueForDay error', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getAllOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  deleteOrder,
  batchDeleteOrders,
  getRevenueForDay,
  getAdminStats,
  getRevenueRange,
  restoreStockForOrder
};
