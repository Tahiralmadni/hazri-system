const Attendance = require('../models/attendance.model');
const Teacher = require('../models/teacher.model');
const mongoose = require('mongoose');

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, teacherId } = req.query;
    let query = {};
    
    // Filter by date range if provided
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    // Filter by teacher if provided
    if (teacherId) {
      query.teacherId = teacherId;
    }
    
    const attendance = await Attendance.find(query)
      .select('teacherId teacherName date status timeIn timeOut workHours salaryDeduction comments')
      .sort({ date: -1, teacherName: 1 });
    
    res.status(200).json({ attendance });
  } catch (error) {
    console.error('Error getting attendance records:', error);
    res.status(500).json({ message: 'Server error getting attendance records' });
  }
};

// Get attendance records for a specific teacher
exports.getTeacherAttendance = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // First, try to find records using 'teacher' field (new schema)
    let query = { teacher: teacherId };
    
    // Filter by date range if provided
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    let attendance = await Attendance.find(query)
      .sort({ date: -1 });
      
    // If no records found and 'teacher' query returned empty, try legacy 'teacherId' field
    if (attendance.length === 0) {
      query = { teacherId };
      
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }
      
      attendance = await Attendance.find(query)
        .sort({ date: -1 });
    }
    
    // Format records for consistent response
    const formattedAttendance = attendance.map(record => {
      const recordObj = record.toObject();
      
      // Format the date as YYYY-MM-DD
      const dateObj = new Date(recordObj.date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      return {
        ...recordObj,
        date: formattedDate,
        // Ensure both naming conventions exist
        timeIn: recordObj.checkIn || recordObj.timeIn,
        timeOut: recordObj.checkOut || recordObj.timeOut,
        checkIn: recordObj.checkIn || recordObj.timeIn,
        checkOut: recordObj.checkOut || recordObj.timeOut
      };
    });
    
    // Send both 'attendance' and 'attendanceRecords' for compatibility
    res.status(200).json({ 
      attendance: formattedAttendance,
      attendanceRecords: formattedAttendance 
    });
  } catch (error) {
    console.error('Error getting teacher attendance:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error getting teacher attendance' });
  }
};

// Add or update attendance record
exports.addOrUpdateAttendance = async (req, res) => {
  try {
    console.log("Add/update attendance request body:", req.body);
    
    // Extract fields from request body, support both naming conventions
    const teacherId = req.body.teacher || req.body.teacherId;
    const { date, status, timeIn, timeOut, checkIn, checkOut, comment, comments, workHours, salaryDeduction } = req.body;
    
    // Validate required fields
    if (!teacherId || !date || !status) {
      return res.status(400).json({ message: 'Teacher ID, date and status are required' });
    }
    
    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if record for this teacher and date already exists
    let attendance = await Attendance.findOne({ 
      teacher: teacherId,  // Use 'teacher' field to match schema
      date: new Date(date)
    });
    
    // Format date for consistent output
    const formattedDate = new Date(date);
    
    const finalTimeIn = timeIn || checkIn || null;
    const finalTimeOut = timeOut || checkOut || null;
    const finalComment = comment || comments || null;
    
    if (attendance) {
      // Update existing record
      attendance.status = status;
      // Update time fields with whichever naming convention was provided
      attendance.timeIn = finalTimeIn || attendance.timeIn;
      attendance.timeOut = finalTimeOut || attendance.timeOut;
      attendance.checkIn = finalTimeIn || attendance.checkIn;
      attendance.checkOut = finalTimeOut || attendance.checkOut;
      attendance.comment = finalComment;
      attendance.workHours = workHours !== undefined ? workHours : attendance.workHours;
      attendance.salaryDeduction = salaryDeduction !== undefined ? salaryDeduction : attendance.salaryDeduction;
      attendance.updatedAt = new Date();
      
      await attendance.save();
      
      return res.status(200).json({
        message: 'Attendance record updated successfully',
        attendance
      });
    } else {
      // Create new record
      attendance = new Attendance({
        teacher: teacherId,  // Use 'teacher' field to match schema
        date: formattedDate,
        status,
        timeIn: finalTimeIn,
        timeOut: finalTimeOut,
        checkIn: finalTimeIn,
        checkOut: finalTimeOut,
        comment: finalComment,
        workHours: workHours || 0,
        salaryDeduction: salaryDeduction || 0
      });
      
      console.log("Creating new attendance record:", attendance);
      
      await attendance.save();
      
      return res.status(201).json({
        message: 'Attendance record created successfully',
        attendance: {
          _id: attendance._id,
          teacher: attendance.teacher,
          teacherName: teacher.name,
          date: attendance.date,
          status: attendance.status,
          timeIn: attendance.timeIn || null,
          timeOut: attendance.timeOut || null,
          checkIn: attendance.checkIn || null,
          checkOut: attendance.checkOut || null,
          comment: attendance.comment || null,
          workHours: attendance.workHours || 0,
          salaryDeduction: attendance.salaryDeduction || 0,
          createdAt: attendance.createdAt,
          updatedAt: attendance.updatedAt
        }
      });
    }
  } catch (error) {
    console.error('Error adding/updating attendance record:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error processing attendance record' });
  }
};

// Delete attendance
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    
    // First find the record to check ownership
    const attendanceRecord = await Attendance.findById(id);
    
    if (!attendanceRecord) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Check if user is admin or the record belongs to the requesting teacher
    const isAdmin = req.user?.role === 'admin';
    const isOwner = 
      (userId && attendanceRecord.teacher && (attendanceRecord.teacher.toString() === userId.toString())) ||
      (userId && attendanceRecord.teacherId && (attendanceRecord.teacherId.toString() === userId.toString()));
    
    // Only allow deletion if admin or owner
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this attendance record' });
    }
    
    // Proceed with deletion
    const result = await Attendance.findByIdAndDelete(id);
    console.log(`Attendance record ${id} deleted successfully by ${isAdmin ? 'admin' : 'teacher'} ${userId}`);
    
    res.status(200).json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid attendance ID format' });
    }
    
    res.status(500).json({ message: 'Server error deleting attendance' });
  }
};

// Get attendance summary for a specific month/year
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }
    
    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get the start and end dates for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
    
    // Get all attendance records for the teacher in this month
    const attendanceRecords = await Attendance.find({
      teacherId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate summary
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;
    let late = 0;
    let totalSalaryDeduction = 0;
    let totalWorkHours = 0;
    
    attendanceRecords.forEach(record => {
      switch(record.status) {
        case 'present':
          present++;
          break;
        case 'absent':
          absent++;
          break;
        case 'leave':
          leave++;
          break;
        case 'half-day':
          halfDay++;
          break;
        case 'late':
          late++;
          break;
      }
      
      totalWorkHours += record.workHours || 0;
      totalSalaryDeduction += record.salaryDeduction || 0;
    });
    
    // Calculate total working days in the month (excluding weekends)
    let totalDays = lastDay;
    let weekends = 0;
    
    // Simple calculation for weekends (assumes Saturday and Sunday as weekends)
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(parseInt(year), parseInt(month) - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 is Sunday, 6 is Saturday
        weekends++;
      }
    }
    
    const workingDays = totalDays - weekends;
    
    res.status(200).json({
      summary: {
        teacherId,
        teacherName: teacher.name,
        month: parseInt(month),
        year: parseInt(year),
        present,
        absent,
        leave,
        halfDay,
        late,
        totalWorkHours,
        totalSalaryDeduction,
        workingDays,
        weekends,
        attendancePercentage: workingDays > 0 ? ((present + halfDay * 0.5) / workingDays) * 100 : 0
      },
      records: attendanceRecords
    });
    
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error getting attendance summary' });
  }
};

// Mark attendance for a teacher
exports.markAttendance = async (req, res) => {
  try {
    console.log("Marking attendance with data:", req.body);
    
    const { teacherId, date, checkIn, checkOut, status, comment } = req.body;
    
    // Validate required fields
    if (!teacherId || !date) {
      return res.status(400).json({ message: 'Teacher ID and date are required' });
    }
    
    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if attendance already exists for this teacher and date
    let attendance = await Attendance.findOne({
      teacher: teacherId,
      date: new Date(date)
    });
    
    if (attendance) {
      // Update existing attendance
      attendance.checkIn = checkIn || attendance.checkIn;
      attendance.checkOut = checkOut || attendance.checkOut;
      attendance.timeIn = checkIn || attendance.timeIn; // For compatibility
      attendance.timeOut = checkOut || attendance.timeOut; // For compatibility
      attendance.status = status || attendance.status;
      if (comment) attendance.comment = comment;
      
      console.log("Updating existing attendance:", attendance);
      
      await attendance.save();
      
      res.status(200).json({ 
        message: 'Attendance updated successfully',
        attendance
      });
    } else {
      // Create new attendance record
      attendance = new Attendance({
        teacher: teacherId,
        date: new Date(date),
        checkIn,
        checkOut,
        timeIn: checkIn, // For compatibility
        timeOut: checkOut, // For compatibility
        status: status || 'present',
        comment
      });
      
      console.log("Creating new attendance record:", attendance);
      
      await attendance.save();
      
      res.status(201).json({ 
        message: 'Attendance marked successfully',
        attendance
      });
    }
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error marking attendance' });
  }
};

// Get attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('teacher', 'name');
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Ensure both field naming conventions are available
    const formattedAttendance = {
      ...attendance.toObject(),
      timeIn: attendance.checkIn || attendance.timeIn,
      timeOut: attendance.checkOut || attendance.timeOut,
      checkIn: attendance.checkIn || attendance.timeIn,
      checkOut: attendance.checkOut || attendance.timeOut
    };
    
    res.status(200).json({ attendance: formattedAttendance });
  } catch (error) {
    console.error('Error getting attendance:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid attendance ID format' });
    }
    
    res.status(500).json({ message: 'Server error getting attendance' });
  }
};

// Get attendance for a teacher by date
exports.getAttendanceForTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { date, startDate, endDate, simple } = req.query;
    
    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Try both field naming conventions to ensure we find all records
    let query = { 
      $or: [
        { teacher: teacherId },
        { teacherId: teacherId }
      ]
    };
    
    // Filter by date if provided
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    } else if (startDate && endDate) {
      // Filter by date range if provided
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startDateObj,
        $lte: endDateObj
      };
    }
    
    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'name')
      .sort({ date: -1 });
    
    // Ensure both field naming conventions are available in the response
    const formattedRecords = attendanceRecords.map(record => {
      const recordObj = record.toObject();
      
      // Format the date as YYYY-MM-DD
      const dateObj = new Date(recordObj.date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      return {
        ...recordObj,
        date: formattedDate,
        timeIn: record.checkIn || record.timeIn,
        timeOut: record.checkOut || record.timeOut,
        checkIn: record.checkIn || record.timeIn,
        checkOut: record.checkOut || record.timeOut
      };
    });
    
    // Return both attendance and attendanceRecords for compatibility
    res.status(200).json({ 
      attendance: formattedRecords,
      attendanceRecords: formattedRecords 
    });
  } catch (error) {
    console.error('Error getting attendance for teacher:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error getting attendance' });
  }
};

// Get attendance records by date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: targetDate,
        $lt: nextDay
      }
    })
    .populate('teacher', 'name designation')
    .sort('teacher.name');
    
    // Ensure both field naming conventions are available in the response
    const formattedRecords = attendanceRecords.map(record => {
      const recordObj = record.toObject();
      return {
        ...recordObj,
        timeIn: record.checkIn || record.timeIn,
        timeOut: record.checkOut || record.timeOut,
        checkIn: record.checkIn || record.timeIn,
        checkOut: record.checkOut || record.timeOut
      };
    });
    
    res.status(200).json({ attendanceRecords: formattedRecords });
  } catch (error) {
    console.error('Error getting attendance by date:', error);
    res.status(500).json({ message: 'Server error getting attendance' });
  }
};

// Update attendance
exports.updateAttendance = async (req, res) => {
  try {
    const { checkIn, checkOut, status, comment } = req.body;
    
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Update fields if provided
    if (checkIn !== undefined) {
      attendance.checkIn = checkIn;
      attendance.timeIn = checkIn; // For compatibility
    }
    
    if (checkOut !== undefined) {
      attendance.checkOut = checkOut;
      attendance.timeOut = checkOut; // For compatibility
    }
    
    if (status) attendance.status = status;
    if (comment !== undefined) attendance.comment = comment;
    
    await attendance.save();
    
    // Return the updated attendance with both field naming conventions
    const updatedAttendance = attendance.toObject();
    updatedAttendance.timeIn = attendance.checkIn || attendance.timeIn;
    updatedAttendance.timeOut = attendance.checkOut || attendance.timeOut;
    updatedAttendance.checkIn = attendance.checkIn || attendance.timeIn;
    updatedAttendance.checkOut = attendance.checkOut || attendance.timeOut;
    
    res.status(200).json({ 
      message: 'Attendance updated successfully',
      attendance: updatedAttendance
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid attendance ID format' });
    }
    
    res.status(500).json({ message: 'Server error updating attendance' });
  }
}; 