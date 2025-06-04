import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeachers, getAllAttendance } from '../../services/api';
import '../../App.css';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

function AdminDashboard() {
  const { t } = useTranslation();
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
      <Helmet>
        <title>{t('pages.adminDashboard.title')}</title>
        <meta name="description" content={t('app.subtitle')} />
      </Helmet>
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{t('components.loading')}</p>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="admin-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>{t('app.subtitle')}</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/admin" className="admin-nav-link active">
            <i className="fas fa-tachometer-alt"></i> {t('components.nav.dashboard')}
          </Link>
          <Link to="/admin/teachers" className="admin-nav-link">
            <i className="fas fa-chalkboard-teacher"></i> {t('components.nav.teachers')}
          </Link>
          <Link to="/admin/attendance" className="admin-nav-link">
            <i className="fas fa-clipboard-list"></i> {t('components.nav.attendance')}
          </Link>
        </div>
        <div className="admin-nav-user">
          <LanguageSwitcher />
          <ThemeToggle />
          <span>{t('components.nav.welcome')}, {currentUser?.name}</span>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> {t('components.nav.logout')}
          </button>
        </div>
      </nav>
      
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-tachometer-alt dashboard-icon"></i>
          <h1>{t('pages.adminDashboard.heading')}</h1>
        </div>
        <div className="dashboard-actions">
          <button onClick={loadDashboardData} className="action-button" disabled={isLoading}>
            <i className={`fas fa-sync ${isLoading ? 'fa-spin' : ''}`}></i> {t('pages.adminDashboard.refreshData')}
          </button>
        </div>
      </header>

    
      
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <i className="fas fa-chalkboard-teacher summary-icon"></i>
              <h3>{t('pages.adminDashboard.totalTeachers')}</h3>
              <p>{stats.totalTeachers}</p>
            </div>
            <div className="summary-card">
              <i className="fas fa-user-check summary-icon"></i>
              <h3>{t('pages.adminDashboard.presentToday')}</h3>
              <p>{stats.presentToday}</p>
            </div>
            <div className="summary-card">
              <i className="fas fa-user-times summary-icon"></i>
              <h3>{t('pages.adminDashboard.absentToday')}</h3>
              <p>{stats.absentToday}</p>
            </div>
            <div className="summary-card">
              <i className="fas fa-user-minus summary-icon"></i>
              <h3>{t('pages.adminDashboard.onLeave')}</h3>
              <p>{stats.onLeave}</p>
            </div>
          </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <Link to="/admin/teachers" className="action-button">
          <i className="fas fa-user-plus"></i> {t('pages.adminDashboard.addTeacher')}
        </Link>
        <Link to="/admin/attendance" className="action-button">
          <i className="fas fa-clipboard-list"></i> {t('pages.adminDashboard.viewAttendance')}
        </Link>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - {t('app.title')}</p>
      </footer>
    </div>
  );
}

export default AdminDashboard;