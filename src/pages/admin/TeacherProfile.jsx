import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, getTeacher } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import '../../App.css';

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
        
        // Get the teacher document from Firestore
        const docRef = doc(db, 'teachers', id);
        console.log("Looking up teacher document with reference:", docRef);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const teacherData = {
            id: docSnap.id,
            ...docSnap.data(),
            // Default data for fields that might not exist in Firestore
            subjects: docSnap.data().subjects || ['عام مضامین'],
            workingHours: docSnap.data().workingHours || { startTime: '08:00', endTime: '16:00' },
            monthlySalary: docSnap.data().monthlySalary || 0,
            attendanceSummary: docSnap.data().attendanceSummary || {
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
            recentAttendance: docSnap.data().recentAttendance || [],
            recentSalary: docSnap.data().recentSalary || [
              {
                month: new Date().toLocaleDateString('ur-PK', { month: 'long', year: 'numeric' }),
                baseSalary: docSnap.data().monthlySalary || 0,
                deductions: 0,
                bonus: 0,
                netSalary: docSnap.data().monthlySalary || 0,
                status: 'pending'
              }
            ]
          };
          
          console.log("Teacher data:", teacherData);
        setTeacher(teacherData);
          setNotFound(false);
      } else {
          console.log("Teacher not found");
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error fetching teacher:", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeacherData();
  }, [id]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p>برائے مہربانی انتظار کریں...</p>
      </div>
    );
  }
  
  if (notFound) {
    return (
      <div className="dashboard">
        <nav className="admin-nav">
          <div className="admin-nav-brand">
            <i className="fas fa-user-clock"></i>
            <span>حاضری اور تنخواہ نظام</span>
          </div>
          <div className="admin-nav-menu">
            <Link to="/admin" className="admin-nav-link">
              <i className="fas fa-tachometer-alt"></i> ڈیش بورڈ
            </Link>
            <Link to="/admin/teachers" className="admin-nav-link active">
              <i className="fas fa-chalkboard-teacher"></i> اساتذہ
            </Link>
            <Link to="/admin/attendance" className="admin-nav-link">
              <i className="fas fa-clipboard-list"></i> حاضری
            </Link>
          </div>
          <div className="admin-nav-user">
            <button onClick={handleLogout} className="logout-button">
              <i className="fas fa-sign-out-alt"></i> لاگ آؤٹ
            </button>
          </div>
        </nav>
        
        <div className="container">
          <button className="back-btn" onClick={() => navigate('/admin/teachers')}>
            <i className="fas fa-arrow-right"></i> واپس جائیں
          </button>
          
          <div className="not-found-box">
            <i className="fas fa-user-slash not-found-icon"></i>
            <h2>استاد کی معلومات نہیں ملی</h2>
            <button className="btn primary-btn" onClick={() => navigate('/admin/teachers')}>
              اساتذہ کی فہرست پر واپس جائیں
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Simple Navigation */}
      <nav className="admin-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>حاضری نظام</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/admin" className="admin-nav-link">
            <i className="fas fa-tachometer-alt"></i> ڈیش بورڈ
          </Link>
          <Link to="/admin/teachers" className="admin-nav-link active">
            <i className="fas fa-chalkboard-teacher"></i> اساتذہ
          </Link>
          <Link to="/admin/attendance" className="admin-nav-link">
            <i className="fas fa-clipboard-list"></i> حاضری
          </Link>
        </div>
        <div className="admin-nav-user">
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> لاگ آؤٹ
          </button>
        </div>
      </nav>
      
      <div className="container">
        {/* Back Button */}
        <button className="back-btn" onClick={() => navigate('/admin/teachers')}>
          <i className="fas fa-arrow-right"></i> واپس جائیں
        </button>
        
        {/* Simple Teacher Card */}
        <div className="teacher-profile-card">
          <div className="teacher-avatar">
                  <i className="fas fa-user-tie"></i>
                </div>
          
          <h1 className="teacher-name">{teacher.name}</h1>
          <p className="teacher-designation">{teacher.designation}</p>
          
          {/* Credentials Box */}
          <div className="credentials-box">
            <div className="credentials-header">
              <i className="fas fa-key"></i> لاگ ان معلومات
            </div>
            <div className="credentials-item">
              <strong>ای میل:</strong> {teacher.email}
            </div>
            <div className="credentials-item">
              <strong>صارف نام:</strong> {teacher.username}
            </div>
            <div className="credentials-item">
              <strong>پاس ورڈ:</strong> {teacher.password || 'دستیاب نہیں'}
            </div>
          </div>

          {/* Basic Info */}
          <div className="info-grid simple">
            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-money-bill-wave"></i>
                    </div>
              <div className="info-box-content">
                <div className="info-box-label">تنخواہ</div>
                <div className="info-box-value">Rs. {teacher.monthlySalary.toLocaleString()}</div>
                  </div>
                </div>

            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-clock"></i>
                    </div>
              <div className="info-box-content">
                <div className="info-box-label">کام کے اوقات</div>
                <div className="info-box-value">{teacher.workingHours.startTime} - {teacher.workingHours.endTime}</div>
                  </div>
                </div>

            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-phone"></i>
              </div>
              <div className="info-box-content">
                <div className="info-box-label">رابطہ نمبر</div>
                <div className="info-box-value">{teacher.contactNumber || 'دستیاب نہیں'}</div>
                  </div>
                </div>

            <div className="info-box">
              <div className="info-box-icon">
                <i className="fas fa-calendar"></i>
              </div>
              <div className="info-box-content">
                <div className="info-box-label">تاریخ شمولیت</div>
                <div className="info-box-value">{teacher.joiningDate}</div>
                    </div>
                  </div>
                </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn primary-btn">
              <i className="fas fa-edit"></i> ترمیم کریں
            </button>
            <button className="btn primary-btn">
              <i className="fas fa-money-bill-wave"></i> تنخواہ ادا کریں
                  </button>
            <button className="btn secondary-btn">
                    <i className="fas fa-print"></i> پرنٹ کریں
                  </button>
                </div>
              </div>
          </div>
    </div>
  );
}

export default TeacherProfile; 