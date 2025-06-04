const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacher.model');
const config = require('../config/config');

// JWT secret and expiration
const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;

// Login controller
exports.login = async (req, res) => {
  try {
    console.log("LOGIN CONTROLLER: Request body:", req.body);
    const { grNumber, password } = req.body;
    
    if (!grNumber || !password) {
      return res.status(400).json({ message: 'Please provide GR number and password' });
    }

    // Check for admin login - using GR number "12345"
    if (grNumber === '12345') {
      // Hard-coded admin credentials
      if (password === 'tahir123') {
        // Generate token for admin
        const token = jwt.sign(
          { id: 'admin-id', email: 'tahiralmadni@gmail.com', name: 'Admin', role: 'admin' },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );
        
        console.log("LOGIN CONTROLLER: Admin login successful, token generated");
        
        return res.status(200).json({
          token,
          user: {
            id: 'admin-id',
            email: 'tahiralmadni@gmail.com',
            name: 'Admin',
            grNumber: '12345',
            role: 'admin',
            lastLogin: Date.now()
          }
        });
      } else {
        console.log("LOGIN CONTROLLER: Admin login failed - invalid password");
        return res.status(401).json({ message: 'Invalid admin password' });
      }
    }

    // For teachers, check the database
    let teacher;
    
    // Try to find by GR number
    teacher = await Teacher.findOne({ grNumber });
    
    // If not found by GR number, try username and email (for backward compatibility)
    if (!teacher) {
      if (grNumber.includes('@')) {
        teacher = await Teacher.findOne({ email: grNumber.toLowerCase() });
      } else {
        // Case insensitive username search
        teacher = await Teacher.findOne({
          username: { $regex: new RegExp(`^${grNumber}$`, 'i') }
        });
      }
    }

    // If no teacher found
    if (!teacher) {
      console.log(`LOGIN CONTROLLER: Teacher not found with GR number: ${grNumber}`);
      return res.status(404).json({ message: 'Teacher not found with this GR number' });
    }

    // Check if password matches
    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      console.log(`LOGIN CONTROLLER: Invalid password for teacher with GR number: ${grNumber}`);
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate token for teacher
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, name: teacher.name, role: 'teacher' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`LOGIN CONTROLLER: Teacher login successful, token generated for: ${teacher.name}`);

    // Return token and user data
    return res.status(200).json({
      token,
      user: {
        id: teacher._id,
        email: teacher.email,
        name: teacher.name,
        grNumber: teacher.grNumber,
        username: teacher.username,
        role: 'teacher',
        lastLogin: Date.now()
      }
    });

  } catch (error) {
    console.error('LOGIN CONTROLLER: Error during login:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// Admin setup controller (first-time setup)
exports.adminSetup = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Hard-coded admin setup for now
    // In a real app, you'd check if this is the first use and save admin credentials
    
    return res.status(200).json({ message: 'Admin setup completed', success: true });
  } catch (error) {
    console.error('Admin setup error:', error);
    return res.status(500).json({ message: 'Server error during admin setup' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already available in req.user from middleware
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // For admin, return the admin data
    if (req.user.role === 'admin') {
      return res.status(200).json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: 'admin'
        }
      });
    }
    
    // For teacher, get updated info from database
    const teacher = await Teacher.findById(req.user.id).select('-password');
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    return res.status(200).json({
      user: {
        id: teacher._id,
        email: teacher.email,
        name: teacher.name,
        username: teacher.username,
        role: 'teacher'
      }
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error getting user data' });
  }
}; 