const mongoose = require('mongoose');
const config = require('./src/config/config');

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Define the teacher schema
const TeacherSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  password: String,
  plainPassword: String,
  phoneNumber: String,
  contactNumber: String,
  address: String,
  joiningDate: Date,
  active: Boolean,
  monthlySalary: {
    type: Number,
    default: 0
  },
  designation: {
    type: String,
    default: 'قاعدہ'
  },
  jamiaType: {
    type: String,
    default: ''
  },
  workingHours: {
    startTime: {
      type: String,
      default: '08:00'
    },
    endTime: {
      type: String,
      default: '16:00'
    }
  },
  createdAt: Date,
  __v: Number
});

// Create the Teacher model
const Teacher = mongoose.model('Teacher', TeacherSchema, 'teachers');

// Function to update all teachers
const updateAllTeachers = async () => {
  try {
    // Get all teachers
    const teachers = await Teacher.find();
    console.log(`Found ${teachers.length} teachers to update`);

    // Update each teacher
    for (const teacher of teachers) {
      // Build the update object with missing fields
      const update = {};
      
      // Always update monthlySalary with a default if not provided
      update.monthlySalary = teacher.monthlySalary || 0;
      
      // Always update designation with a default if not provided
      update.designation = teacher.designation || 'استاد';
      
      // Check for contactNumber
      if (!teacher.contactNumber) {
        update.contactNumber = teacher.phoneNumber || '';
      }
      
      // Check for phoneNumber
      if (!teacher.phoneNumber) {
        update.phoneNumber = teacher.contactNumber || '';
      }
      
      // Always ensure workingHours exists
      update.workingHours = teacher.workingHours || {
        startTime: '08:00',
        endTime: '16:00'
      };
      
      // Always apply the updates to ensure all fields exist
      console.log(`Updating teacher ${teacher.name} (${teacher._id}) with:`, update);
      
      // Apply the update
      await Teacher.updateOne({ _id: teacher._id }, { $set: update });
      console.log(`✅ Teacher ${teacher.name} updated successfully`);
    }
    
    console.log('\n✅ All teachers updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating teachers:', error);
    process.exit(1);
  }
};

// Run the update function
console.log('⚙️ Starting teacher update script...');
updateAllTeachers(); 