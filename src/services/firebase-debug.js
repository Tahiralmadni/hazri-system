import { getFirestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Your Firebase configuration - duplicated here to maintain proper db context
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
const db = getFirestore(app);

/**
 * Debug function to find teacher by name or username
 * This will help find teachers with specific names/usernames regardless of ID issues
 */
export const findTeacherByName = async (nameOrUsername) => {
  try {
    console.log(`Searching for teacher with name/username: ${nameOrUsername}`);
    const teachersRef = collection(db, 'teachers');
    const querySnapshot = await getDocs(teachersRef);
    
    const teachers = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teachers.push({ 
        id: doc.id, 
        ...data,
      });
    });
    
    // Search case insensitive
    const nameToLower = nameOrUsername.toLowerCase();
    const matchingTeachers = teachers.filter(t => {
      return (t.name && t.name.toLowerCase().includes(nameToLower)) || 
             (t.username && t.username.toLowerCase().includes(nameToLower));
    });
    
    console.log(`Found ${matchingTeachers.length} matching teachers`);
    return matchingTeachers;
  } catch (error) {
    console.error('Error finding teacher by name:', error);
    return [];
  }
};

/**
 * Check if a teacher with this ID exists and return full data
 */
export const checkTeacherExists = async (teacherId) => {
  try {
    console.log(`Checking if teacher exists with ID: ${teacherId}`);
    
    if (!teacherId) {
      console.error('Teacher ID is null or undefined');
      return { exists: false };
    }
    
    const docRef = doc(db, 'teachers', teacherId);
    const docSnap = await getDoc(docRef);
    
    const exists = docSnap.exists();
    console.log(`Teacher exists: ${exists}`);
    
    if (exists) {
      return { 
        exists, 
        data: { id: docSnap.id, ...docSnap.data() } 
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking teacher existence:', error);
    return { exists: false, error: error.message };
  }
};

/**
 * Debug function to list all teachers in the database
 */
export const listAllTeachers = async () => {
  try {
    console.log('Listing all teachers in database...');
    const teachersRef = collection(db, 'teachers');
    const querySnapshot = await getDocs(teachersRef);
    
    const teachers = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teachers.push({ 
        id: doc.id, 
        name: data.name,
        username: data.username,
        email: data.email 
      });
    });
    
    console.log(`Found ${teachers.length} teachers in database`);
    return teachers;
  } catch (error) {
    console.error('Error listing teachers:', error);
    return [];
  }
};

/**
 * Fix teacher ID in local storage
 */
export const fixTeacherIdInLocalStorage = async (username) => {
  try {
    console.log(`Trying to fix teacher ID for username: ${username}`);
    
    // Get current user from localStorage
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!storedUser) {
      console.error('No user found in localStorage');
      return { success: false, error: 'No user in localStorage' };
    }
    
    // Find teacher with matching username
    const matchingTeachers = await findTeacherByName(username || storedUser.username);
    if (!matchingTeachers.length) {
      console.error('No matching teacher found');
      return { success: false, error: 'No matching teacher found' };
    }
    
    // Use the first match
    const matchedTeacher = matchingTeachers[0];
    console.log(`Found matching teacher with ID: ${matchedTeacher.id}`);
    
    // Update localStorage
    const updatedUser = {
      ...storedUser,
      id: matchedTeacher.id,
      email: matchedTeacher.email,
      name: matchedTeacher.name,
      username: matchedTeacher.username
    };
    
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    console.log('Updated user data in localStorage');
    
    return { 
      success: true, 
      updatedUser,
      message: 'User ID fixed in localStorage'
    };
  } catch (error) {
    console.error('Error fixing teacher ID:', error);
    return { success: false, error: error.message };
  }
}; 