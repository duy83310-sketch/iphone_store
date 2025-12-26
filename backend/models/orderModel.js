const mongoose = require("mongoose");

const variantSnapshotSchema = new mongoose.Schema({
  version: String,
  color: String,
  storage: String
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  name: { type: String }, // Add product name snapshot
  variantSnapshot: { type: variantSnapshotSchema, required: true }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [orderItemSchema],
  address: {
    label: String,
    details: String,
    province: String,
    country: String,
    phone: String
  },
  paymentMethod: { type: String, default: "cod" },
  shippingMethod: { type: String, default: "fast" },
  deliveryEstimate: String,
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ["PENDING","CONFIRMED","SHIPPING","DELIVERED","CANCELLED"], default: "PENDING" },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  cancelReason: { type: String }
}, { timestamps: true });

// Generate orderCode: ORD-YYYYMMDD-#### (per-day sequence)
orderSchema.pre("save", async function () {
  if (this.orderCode) return;

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const countToday = await this.constructor.countDocuments({
    createdAt: { $gte: start, $lt: end }
  });

  const seq = String(countToday + 1).padStart(4, "0");
  this.orderCode = `ORD-${dateStr}-${seq}`;
});

module.exports = mongoose.model("Order", orderSchema);
