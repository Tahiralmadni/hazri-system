import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBdiA5mtBlr7dC8mvbQudwDb3QgnHd2qs4",
  authDomain: "expense-tracker-fd9cc.firebaseapp.com",
  projectId: "expense-tracker-fd9cc",
  storageBucket: "expense-tracker-fd9cc.firebasestorage.app",
  messagingSenderId: "601119155417",
  appId: "1:601119155417:web:12d7740a72a81095bd8ac8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize collections if they don't exist
const initializeCollections = async () => {
  try {
    // Create teachers collection if it doesn't exist by trying to get it
    const teachersRef = collection(db, 'teachers');
    const teacherSnapshot = await getDocs(teachersRef);
    
    // Create attendance collection if it doesn't exist
    const attendanceRef = collection(db, 'attendance');
    const attendanceSnapshot = await getDocs(attendanceRef);
    
    console.log("Firebase collections initialized");
  } catch (error) {
    console.error("Error initializing collections:", error);
  }
};

// Run initialization
initializeCollections();

// Authentication functions
export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const createUserAccount = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

// Firestore data functions
export const addTeacher = async (teacherId, teacherData) => {
  try {
    console.log("Starting addTeacher function with ID:", teacherId);
    
    // First check if the database is accessible
    try {
      const dbTest = await getDocs(collection(db, 'teachers'));
      console.log("Successfully connected to Firestore database");
    } catch (connectionError) {
      console.error("Failed to connect to Firestore:", connectionError);
      throw new Error("Database connection failed: " + connectionError.message);
    }
    
    // Make sure the teachers collection exists
    const teachersRef = collection(db, 'teachers');
    
    // Add the document with explicit ID
    console.log("Adding teacher document with data:", JSON.stringify(teacherData));
    await setDoc(doc(db, 'teachers', teacherId), {
      ...teacherData,
      createdAt: new Date().toISOString()
    });
    
    console.log(`Teacher added with ID: ${teacherId} successfully`);
    return true;
  } catch (error) {
    console.error('Error adding teacher: ', error);
    
    // Provide more specific error messages
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied - Firebase rules are preventing write access");
    } else if (error.code === 'unavailable') {
      throw new Error("Firebase database is currently unavailable");
    } else {
      throw new Error(`Failed to add teacher: ${error.message}`);
    }
  }
};

export const getTeachers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'teachers'));
    const teachers = [];
    querySnapshot.forEach((doc) => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return teachers;
  } catch (error) {
    console.error('Error getting teachers: ', error);
    return [];
  }
};

export const getTeacher = async (teacherId) => {
  try {
    const docRef = doc(db, 'teachers', teacherId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting teacher: ', error);
    return null;
  }
};

export const updateTeacher = async (teacherId, teacherData) => {
  try {
    await updateDoc(doc(db, 'teachers', teacherId), teacherData);
    return true;
  } catch (error) {
    console.error('Error updating teacher: ', error);
    return false;
  }
};

export const deleteTeacher = async (teacherId) => {
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
    return true;
  } catch (error) {
    console.error('Error deleting teacher: ', error);
    return false;
  }
};

// Attendance functions
/**
 * Add a new attendance record for a teacher
 * @param {Object} attendanceData - The attendance record data
 * @returns {Promise<Object>} - Success status and ID
 */
export const addAttendanceRecord = async (attendanceData) => {
  try {
    console.log("Adding new attendance record:", JSON.stringify(attendanceData));
    
    // Check if record with this date and teacher already exists - if so, update it instead
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('teacherId', '==', attendanceData.teacherId),
      where('date', '==', attendanceData.date)
    );
    
    const querySnapshot = await getDocs(q);
    let docRef;
    let existingId = null;
    
    // Ensure numeric fields are properly formatted as numbers
    const formattedData = {
      ...attendanceData,
      workHours: attendanceData.workHours ? Number(attendanceData.workHours) : 0,
      salaryDeduction: attendanceData.salaryDeduction ? Number(attendanceData.salaryDeduction) : 0,
      updatedAt: serverTimestamp()
    };
    
    if (!querySnapshot.empty) {
      // Update existing record
      existingId = querySnapshot.docs[0].id;
      docRef = doc(db, 'attendance', existingId);
      console.log(`Updating existing attendance record with ID: ${existingId}`);
      await updateDoc(docRef, formattedData);
    } else {
      // Add new record
      formattedData.createdAt = serverTimestamp();
      docRef = await addDoc(attendanceRef, formattedData);
      existingId = docRef.id;
      console.log(`Created new attendance record with ID: ${existingId}`);
    }
    
    // Return the created/updated record with its ID for immediate use
    return { 
      success: true, 
      id: existingId,
      record: {
        id: existingId,
        ...formattedData,
        createdAt: new Date().toISOString() // Use current timestamp for immediate UI update
      }
    };
  } catch (error) {
    console.error('Error adding/updating attendance record:', error);
    console.error('Error details:', JSON.stringify(error));
    return { success: false, error: error.message };
  }
};

/**
 * Get all attendance records for a specific teacher
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Array>} - Array of attendance records
 */
export const getTeacherAttendance = async (teacherId) => {
  try {
    console.log(`Fetching attendance records for teacher ID: ${teacherId}`);
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef, 
      where('teacherId', '==', teacherId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const records = [];
    
    querySnapshot.forEach((doc) => {
      // Get document data
      const data = doc.data();
      
      // Handle Firestore timestamp conversion
      const createdAt = data.createdAt ? 
        (typeof data.createdAt.toDate === 'function' ? 
          data.createdAt.toDate().toISOString() : 
          data.createdAt) : 
        new Date().toISOString();
      
      // Push record with proper data formatting
      records.push({
        id: doc.id,
        ...data,
        createdAt: createdAt
      });
    });
    
    console.log(`Found ${records.length} attendance records for teacher ID: ${teacherId}`);
    return records;
  } catch (error) {
    console.error('Error getting teacher attendance:', error);
    console.error('Error details:', JSON.stringify(error));
    return [];
  }
};

/**
 * Get all attendance records for all teachers
 * @returns {Promise<Array>} - Array of attendance records
 */
export const getAllAttendance = async () => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, orderBy('date', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const records = [];
    
    querySnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error getting all attendance:', error);
    return [];
  }
};

/**
 * Get attendance summary for a specific month
 * @param {string} teacherId - Teacher ID 
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<Object>} - Attendance summary
 */
export const getAttendanceSummary = async (teacherId, month, year) => {
  try {
    // Calculate start and end dates for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    
    // Get the teacher data first (for salary information)
    const teacher = await getTeacher(teacherId);
    const monthlySalary = teacher?.monthlySalary || 0;
    
    // Query attendance records for the month
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef, 
      where('teacherId', '==', teacherId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const records = [];
    
    querySnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Calculate summary statistics
    const totalDays = lastDay;
    const workingDays = totalDays - calculateWeekends(month, year); // Excluding weekends
    
    const presentDays = records.filter(r => r.status === 'present').length;
    const leaveDays = records.filter(r => r.status === 'leave').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    
    // Calculate total working hours
    const totalHoursWorked = records
      .filter(r => r.status === 'present')
      .reduce((total, record) => total + (parseFloat(record.workHours) || 0), 0);
    
    // Calculate total salary deductions
    const totalDeductions = records.reduce((total, record) => {
      return total + (record.salaryDeduction || 0);
    }, 0);
    
    // Calculate final salary
    const finalSalary = Math.max(0, monthlySalary - totalDeductions);
    
    return {
      teacherId,
      teacherName: teacher?.name || 'Unknown',
      month,
      year,
      monthlySalary,
      totalDays,
      workingDays,
      presentDays,
      leaveDays,
      absentDays,
      totalHoursWorked,
      totalDeductions,
      finalSalary,
      records
    };
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    return null;
  }
};

/**
 * Helper function to calculate weekends in a month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {number} - Number of weekend days
 */
const calculateWeekends = (month, year) => {
  const totalDays = new Date(year, month, 0).getDate();
  let weekendCount = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // Count Fridays and Saturdays as weekend
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      weekendCount++;
    }
  }
  
  return weekendCount;
};

export { auth, db }; 