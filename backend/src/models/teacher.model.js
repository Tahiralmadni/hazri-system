const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TeacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  grNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness for non-null values
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  plainPassword: {
    type: String,
    select: false
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  monthlySalary: {
    type: Number,
    default: 0,
    set: function(value) {
      // Ensure salary is stored as a number
      if (value === null || value === undefined) return 0;
      const numValue = Number(value);
      return isNaN(numValue) ? 0 : numValue;
    }
  },
  designation: {
    type: String,
    default: 'استاد',
    trim: true
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
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { strictQuery: false });

// Password hashing middleware
TeacherSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified('password')) return next();
  
  try {
    // Store plaintext password for reference
    this.plainPassword = this.password;
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hash = await bcrypt.hash(this.password, salt);
    
    // Replace the plaintext password with the hashed one
    this.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
TeacherSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // If the stored password starts with $2a$ or $2b$, it's hashed
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return await bcrypt.compare(candidatePassword, this.password);
    } else {
      // If the password is not hashed, compare directly
      return candidatePassword === this.password;
    }
  } catch (error) {
    throw new Error(error);
  }
};

const Teacher = mongoose.model('Teacher', TeacherSchema);

module.exports = Teacher; 