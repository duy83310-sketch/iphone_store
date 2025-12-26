const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth, requireAdmin } = require("../middleware/auth"); // changed

// NOTE: nếu bạn có middleware auth/requireAdminStaff thì gắn vào đây.
// ví dụ: router.use(authMiddleware, requireAdminOrStaff);

// list staff (supports ?page&limit&q)
router.get("/staff", userController.listStaff);

// list clients (supports ?page&limit&q)
router.get("/clients", userController.listClients);

// get single client detail
router.get("/clients/:id", userController.getClient);

// update single client (for CustomerEdit)
router.patch("/clients/:id", userController.adminUpdateClient);

// { changed code } admin delete client (admin only)
router.delete("/clients/:id", requireAuth, requireAdmin, userController.adminDeleteClient);

// bulk lock/unlock
router.patch("/clients/status", userController.updateClientsStatus);

// { changed code } admin edit staff
router.patch("/staff/:id", requireAuth, userController.adminUpdateStaff);

// { changed code } admin delete staff
router.delete("/staff/:id", requireAuth, userController.adminDeleteStaff);

module.exports = router;
