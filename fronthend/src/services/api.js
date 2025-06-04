import axios from 'axios';

// Base API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Log requests
api.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('Request Data:', config.data);
    }
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Log responses
api.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} from ${response.config.url}`);
    if (response.data) {
      console.log('Response Data:', response.data);
    }
    return response;
  },
  error => {
    console.error('API Response Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

// Get token from localStorage - try multiple possible locations
const getToken = () => {
  // Try multiple possible token storage locations
  const token = 
    localStorage.getItem('x-auth-token') || 
    localStorage.getItem('token') || 
    localStorage.getItem('authToken');
  
  console.log('Retrieved token from localStorage:', token ? 'Token exists' : 'No token found');
  
  // If token exists but doesn't have proper format, ensure it's stored correctly for next time
  if (token && !localStorage.getItem('x-auth-token')) {
    console.log('Fixing token storage location');
    localStorage.setItem('x-auth-token', token);
  }
  
  return token || '';
};

// Add auth header to requests
api.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers['x-auth-token'] = token;
      console.log(`Adding auth header to ${config.url}:`, config.headers['x-auth-token']);
    } else {
      console.warn(`No auth token available for request to ${config.url}`);
    }
    return config;
  },
  error => Promise.reject(error)
);

// Authentication API
export const login = async (grNumber, password) => {
  try {
    const response = await api.post('/auth/login', { grNumber, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

// Teacher API
export const getTeachers = async () => {
  try {
    const response = await api.get('/teachers');
    return response.data.teachers;
  } catch (error) {
    console.error('Error fetching teachers:', error.response?.data || error.message);
    throw error;
  }
};

export const getTeacherById = async (id) => {
  try {
    const response = await api.get(`/teachers/${id}`);
    return response.data.teacher;
  } catch (error) {
    console.error('Error fetching teacher:', error.response?.data || error.message);
    throw error;
  }
};

export const addTeacher = async (teacherData) => {
  try {
    // Process the teacher data before sending to ensure proper format
    const processedData = {
      ...teacherData,
      // Ensure monthlySalary is a number
      monthlySalary: teacherData.monthlySalary ? Number(teacherData.monthlySalary) : 0,
      // Ensure both contact fields are present
      phoneNumber: teacherData.contactNumber || teacherData.phoneNumber || '',
      contactNumber: teacherData.contactNumber || teacherData.phoneNumber || '',
      // Ensure designation is set
      designation: teacherData.designation || 'استاد'
    };
    
    console.log('Adding teacher with processed data:', processedData);
    
    const response = await api.post('/teachers', processedData);
    return response.data.teacher;
  } catch (error) {
    console.error('Error adding teacher:', error.response?.data || error.message);
    throw error;
  }
};

export const updateTeacher = async (id, teacherData) => {
  try {
    // Process the teacher data before sending to ensure proper format
    const processedData = {
      ...teacherData,
      // Ensure monthlySalary is a number
      monthlySalary: teacherData.monthlySalary ? Number(teacherData.monthlySalary) : 0,
      // Ensure both contact fields are present
      phoneNumber: teacherData.contactNumber || teacherData.phoneNumber || '',
      contactNumber: teacherData.contactNumber || teacherData.phoneNumber || '',
      // Ensure designation is set
      designation: teacherData.designation || 'استاد'
    };
    
    console.log(`Updating teacher ${id} with processed data:`, processedData);
    
    const response = await api.put(`/teachers/${id}`, processedData);
    return response.data.teacher;
  } catch (error) {
    console.error('Error updating teacher:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteTeacher = async (id) => {
  try {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting teacher:', error.response?.data || error.message);
    throw error;
  }
};

// Attendance API
export const getAttendanceForTeacher = async (teacherId, date) => {
  try {
    const response = await api.get(`/attendance/teacher/${teacherId}`, {
      params: { date }
    });
    return response.data.attendanceRecords || [];
  } catch (error) {
    console.error('Error fetching attendance:', error.response?.data || error.message);
    throw error;
  }
};

export const markAttendance = async (attendanceData) => {
  try {
    const response = await api.post('/attendance', attendanceData);
    return response.data;
  } catch (error) {
    console.error('Error marking attendance:', error.response?.data || error.message);
    throw error;
  }
};

export const updateAttendance = async (id, attendanceData) => {
  try {
    const response = await api.put(`/attendance/${id}`, attendanceData);
    return response.data;
  } catch (error) {
    console.error('Error updating attendance:', error.response?.data || error.message);
    throw error;
  }
};

export const getAttendanceByDate = async (date) => {
  try {
    const response = await api.get('/attendance/date', {
      params: { date }
    });
    return response.data.attendanceRecords || [];
  } catch (error) {
    console.error('Error fetching attendance by date:', error.response?.data || error.message);
    throw error;
  }
};

export const getAttendanceStats = async (dateRange) => {
  try {
    const response = await api.get('/attendance/stats', {
      params: dateRange
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching attendance stats:', error.response?.data || error.message);
    throw error;
  }
};

// Auth API calls
export const logoutUser = async () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  return true;
};

export const getCurrentUser = async () => {
  try {
    const data = await api.get('/auth/user');
    return data.data.user;
  } catch (error) {
    // Token might be invalid, clear it
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    throw error;
  }
};

export const updateTeacherPassword = async (teacherId, currentPassword, newPassword) => {
  try {
    const response = await api.put(`/teachers/${teacherId}/password`, { currentPassword, newPassword });
    return response.data;
  } catch (error) {
    console.error('Error updating password:', error.response?.data || error.message);
    throw error;
  }
};

// Attendance API calls
export const getAllAttendance = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.teacherId) queryParams.append('teacherId', filters.teacherId);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const data = await api.get(`/attendance${queryString}`);
    return data.data.attendance;
  } catch (error) {
    console.error('Error getting attendance records:', error.response?.data || error.message);
    return [];
  }
};

export const getTeacherAttendance = async (teacherId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    console.log(`Fetching attendance records for teacher ${teacherId}...`);
    const response = await api.get(`/attendance/teacher/${teacherId}${queryString}`);
    
    // Check both possible response formats
    const attendance = response.data.attendance || response.data.attendanceRecords || [];
    
    // Process date values for consistency
    const processedAttendance = Array.isArray(attendance) ? attendance.map(record => {
      // Ensure date is in consistent YYYY-MM-DD format
      if (record.date && typeof record.date === 'string') {
        const dateObj = new Date(record.date);
        record.date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      }
      return record;
    }) : [];
    
    console.log(`Retrieved ${processedAttendance.length} attendance records`);
    return processedAttendance;
  } catch (error) {
    console.error('Error getting teacher attendance:', error.response?.data || error.message);
    return [];
  }
};

// Simplified version of getTeacherAttendance that returns less data
export const getTeacherAttendanceSimple = async (teacherId) => {
  try {
    // Use the regular endpoint but with a flag to indicate we want simplified data
    const response = await api.get(`/attendance/teacher/${teacherId}`, {
      params: { simple: true }
    });
    return response.data.attendance || [];
  } catch (error) {
    console.error('Error getting simplified teacher attendance:', error.response?.data || error.message);
    return [];
  }
};

export const addAttendanceRecord = async (attendanceData) => {
  try {
    // Ensure we have both naming conventions for the backend API
    const payload = {
      ...attendanceData,
      // Make sure both naming conventions are included for compatibility
      checkIn: attendanceData.timeIn || attendanceData.checkIn || null,
      checkOut: attendanceData.timeOut || attendanceData.checkOut || null,
      timeIn: attendanceData.timeIn || attendanceData.checkIn || null,
      timeOut: attendanceData.timeOut || attendanceData.checkOut || null,
      // Ensure workHours is a number
      workHours: attendanceData.workHours ? parseFloat(attendanceData.workHours) : 0
    };
    
    // MongoDB schema expects 'teacher' field, not 'teacherId'
    if (!payload.teacher && payload.teacherId) {
      payload.teacher = payload.teacherId;
    }

    // If notes field exists, map it to comment field (which the backend expects)
    if (payload.notes && !payload.comment) {
      payload.comment = payload.notes;
    }
    
    // Ensure the date is in the correct format (string dates need no conversion in mongoose)
    // But we still need to ensure it's a proper date string
    if (payload.date && typeof payload.date === 'string') {
      // Make sure it's in YYYY-MM-DD format as expected
      const dateParts = payload.date.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-based
        const day = parseInt(dateParts[2]);
        payload.date = new Date(year, month, day).toISOString();
      }
    }
    
    console.log("Sending attendance payload:", payload);

    const data = await api.post('/attendance', payload);
    
    return data.data.attendance || data.data;
  } catch (error) {
    console.error('Error adding attendance record:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteAttendanceRecord = async (recordId) => {
  try {
    console.log(`Attempting to delete attendance record with ID: ${recordId}`);
    const response = await api.delete(`/attendance/${recordId}`);
    console.log('Delete attendance response:', response.data);
    return { 
      success: true, 
      message: response.data.message || 'Record deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting attendance record:', error.response?.data || error.message);
    
    // Extract specific error message if available
    const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to delete attendance record';
    
    return {
      success: false,
      message: errorMessage,
      error: error.response?.data || error.message
    };
  }
};

export const getAttendanceSummary = async (teacherId, month, year) => {
  try {
    const queryParams = new URLSearchParams({
      month: month.toString(),
      year: year.toString()
    });
    
    const data = await api.get(`/attendance/summary/teacher/${teacherId}?${queryParams.toString()}`);
    return data.data;
  } catch (error) {
    console.error('Error getting attendance summary:', error.response?.data || error.message);
    return null;
  }
};

// Export auth for compatibility with existing code
export const auth = { 
  currentUser: null  // This will be managed through the stored JWT token
}; 