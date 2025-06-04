/**
 * Script to generate GR numbers for existing teachers
 * Run this script with Node.js to update all existing teachers with GR numbers
 * Example: node migrate-to-gr-numbers.js
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const Teacher = require('../models/teacher.model');

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Generate a unique 5-digit GR number
const generateGrNumber = (index) => {
  // Start from 10000 and increment for each teacher
  // This guarantees 5 digits and uniqueness
  const grNumber = 10000 + index;
  return grNumber.toString();
};

// Main function to update teachers
async function migrateToGrNumbers() {
  try {
    // Get all teachers without GR numbers
    const teachers = await Teacher.find({ 
      $or: [
        { grNumber: { $exists: false } },
        { grNumber: null },
        { grNumber: "" }
      ]
    }).sort('name');
    
    console.log(`Found ${teachers.length} teachers without GR numbers`);
    
    // Update each teacher
    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      
      // Generate a GR number (5 digits)
      const grNumber = generateGrNumber(i);
      
      // Check if this GR number already exists
      const existingWithGr = await Teacher.findOne({ grNumber });
      
      // If GR number already exists, generate a different one
      let finalGrNumber = grNumber;
      if (existingWithGr) {
        // Create a different 5-digit number that isn't used yet
        finalGrNumber = (20000 + i).toString();
        // Double check it's not used
        const doubleCheck = await Teacher.findOne({ grNumber: finalGrNumber });
        if (doubleCheck) {
          finalGrNumber = (30000 + i).toString();
        }
      }
      
      // Update the teacher
      await Teacher.findByIdAndUpdate(
        teacher._id,
        { grNumber: finalGrNumber }
      );
      
      console.log(`Updated teacher ${teacher.name} with GR number ${finalGrNumber}`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateToGrNumbers(); 