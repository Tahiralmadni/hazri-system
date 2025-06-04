const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Using both naming conventions for compatibility
  timeIn: {
    type: String,
    default: null
  },
  timeOut: {
    type: String,
    default: null
  },
  checkIn: {
    type: String,
    default: null
  },
  checkOut: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'leave'],
    default: 'present'
  },
  workHours: {
    type: Number,
    default: 0
  },
  salaryDeduction: {
    type: Number,
    default: 0
  },
  comment: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { strictQuery: false });

// Ensure both timeIn/checkIn and timeOut/checkOut are synced
AttendanceSchema.pre('save', function(next) {
  // Sync timeIn and checkIn (prefer checkIn if both are set)
  if (this.isModified('checkIn') || this.isModified('timeIn')) {
    const checkInValue = this.get('checkIn');
    const timeInValue = this.get('timeIn');
    const finalValue = checkInValue || timeInValue;
    this.set('checkIn', finalValue);
    this.set('timeIn', finalValue);
  }

  // Sync timeOut and checkOut (prefer checkOut if both are set)
  if (this.isModified('checkOut') || this.isModified('timeOut')) {
    const checkOutValue = this.get('checkOut');
    const timeOutValue = this.get('timeOut');
    const finalValue = checkOutValue || timeOutValue;
    this.set('checkOut', finalValue);
    this.set('timeOut', finalValue);
  }

  next();
});

// Compound index to ensure one record per teacher per day
AttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = Attendance; 