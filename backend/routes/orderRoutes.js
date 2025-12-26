const express = require("express");
const router = express.Router();
const { requireAuth, requireAdminOrStaff } = require("../middleware/auth");
const { createOrder, getOrders, cancelOrder, getAllOrders, updateOrderStatus, deleteOrder, batchDeleteOrders, getRevenueForDay, getOrderById, getAdminStats, getRevenueRange } = require("../controllers/orderController");

router.post("/", requireAuth, createOrder);
router.get("/", requireAuth, getOrders);

// Admin listing (can pass ?userId=... to filter per-user)
router.get("/admin", requireAuth, requireAdminOrStaff, getAllOrders);
// Admin/staff revenue for a given day, e.g. ?date=2025-12-16
router.get("/admin/revenue", requireAuth, requireAdminOrStaff, getRevenueForDay);
// Admin/staff dashboard stats (total sold units, total stock)
router.get("/admin/stats", requireAuth, requireAdminOrStaff, getAdminStats);
// Admin/staff revenue range for chart
router.get("/admin/revenue-range", requireAuth, requireAdminOrStaff, getRevenueRange);
// Single order detail (owner or admin)
router.get("/:id", requireAuth, getOrderById);
router.patch("/:id/cancel", requireAuth, cancelOrder);
router.patch("/:id/status", requireAuth, requireAdminOrStaff, updateOrderStatus);
router.delete("/:id", requireAuth, deleteOrder);
router.post("/batch-delete", requireAuth, batchDeleteOrders);

module.exports = router;
