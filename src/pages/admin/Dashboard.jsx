import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, getTeachers, getAllAttendance } from '../../services/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import '../../App.css';

function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
    totalAttendance: 0
  });
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Load dashboard data function
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading dashboard data...');
      
      // Get current date in YYYY-MM-DD format
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      console.log('Today date for filtering:', todayStr);
      
      // Get all teachers
      const teachers = await getTeachers();
      console.log('Teachers loaded:', teachers.length);
      
      // Get all attendance records
      const attendanceRecords = await getAllAttendance();
      console.log('All attendance records loaded:', attendanceRecords.length);
      console.log('First few attendance dates:', attendanceRecords.slice(0, 5).map(r => r.date));
      
      // Filter today's attendance records
      const todayRecords = attendanceRecords.filter(record => {
        console.log(`Comparing record date ${record.date} with today ${todayStr}`);
        return record.date === todayStr;
      });
      
      console.log('Today attendance records:', todayRecords.length);
      
      // Count statuses
      const presentToday = todayRecords.filter(record => record.status === 'present').length;
      const absentToday = todayRecords.filter(record => record.status === 'absent').length;
      const onLeave = todayRecords.filter(record => record.status === 'leave').length;
      
      // Update stats
      setStats({
        totalTeachers: teachers.length,
        presentToday,
        absentToday,
        onLeave,
        totalAttendance: attendanceRecords.length
      });
      
      console.log('Dashboard data loaded successfully:', {
        totalTeachers: teachers.length,
        presentToday,
        absentToday,
        onLeave
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Keep stats at default values
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  // Initialize Firestore collections
  const initializeCollections = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Firestore initialization");
      
      // Check if we can access Firestore at all
      try {
        const testRead = await getDocs(collection(db, 'test'));
        console.log("Successfully connected to Firestore");
      } catch (error) {
        console.error("Failed to connect to Firestore:", error);
        if (error.code === 'permission-denied') {
          alert('آپ کو فائربیس تک رسائی کی اجازت نہیں ہے۔ براہ کرم فائربیس کنسول میں سیکورٹی رولز دیکھیں۔');
          setIsLoading(false);
          return;
        }
      }
      
      try {
        // Create a sample document in teachers collection
        await setDoc(doc(db, 'teachers', 'sample_' + Date.now()), {
          name: 'Sample Teacher',
          createdAt: new Date().toISOString(),
          isTestDocument: true
        });
        console.log("Successfully created teachers collection document");
      } catch (error) {
        console.error("Failed to create teachers collection:", error);
        alert(`ٹیچر کلیکشن بنانے میں خرابی: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      try {
        // Create a sample document in attendance collection
        await setDoc(doc(db, 'attendance', 'sample_' + Date.now()), {
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isTestDocument: true
        });
        console.log("Successfully created attendance collection document");
      } catch (error) {
        console.error("Failed to create attendance collection:", error);
        alert(`حاضری کلیکشن بنانے میں خرابی: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      alert('کلیکشنز کامیابی سے بنا دیے گئے ہیں!');
      
      // Force refresh the page to update
      window.location.reload();
    } catch (error) {
      console.error('Error initializing collections:', error);
      alert(`کلیکشنز بنانے میں خرابی: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>برائے مہربانی انتظار کریں...</p>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="admin-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>حاضری اور تنخواہ نظام</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/admin" className="admin-nav-link active">
            <i className="fas fa-tachometer-alt"></i> ڈیش بورڈ
          </Link>
          <Link to="/admin/teachers" className="admin-nav-link">
            <i className="fas fa-chalkboard-teacher"></i> اساتذہ کا انتظام
          </Link>
          <Link to="/admin/attendance" className="admin-nav-link">
            <i className="fas fa-clipboard-list"></i> حاضری ریکارڈ
          </Link>
        </div>
        <div className="admin-nav-user">
          <span>خوش آمدید، {currentUser?.name}</span>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> لاگ آؤٹ
          </button>
        </div>
      </nav>
      
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-tachometer-alt dashboard-icon"></i>
          <h1>ایڈمن ڈیش بورڈ</h1>
        </div>
        <div className="dashboard-actions">
          <button onClick={loadDashboardData} className="action-button" disabled={isLoading}>
            <i className={`fas fa-sync ${isLoading ? 'fa-spin' : ''}`}></i> ڈیٹا ریفریش کریں
          </button>
        </div>
      </header>

    
      
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <i className="fas fa-chalkboard-teacher summary-icon"></i>
              <h3>کل اساتذہ</h3>
          <p>{stats.totalTeachers}</p>
            </div>
            <div className="summary-card">
              <i className="fas fa-user-check summary-icon"></i>
              <h3>آج حاضر</h3>
          <p>{stats.presentToday}</p>
            </div>
            <div className="summary-card">
          <i className="fas fa-user-times summary-icon"></i>
          <h3>آج غیر حاضر</h3>
          <p>{stats.absentToday}</p>
            </div>
            <div className="summary-card">
          <i className="fas fa-user-minus summary-icon"></i>
          <h3>آج چھٹی پر</h3>
          <p>{stats.onLeave}</p>
            </div>
          </div>

      {/* Action Buttons */}
            <div className="action-buttons">
              <Link to="/admin/teachers" className="action-button">
          <i className="fas fa-user-plus"></i> نیا استاد شامل کریں
              </Link>
              <Link to="/admin/attendance" className="action-button">
          <i className="fas fa-clipboard-list"></i> حاضری کا ریکارڈ دیکھیں
              </Link>
          </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - حاضری نظام - دارالافتا</p>
      </footer>
    </div>
  );
}

export default AdminDashboard;