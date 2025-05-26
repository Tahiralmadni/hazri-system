import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { findTeacherByName, checkTeacherExists, listAllTeachers, fixTeacherIdInLocalStorage } from '../../services/firebase-debug';
import '../../App.css';

function TeacherDebug() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [allTeachers, setAllTeachers] = useState([]);
  const [foundTeachers, setFoundTeachers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const { currentUser } = useAuth();
  
  // Load all teachers on mount
  useEffect(() => {
    const loadAllTeachers = async () => {
      setIsLoading(true);
      try {
        const teachers = await listAllTeachers();
        setAllTeachers(teachers);
        setMessage(`Loaded ${teachers.length} teachers`);
      } catch (error) {
        setError(`Error loading teachers: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllTeachers();
  }, []);
  
  // Handle search
  const handleSearch = async () => {
    if (!searchText.trim()) {
      setError('Please enter a search term');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const teachers = await findTeacherByName(searchText);
      setFoundTeachers(teachers);
      setMessage(`Found ${teachers.length} teachers matching "${searchText}"`);
    } catch (error) {
      setError(`Search error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle fixing the teacher ID
  const handleFixTeacherId = async (username) => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const result = await fixTeacherIdInLocalStorage(username);
      if (result.success) {
        setMessage(`Fixed ID for ${username}: ${result.message}`);
      } else {
        setError(`Failed to fix ID: ${result.error}`);
      }
    } catch (error) {
      setError(`Error fixing ID: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if teacher exists
  const handleCheckTeacher = async (id) => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const result = await checkTeacherExists(id);
      if (result.exists) {
        setMessage(`Teacher exists with ID: ${id}`);
      } else {
        setError(`No teacher found with ID: ${id}`);
      }
    } catch (error) {
      setError(`Error checking teacher: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard teacher-dashboard">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing...</p>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="admin-nav teacher-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-bug"></i>
          <span>حاضری نظام - ڈیبگ</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/teacher" className="admin-nav-link">
            <i className="fas fa-arrow-left"></i> واپس جائیں
          </Link>
        </div>
        <div className="admin-nav-user">
          <span>سرگرم صارف: {currentUser?.name || 'Unknown'}</span>
        </div>
      </nav>
      
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-tools dashboard-icon"></i>
          <h1>استاد ڈیٹا مرمت</h1>
        </div>
      </header>
      
      {/* Current User Info */}
      <div className="debug-section">
        <h2>موجودہ صارف</h2>
        <pre className="code-block">{JSON.stringify(currentUser, null, 2)}</pre>
        
        <div className="action-buttons">
          <button 
            className="btn primary-btn" 
            onClick={() => handleCheckTeacher(currentUser?.id)}
          >
            <i className="fas fa-check-circle"></i> ID چیک کریں
          </button>
          
          <button 
            className="btn secondary-btn" 
            onClick={() => handleFixTeacherId(currentUser?.username)}
          >
            <i className="fas fa-wrench"></i> ID درست کریں
          </button>
        </div>
      </div>
      
      {/* Search For Teachers */}
      <div className="debug-section">
        <h2>استاد تلاش کریں</h2>
        
        <div className="search-form">
          <input 
            type="text" 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="نام یا صارف نام سے تلاش کریں..."
            className="form-control"
          />
          <button className="btn primary-btn" onClick={handleSearch}>
            <i className="fas fa-search"></i> تلاش کریں
          </button>
        </div>
        
        {foundTeachers.length > 0 && (
          <div className="search-results">
            <h3>نتائج</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>نام</th>
                  <th>صارف نام</th>
                  <th>ای میل</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {foundTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="id-cell">{teacher.id}</td>
                    <td>{teacher.name}</td>
                    <td>{teacher.username}</td>
                    <td>{teacher.email}</td>
                    <td className="action-cell">
                      <button 
                        className="table-action fix"
                        onClick={() => handleFixTeacherId(teacher.username)}
                      >
                        <i className="fas fa-wrench"></i>
                      </button>
                      <button 
                        className="table-action check"
                        onClick={() => handleCheckTeacher(teacher.id)}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {message && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {message}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i> {error}
          </div>
        )}
      </div>
      
      {/* All Teachers */}
      <div className="debug-section">
        <h2>تمام اساتذہ</h2>
        <div className="search-results">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>نام</th>
                <th>صارف نام</th>
                <th>ای میل</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {allTeachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="id-cell">{teacher.id}</td>
                  <td>{teacher.name}</td>
                  <td>{teacher.username}</td>
                  <td>{teacher.email}</td>
                  <td className="action-cell">
                    <button 
                      className="table-action fix"
                      onClick={() => handleFixTeacherId(teacher.username)}
                    >
                      <i className="fas fa-wrench"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - حاضری نظام - ڈیبگ</p>
      </footer>
    </div>
  );
}

export default TeacherDebug; 