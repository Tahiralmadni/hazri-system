import { useState } from 'react';
import { createUserAccount } from '../services/firebase';
import { Link } from 'react-router-dom';
import '../App.css';

function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const setupAdmin = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await createUserAccount('tahiralmadni@gmail.com', 'admin123');
      setSuccess(true);
    } catch (error) {
      console.error('Error creating admin account:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Admin account already exists! You can log in using the credentials.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in Firebase Console. Please enable it first.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <i className="fas fa-user-shield login-icon"></i>
          <h1>Admin Account Setup</h1>
          <p>Set up your admin account for Hazri System</p>
        </div>
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> Admin account created successfully!
            <p>You can now <Link to="/login">log in</Link> with these credentials:</p>
            <p><strong>Email:</strong> tahiralmadni@gmail.com</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        )}
        
        <div className="setup-instructions">
          <h3>Before proceeding:</h3>
          <ol>
            <li>Go to the Firebase Console (https://console.firebase.google.com/)</li>
            <li>Select your project: "expense-tracker-fd9cc"</li>
            <li>Navigate to "Authentication" → "Sign-in method"</li>
            <li>Enable "Email/Password" provider</li>
            <li>Save the changes</li>
            <li>Return here and click the button below</li>
          </ol>
        </div>
        
        <button 
          onClick={setupAdmin} 
          className="login-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading-spinner-small"></div>
              <span>Setting up admin account...</span>
            </>
          ) : (
            <>
              <i className="fas fa-user-plus"></i>
              <span>Create Admin Account</span>
            </>
          )}
        </button>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} - Hazri System - Darulifta</p>
          <p><Link to="/login">Back to Login</Link></p>
        </div>
      </div>
    </div>
  );
}

export default AdminSetup; 