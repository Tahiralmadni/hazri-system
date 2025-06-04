const express = require('express');
const teacherController = require('../controllers/teacher.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all teachers (admin only)
router.get('/', authMiddleware, adminOnly, teacherController.getAllTeachers);

// Get teacher by ID
router.get('/:id', authMiddleware, teacherController.getTeacherById);

// Add new teacher (admin only)
router.post('/', authMiddleware, adminOnly, teacherController.addTeacher);

// Update teacher (admin only)
router.put('/:id', authMiddleware, adminOnly, teacherController.updateTeacher);

// Update teacher password
router.put('/:id/password', authMiddleware, teacherController.updatePassword);

// Delete teacher (admin only)
router.delete('/:id', authMiddleware, adminOnly, teacherController.deleteTeacher);

module.exports = router; 