// Firebase service adapter redirecting to MongoDB backend API
// This file is a compatibility layer during migration from Firebase to MongoDB

import * as api from './api';

// Wrapper functions to handle _id to id conversion
export const getTeacher = async (teacherId) => {
  try {
    const teacher = await api.getTeacher(teacherId);
    if (teacher && teacher._id) {
      return {
        ...teacher,
        id: teacher._id  // Add id field based on MongoDB's _id
      };
    }
    return teacher;
  } catch (error) {
    console.error('Error in getTeacher adapter:', error);
    return null;
  }
};

// Add createUserAccount function for user creation
export const createUserAccount = async (email, password) => {
  try {
    // We'll use the addTeacher method from api.js with admin role
    const userData = {
      username: email,
      email: email,
      password: password,
      role: 'admin',
      name: 'Admin User',
      isActive: true
    };
    
    const result = await api.addTeacher(userData);
    
    if (result && result._id) {
      return {
        ...result,
        id: result._id,
        success: true
      };
    }
    
    return { success: true, user: result };
  } catch (error) {
    console.error('Error in createUserAccount adapter:', error);
    throw error;
  }
};

export const getTeacherAttendance = async (teacherId) => {
  try {
    const records = await api.getTeacherAttendance(teacherId);
    if (Array.isArray(records)) {
      return records.map(record => ({
        ...record,
        id: record._id || record.id  // Ensure id exists
      }));
    }
    return records;
  } catch (error) {
    console.error('Error in getTeacherAttendance adapter:', error);
    return [];
  }
};

export const getTeachers = async () => {
  try {
    const teachers = await api.getTeachers();
    return teachers.map(teacher => ({
      ...teacher,
      id: teacher._id || teacher.id  // Ensure id exists
    }));
  } catch (error) {
    console.error('Error in getTeachers adapter:', error);
    return [];
  }
};

// Export the rest of the API methods directly
export const {
  login,
  logoutUser,
  getCurrentUser,
  addTeacher,
  updateTeacher,
  updateTeacherPassword,
  deleteTeacher,
  getAllAttendance,
  deleteAttendanceRecord,
  getAttendanceSummary,
  auth
} = api;

// Stub for any missing methods
export const getTeacherAttendanceSimple = async (teacherId) => {
  return await getTeacherAttendance(teacherId);
};

// Dummy exports to maintain backward compatibility
export const db = {};

// Log a message to indicate Firebase has been replaced
console.log('Firebase compatibility layer active - all Firebase operations redirected to MongoDB backend');

// Add attendance record with ID handling
export const addAttendanceRecord = async (attendanceData) => {
  try {
    // Make sure we're using the right ID format for MongoDB
    const payload = { ...attendanceData };
    
    // Convert any id to _id if needed in the teacherId field
    if (payload.teacherId) {
      // MongoDB expects teacherId as a string
      payload.teacherId = String(payload.teacherId);
    }
    
    const result = await api.addAttendanceRecord(payload);
    
    // Add id field if result only has _id
    if (result && result._id && !result.id) {
      return {
        ...result,
        id: result._id,
        success: true
      };
    }
    
    return { ...result, success: true };
  } catch (error) {
    console.error('Error in addAttendanceRecord adapter:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to add attendance record' 
    };
  }
}; 