const express = require('express');
const { requireAuth, requireAdmin, requireAdminOrStaff } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Create a staff account (admin only)
// Ensure the user is authenticated and has admin role
router.post('/users/staff', requireAuth, requireAdmin, userController.createStaff);

// List client users (admin or staff)
router.get('/users/clients', requireAuth, requireAdminOrStaff, userController.listClients);

// Bulk lock/unlock client accounts
router.patch('/users/clients/status', requireAuth, requireAdminOrStaff, userController.updateClientsStatus);

module.exports = router;
