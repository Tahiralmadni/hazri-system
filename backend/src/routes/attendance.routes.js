const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all attendance records (admin only)
router.get('/', authMiddleware, adminOnly, attendanceController.getAllAttendance);

// Get attendance for a specific teacher
router.get('/teacher/:teacherId', authMiddleware, attendanceController.getTeacherAttendance);

// Add or update attendance record
router.post('/', authMiddleware, attendanceController.addOrUpdateAttendance);

// Delete attendance record (allow teachers to delete their own records)
router.delete('/:id', authMiddleware, attendanceController.deleteAttendance);

// Get attendance summary for a teacher by month/year
router.get('/summary/teacher/:teacherId', authMiddleware, attendanceController.getAttendanceSummary);

module.exports = router; 