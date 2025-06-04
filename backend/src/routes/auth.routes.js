const express = require('express');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Login route
router.post('/login', authController.login);

// Admin setup route
router.post('/admin-setup', authController.adminSetup);

// Get current user (protected route)
router.get('/user', authMiddleware, authController.getCurrentUser);

module.exports = router; 