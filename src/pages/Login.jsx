import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createUserAccount } from '../services/firebase';
import '../App.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state, or default to dashboard
  const from = location.state?.from?.pathname || '/';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return setError('Please enter username and password.');
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Clear any existing session
      localStorage.removeItem('currentUser');
      
      const user = await login(username, password);
      
      if (!user) {
        throw new Error('Login failed - no user data returned');
      }
      
      // Validate user data before redirecting
      if (!user.id || !user.role) {
        throw new Error('Invalid user data received');
      }
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/teacher');
        }
      }, 100);
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Show more specific error messages
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid username or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many login attempts. Try again later.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Operation not allowed. Please enable Email/Password login in Firebase console.');
      } else {
        setError(authError || 'Login error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    setUsername('admin');
    // Password field is left empty deliberately as the user should still enter their password
  };

  return (
    <div className="login-container login-container-ltr">
      <div className="modern-login-card">
        <div className="login-header">
          <i className="fas fa-user-clock login-icon"></i>
          <h1>Attendance System</h1>
          <p>Darulifta</p>
        </div>
        
        {error && (
          <div className="error-alert">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username:</label>
            <div className="input-with-icon">
              <i className="fas fa-user input-icon"></i>
              <input 
                type="text" 
                id="username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password:</label>
            <div className="input-with-icon">
              <i className="fas fa-lock input-icon"></i>
              <input 
                type="password" 
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner-small"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                <span>Login</span>
              </>
            )}
          </button>
        </form>
        
        
      </div>
    </div>
  );
}

export default Login;

             