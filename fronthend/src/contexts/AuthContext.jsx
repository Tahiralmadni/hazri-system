import { createContext, useState, useContext, useEffect } from 'react';
import { login as loginApi, logoutUser, getCurrentUser } from '../services/api';

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

  // Login function using API
  const login = async (grNumber, password) => {
    try {
      setLoading(true);
      setAuthError(null);
      console.log(`Attempting login with GR number: ${grNumber}`);
      
      const data = await loginApi(grNumber, password);
      const user = data.user;
      
      console.log('User authenticated successfully:', user);
      console.log('Token received from server:', data.token ? 'Token exists' : 'No token');
      
      setCurrentUser(user);
      setUserRole(user.role);
      
      // Store the token with the correct key name that backend expects and in other common locations
      // for maximum compatibility across the app
      if (data.token) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('x-auth-token', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('authToken', data.token);
        
        // Add timestamp for session management
        user.lastLogin = Date.now();
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      
      // Verify token was stored
      const storedToken = localStorage.getItem('x-auth-token');
      console.log('Token stored in localStorage:', storedToken ? 'Successfully stored' : 'Failed to store');
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      
      // Properly extract API error messages if available
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;
        setAuthError(errorMessage);
        // Pass through the Axios error with response data
        throw error;
      } else {
        // Handle non-API errors
        setAuthError(error.message || 'Authentication failed');
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  // Log out function
  const logout = async () => {
    try {
      // No need to call API since we're just removing client-side data
      setCurrentUser(null);
      setUserRole(null);
      
      // Clear all possible token storage locations
      localStorage.removeItem('currentUser');
      localStorage.removeItem('x-auth-token');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      
      console.log('Logged out successfully');
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

  // Check authentication state on component mount
  useEffect(() => {
    const verifyAuthentication = async () => {
      try {
        // If we have a token stored, validate it with the server
        if (localStorage.getItem('x-auth-token')) {
          const user = await getCurrentUser();
      if (user) {
            setCurrentUser(user);
            setUserRole(user.role);
          } else {
            // Clear invalid session
              setCurrentUser(null);
              setUserRole(null);
              localStorage.removeItem('currentUser');
            localStorage.removeItem('x-auth-token');
        }
      } else {
          // Check if we have a valid session stored locally but no token
          const storedUser = JSON.parse(localStorage.getItem('currentUser'));
          if (storedUser && checkSessionValidity()) {
                setCurrentUser(storedUser);
                setUserRole(storedUser.role);
          } else {
            // Clear invalid session
            setCurrentUser(null);
            setUserRole(null);
            localStorage.removeItem('currentUser');
          }
          }
        } catch (error) {
        console.error('Authentication verification error:', error);
        // Clear invalid session
          setCurrentUser(null);
          setUserRole(null);
          localStorage.removeItem('currentUser');
        localStorage.removeItem('x-auth-token');
      } finally {
        setLoading(false);
      }
    };

    verifyAuthentication();
  }, []);

  // Set up activity monitoring to refresh session
  useEffect(() => {
    // Only refresh session on page navigation or periodic check
    // NOT on every mouse movement which causes unwanted loading
    const checkSessionInterval = setInterval(() => {
      if (currentUser) {
        refreshSession();
      }
    }, 15 * 60 * 1000); // Check every 15 minutes instead of on every click
    
    return () => {
      clearInterval(checkSessionInterval);
    };
  }, [currentUser]);

  // Context value
  const value = {
    currentUser,
    userRole,
    loading,
    authError,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;