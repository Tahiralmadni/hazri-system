const Teacher = require('../models/teacher.model');
const mongoose = require('mongoose');

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort('name');
    
    // Debug: Check each teacher's monthlySalary field
    teachers.forEach(teacher => {
      console.log(`Teacher ${teacher.name}, monthlySalary: ${teacher.monthlySalary} (${typeof teacher.monthlySalary})`);
    });
    
    res.status(200).json({ teachers });
  } catch (error) {
    console.error('Error getting teachers:', error);
    res.status(500).json({ message: 'Server error getting teachers' });
  }
};

// Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .select('-password +plainPassword'); // Exclude hashed password but include plaintext password
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    res.status(200).json({ teacher });
  } catch (error) {
    console.error('Error getting teacher:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error getting teacher' });
  }
};

// Add new teacher
exports.addTeacher = async (req, res) => {
  try {
    console.log("=== ADD TEACHER REQUEST ===");
    console.log("Received teacher data:", JSON.stringify(req.body, null, 2));
    
    const { 
      name, 
      username, 
      grNumber, 
      email, 
      password, 
      phoneNumber,
      contactNumber,
      address, 
      joiningDate,
      monthlySalary,
      designation,
      jamiaType,
      workingHours
    } = req.body;
    
    // Validate required fields
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    
    // Either username or GR number must be provided
    if (!username && !grNumber) {
      return res.status(400).json({ message: 'Either username or GR number must be provided' });
    }
    
    // Validate GR number length if provided
    if (grNumber && grNumber.length !== 5) {
      return res.status(400).json({ message: 'GR Number must be exactly 5 digits' });
    }
    
    // Check if username already exists if provided
    if (username) {
      const existingTeacher = await Teacher.findOne({ username: username.toLowerCase() });
      if (existingTeacher) {
        return res.status(400).json({ message: 'Teacher with this username already exists' });
      }
    }
    
    // Check if GR number already exists if provided
    if (grNumber) {
      const grExists = await Teacher.findOne({ grNumber });
      if (grExists) {
        return res.status(400).json({ message: 'Teacher with this GR number already exists' });
      }
    }
    
    // Check if email is unique if provided
    if (email) {
      const emailExists = await Teacher.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: 'Teacher with this email already exists' });
      }
    }
    
    // Process contact number - priority to contactNumber if provided, fall back to phoneNumber
    const finalContactNumber = contactNumber || phoneNumber || '';
    
    // Process salary - ensure it's a number
    let finalSalary = 0;
    if (monthlySalary !== undefined && monthlySalary !== null) {
      finalSalary = Number(monthlySalary);
      if (isNaN(finalSalary)) finalSalary = 0;
    }
    console.log(`Processing salary: original=${monthlySalary}, final=${finalSalary}, type=${typeof finalSalary}`);
    
    // Final designation
    const finalDesignation = designation || 'قاعدہ';
    console.log(`Processing designation: original=${designation}, final=${finalDesignation}`);
    
    // Final jamiaType - only apply if designation is 'جامعہ'
    let finalJamiaType = '';
    if (finalDesignation === 'جامعہ' && jamiaType) {
      finalJamiaType = jamiaType;
    }
    
    // Create new teacher
    const teacher = new Teacher({
      name,
      username: username ? username.toLowerCase() : `teacher_${Date.now()}`, // Generate default username if not provided
      grNumber,
      email: email ? email.toLowerCase() : undefined,
      password,
      phoneNumber: finalContactNumber,
      contactNumber: finalContactNumber, // Store in both fields for compatibility
      address,
      joiningDate: joiningDate || new Date(),
      active: true,
      monthlySalary: finalSalary,
      designation: finalDesignation,
      jamiaType: finalJamiaType,
      workingHours: workingHours || {
        startTime: '08:00', 
        endTime: '16:00'
      }
    });
    
    console.log("Teacher object before save:", JSON.stringify(teacher.toObject(), null, 2));
    
    await teacher.save();
    
    // Return teacher data without password
    const teacherData = teacher.toObject();
    delete teacherData.password;
    
    console.log("Teacher saved successfully. Response data:", JSON.stringify(teacherData, null, 2));
    
    res.status(201).json({
      message: 'Teacher added successfully',
      teacher: teacherData
    });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ message: 'Server error adding teacher', error: error.message });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  try {
    console.log("Update teacher request body:", req.body);
    
    const { 
      name, 
      username, 
      grNumber,
      email, 
      phoneNumber, 
      contactNumber,
      address, 
      active, 
      joiningDate, 
      monthlySalary, 
      workingHours, 
      designation,
      jamiaType 
    } = req.body;
    
    const teacherId = req.params.id;
    
    // Find teacher first
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Validate GR number length if provided
    if (grNumber !== undefined && grNumber !== null && grNumber !== '' && grNumber.length !== 5) {
      return res.status(400).json({ message: 'GR Number must be exactly 5 digits' });
    }
    
    // Check if username already exists for another teacher
    if (username && username !== teacher.username) {
      const existingTeacher = await Teacher.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: teacherId }
      });
      
      if (existingTeacher) {
        return res.status(400).json({ message: 'Teacher with this username already exists' });
      }
    }
    
    // Check if GR number already exists for another teacher
    if (grNumber && grNumber !== teacher.grNumber) {
      const grExists = await Teacher.findOne({ 
        grNumber,
        _id: { $ne: teacherId }
      });
      
      if (grExists) {
        return res.status(400).json({ message: 'Teacher with this GR number already exists' });
      }
    }
    
    // Check if email is unique if changed
    if (email && email !== teacher.email) {
      const emailExists = await Teacher.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: teacherId }
      });
      
      if (emailExists) {
        return res.status(400).json({ message: 'Teacher with this email already exists' });
      }
    }
    
    // Process contact information - use contactNumber if provided, fall back to phoneNumber
    const finalContactNumber = contactNumber || phoneNumber || teacher.contactNumber || teacher.phoneNumber || '';
    
    // Process monthly salary
    let finalSalary = teacher.monthlySalary || 0;
    if (monthlySalary !== undefined && monthlySalary !== null) {
      finalSalary = Number(monthlySalary);
      if (isNaN(finalSalary)) finalSalary = 0;
    }
    
    // Update fields
    if (name) teacher.name = name;
    if (username) teacher.username = username.toLowerCase();
    if (grNumber !== undefined) teacher.grNumber = grNumber;
    if (email) teacher.email = email.toLowerCase();
    teacher.phoneNumber = finalContactNumber;
    teacher.contactNumber = finalContactNumber;
    if (address !== undefined) teacher.address = address;
    if (active !== undefined) teacher.active = active;
    if (joiningDate) teacher.joiningDate = joiningDate;
    
    // Handle monthlySalary
    teacher.monthlySalary = finalSalary;
    
    // Handle designation
    if (designation) {
      teacher.designation = designation;
    } else if (!teacher.designation) {
      teacher.designation = 'قاعدہ';
    }
    
    // Handle jamiaType - only set if designation is 'جامعہ'
    if (teacher.designation === 'جامعہ') {
      teacher.jamiaType = jamiaType || '';
    } else {
      teacher.jamiaType = '';
    }
    
    // Handle working hours
    if (workingHours) {
      teacher.workingHours = workingHours;
    } else if (!teacher.workingHours) {
      teacher.workingHours = {
        startTime: '08:00',
        endTime: '16:00'
      };
    }
    
    console.log("Saving updated teacher with:", {
      monthlySalary: teacher.monthlySalary,
      contactNumber: teacher.contactNumber,
      designation: teacher.designation,
      jamiaType: teacher.jamiaType
    });
    
    await teacher.save();
    
    // Return updated teacher without password
    const teacherData = teacher.toObject();
    delete teacherData.password;
    
    res.status(200).json({
      message: 'Teacher updated successfully',
      teacher: teacherData
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error updating teacher' });
  }
};

// Update teacher password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const teacherId = req.params.id;
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if current password is correct
    const isMatch = await teacher.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    teacher.password = newPassword;
    await teacher.save();
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error updating password' });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    const result = await Teacher.findByIdAndDelete(teacherId);
    
    if (!result) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    
    // Check if error is due to invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    res.status(500).json({ message: 'Server error deleting teacher' });
  }
}; 