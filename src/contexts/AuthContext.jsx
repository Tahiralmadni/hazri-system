import { createContext, useState, useContext, useEffect } from 'react';
import { auth, loginWithEmail, logoutUser, getTeachers, getTeacher } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    // Try to get saved user from localStorage on initialization
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Error reading from localStorage:", e);
      return null;
    }
  });
  
  const [userRole, setUserRole] = useState(() => {
    // Try to get saved user from localStorage on initialization
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser).role : null;
    } catch (e) {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  // Login function using Firebase
  const login = async (username, password) => {
    try {
      setLoading(true);
      setAuthError(null);
      console.log(`Attempting login for username/email: ${username}`);
      
      // First, try to find the teacher in Firestore by username or email (case insensitive)
      const teachers = await getTeachers();
      console.log(`Found ${teachers.length} teachers in database`);
      
      // Check for a match using case-insensitive comparison for username/email
      const teacher = teachers.find(t => {
        // Check username match
        const usernameMatch = t.username && username && 
          t.username.toLowerCase() === username.toLowerCase();
        
        // Check email match
        const emailMatch = t.email && username && 
          t.email.toLowerCase() === username.toLowerCase();
        
        // Check password (exact match)
        const passwordMatch = t.password === password;
        
        return (usernameMatch || emailMatch) && passwordMatch;
      });

      if (teacher) {
        console.log(`Teacher found with matching credentials in Firestore: ${teacher.name}`);
        // Teacher found with matching credentials in Firestore
        const userData = {
          id: teacher.id,
          email: teacher.email,
          name: teacher.name,
          username: teacher.username,
          role: 'teacher',
          lastLogin: new Date().getTime()
        };
        setCurrentUser(userData);
        setUserRole('teacher');
        localStorage.setItem('currentUser', JSON.stringify(userData));
        return userData;
      }
      
      // Special handling for admin login
      const isEmailFormat = username.includes('@');
      const adminEmail = "tahiralmadni@gmail.com";
      
      // Check for admin login
      if ((isEmailFormat && username.toLowerCase() === adminEmail.toLowerCase()) || 
          (!isEmailFormat && username.toLowerCase() === "admin")) {
        
        // Try Firebase Authentication for admin
        try {
          const emailToUse = isEmailFormat ? username : adminEmail;
          console.log(`Trying admin login with email: ${emailToUse}`);
          
          const userCredential = await loginWithEmail(emailToUse, password);
          const user = userCredential.user;
          
          console.log('Admin user authenticated successfully');
          const userData = {
            id: user.uid,
            email: user.email,
            name: 'ایڈمن صاحب',
            role: 'admin',
            lastLogin: new Date().getTime()
          };
          setCurrentUser(userData);
          setUserRole('admin');
          localStorage.setItem('currentUser', JSON.stringify(userData));
          return userData;
        } catch (adminAuthError) {
          console.error("Admin authentication failed:", adminAuthError);
          throw new Error('Invalid admin credentials');
        }
      }
      
      // For non-admin users, try one more time with different approaches
      console.log("No direct match found, trying alternative approaches");
      
      // Try to find teacher by just the username (ignoring password for debugging)
      const teacherByUsernameOnly = teachers.find(t => 
        (t.username && t.username.toLowerCase() === username.toLowerCase()) ||
        (t.email && t.email.toLowerCase() === username.toLowerCase())
      );
      
      if (teacherByUsernameOnly) {
        console.log(`Found teacher by username/email, but password doesn't match. Teacher: ${teacherByUsernameOnly.name}`);
        console.log(`Stored password: ${teacherByUsernameOnly.password}, Entered password: ${password}`);
        // Password doesn't match
        throw new Error('Invalid password');
      } else {
        console.log(`No teacher found with username/email: ${username}`);
        throw new Error('Teacher not found with this username');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Log out function
  const logout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserRole(null);
      localStorage.removeItem('currentUser');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Check if the session is still valid
  const checkSessionValidity = () => {
    try {
      const userData = JSON.parse(localStorage.getItem('currentUser'));
      if (!userData || !userData.lastLogin) return false;

      const currentTime = new Date().getTime();
      const sessionAge = currentTime - userData.lastLogin;

      // Session is valid if it's within the SESSION_DURATION
      return sessionAge < SESSION_DURATION;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  };

  // Refresh the session by updating the lastLogin time
  const refreshSession = () => {
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        lastLogin: new Date().getTime()
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        try {
          // Check if admin
          if (user.email === 'tahiralmadni@gmail.com') {
            const userData = {
              id: user.uid,
              email: user.email,
              name: 'ایڈمن صاحب',
              role: 'admin',
              lastLogin: new Date().getTime()
            };
            setCurrentUser(userData);
            setUserRole('admin');
            localStorage.setItem('currentUser', JSON.stringify(userData));
          } else {
            // Look up teacher data
            const teachers = await getTeachers();
            const teacher = teachers.find(t => t.email === user.email);

            if (teacher) {
              const userData = {
                id: teacher.id,
                email: teacher.email,
                name: teacher.name,
                username: teacher.username,
                role: 'teacher',
                lastLogin: new Date().getTime()
              };
              setCurrentUser(userData);
              setUserRole('teacher');
              localStorage.setItem('currentUser', JSON.stringify(userData));
            } else {
              // If no teacher found but user is authenticated, log them out
              await logoutUser();
              setCurrentUser(null);
              setUserRole(null);
              localStorage.removeItem('currentUser');
            }
          }
        } catch (error) {
          console.error('Error setting user data:', error);
          setCurrentUser(null);
          setUserRole(null);
        }
      } else {
        // Check if we have a valid session stored locally
        try {
          const storedUser = JSON.parse(localStorage.getItem('currentUser'));
          if (storedUser && checkSessionValidity()) {
            // Before restoring, ensure the stored user is not the admin if Firebase auth failed
            if (storedUser.role === 'admin' && storedUser.email !== 'tahiralmadni@gmail.com') {
                 console.warn("Attempted to restore non-admin user with admin role from local storage. Clearing.");
                 setCurrentUser(null);
                 setUserRole(null);
                 localStorage.removeItem('currentUser');
            } else {
                setCurrentUser(storedUser);
                setUserRole(storedUser.role);
                console.log('Restored session from local storage');
            }
          } else {
            setCurrentUser(null);
            setUserRole(null);
            localStorage.removeItem('currentUser');
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          setCurrentUser(null);
          setUserRole(null);
          localStorage.removeItem('currentUser');
        }
      }
      setLoading(false);
    });

    // Set up a periodic session refresh
    const sessionRefreshInterval = setInterval(() => {
      if (currentUser) {
        console.log('Refreshing session');
        refreshSession();
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes

    // Set up activity listeners to refresh the session
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    let lastActivityTime = Date.now();
    const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    // Use a throttled version of refresh to prevent too many updates
    const refreshOnActivity = () => {
      const now = Date.now();
      if (currentUser && (now - lastActivityTime > ACTIVITY_THRESHOLD)) {
        console.log('Activity detected, refreshing session');
        refreshSession();
        lastActivityTime = now;
      }
    };

    // Add event listeners with throttling
    activityEvents.forEach(event => {
      window.addEventListener(event, refreshOnActivity, { passive: true });
    });

    // Clean up
    return () => {
      unsubscribe();
      clearInterval(sessionRefreshInterval);
      activityEvents.forEach(event => {
        window.removeEventListener(event, refreshOnActivity);
      });
    };
  }, []); // Removed currentUser from dependencies

  // Value to provide through context
  const value = {
    currentUser,
    userRole,
    loading,
    authError,
    login,
    logout,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;