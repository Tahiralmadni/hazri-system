import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherById } from '../../services/api';
import '../../App.css';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

// Function to format time in 12-hour format (AM/PM)
const formatTime = (timeString) => {
  if (!timeString) return '-';
  const [hours, minutes] = timeString.split(':');
  const hoursNum = parseInt(hours, 10);
  const period = hoursNum >= 12 ? 'PM' : 'AM';
  const hours12 = hoursNum % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
};

function TeacherProfile() {
  const { t } = useTranslation();
  const { id: encodedId } = useParams();
  const id = decodeURIComponent(encodedId || '');
  
  console.log("TeacherProfile component: Teacher ID from useParams:", encodedId);
  console.log("TeacherProfile component: Decoded ID:", id);
  console.log("TeacherProfile component: Current URL:", window.location.pathname);
  
  const [teacher, setTeacher] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notFound, setNotFound] = useState(false);
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching teacher with ID:", id);
        
        if (!id) {
          console.error("Teacher ID is missing or invalid");
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        
        // Get teacher data using the API service instead of Firebase
        const teacherData = await getTeacherById(id);
        
        if (teacherData) {
          // Add default values for fields that might not exist
          const completeTeacherData = {
            ...teacherData,
            subjects: teacherData.subjects || [t('pages.teacherProfile.generalSubjects', 'General Subjects')],
            workingHours: teacherData.workingHours || { startTime: '08:00', endTime: '16:00' },
            monthlySalary: teacherData.monthlySalary || 0,
            attendanceSummary: teacherData.attendanceSummary || {
              currentMonth: {
                totalDays: 30,
                presentDays: 0,
                absentDays: 0,
                leaveDays: 0,
                attendancePercentage: 0,
                lateCount: 0,
                shortLeaveCount: 0
              },
              overall: {
                totalDays: 30,
                presentDays: 0,
                absentDays: 0,
                leaveDays: 0,
                attendancePercentage: 0,
                lateCount: 0,
                shortLeaveCount: 0
              }
            },
            recentAttendance: teacherData.recentAttendance || [],
          };
          
          console.log("Teacher data loaded:", completeTeacherData);
          setTeacher(completeTeacherData);
          setIsLoading(false);
        } else {
          console.error("Teacher not found");
          setNotFound(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
        setNotFound(true);
        setIsLoading(false);
      }
    };
    
    fetchTeacherData();
  }, [id, t]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{t('components.loading')}</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="dashboard">
        <Helmet>
          <title>{t('pages.teacherProfile.notFound')}</title>
          <meta name="description" content={t('app.subtitle')} />
        </Helmet>
        <nav className="admin-nav">
          <div className="admin-nav-brand">
            <i className="fas fa-user-clock"></i>
            <span>{t('app.title')}</span>
          </div>
          <div className="admin-nav-menu">
            <Link to="/admin" className="admin-nav-link">
              <i className="fas fa-tachometer-alt"></i> {t('components.nav.dashboard')}
            </Link>
            <Link to="/admin/teachers" className="admin-nav-link active">
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
        
        <div className="container">
          <button className="back-btn" onClick={() => navigate('/admin/teachers')}>
            <i className="fas fa-arrow-right"></i> {t('pages.teacherProfile.backToTeachers')}
          </button>
          
          <div className="not-found-box">
            <i className="fas fa-user-slash not-found-icon"></i>
            <h2>{t('pages.teacherProfile.teacherNotFound')}</h2>
            <button className="btn primary-btn" onClick={() => navigate('/admin/teachers')}>
              {t('pages.teacherProfile.returnToList')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Helmet>
        <title>{t('pages.teacherProfile.title', { name: teacher.name })}</title>
        <meta name="description" content={t('app.subtitle')} />
      </Helmet>
      
      {/* Simple Navigation */}
      <nav className="admin-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>{t('app.title')}</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/admin" className="admin-nav-link">
            <i className="fas fa-tachometer-alt"></i> {t('components.nav.dashboard')}
          </Link>
          <Link to="/admin/teachers" className="admin-nav-link active">
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
      
      <div className="container">
        {/* Back Button */}
        <button className="back-btn" onClick={() => navigate('/admin/teachers')}>
          <i className="fas fa-arrow-right"></i> {t('pages.teacherProfile.backToTeachers')}
        </button>
        
        {/* Simple Teacher Card */}
        <div className="teacher-profile-card">
          <div className="teacher-avatar">
            <i className="fas fa-user-tie"></i>
          </div>
          
          <h1 className="teacher-name">{teacher.name}</h1>
          <p className="teacher-designation">{teacher.designation || 'استاد'}</p>
          
          {/* Credentials Box */}
          <div className="credentials-box">
            <div className="credentials-header">
              <i className="fas fa-key"></i> {t('pages.teacherProfile.loginInfo')}
            </div>
            <div className="credentials-item">
              <strong>GR Number:</strong> {teacher.grNumber || 'Not Assigned'}
            </div>
            <div className="credentials-item">
              <strong>{t('pages.teacherProfile.email')}:</strong> {teacher.email || 'N/A'}
            </div>
            <div className="credentials-item">
              <strong>{t('pages.teacherProfile.username')}:</strong> {teacher.username || 'N/A'}
            </div>
            <div className="credentials-item">
              <strong>{t('pages.teacherProfile.password')}:</strong> {teacher.plainPassword || t('pages.teacherProfile.notAvailable')}
            </div>
            <div className="credentials-item">
              <strong>ID:</strong> {teacher._id || 'N/A'}
            </div>
          </div>

          {/* Basic Info */}
          <div className="info-grid simple">
            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <div className="info-box-content">
                <div className="info-box-label">{t('pages.teacherProfile.salary')}</div>
                <div className="info-box-value">Rs. {teacher.monthlySalary ? teacher.monthlySalary.toLocaleString() : '0'}</div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="info-box-content">
                <div className="info-box-label">{t('pages.teacherProfile.workingHours')}</div>
                <div className="info-box-value">
                  {teacher.workingHours?.startTime || '08:00'} - {teacher.workingHours?.endTime || '16:00'}
                </div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-phone"></i>
              </div>
              <div className="info-box-content">
                <div className="info-box-label">{t('pages.teacherProfile.contactNumber')}</div>
                <div className="info-box-value">{teacher.phoneNumber || teacher.contactNumber || t('pages.teacherProfile.notAvailable')}</div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-calendar"></i>
              </div>
              <div className="info-box-content">
                <div className="info-box-label">{t('pages.teacherProfile.joiningDate')}</div>
                <div className="info-box-value">
                  {new Date(teacher.joiningDate).toLocaleDateString('ur-PK') || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn edit-btn" onClick={() => navigate('/admin/teachers', { state: { editTeacher: teacher } })}>
              <i className="fas fa-edit"></i> {t('components.buttons.edit')}
            </button>
            <button className="btn delete-btn" onClick={() => navigate('/admin/teachers', { state: { deleteTeacher: teacher._id } })}>
              <i className="fas fa-trash-alt"></i> {t('components.buttons.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherProfile; 