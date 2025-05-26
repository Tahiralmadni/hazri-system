import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeachers, getAllAttendance } from '../../services/firebase';
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

// Function to calculate salary deduction based on lateness
const calculateDetailedDeduction = (record) => {
  if (!record.salaryDeduction || record.salaryDeduction <= 0) {
    return '-';
  }
  return `Rs. ${record.salaryDeduction.toFixed(2)}`;
};

function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load teachers
        const teachersData = await getTeachers();
        setTeachers(teachersData);
        
        // Load attendance records
        const attendanceData = await getAllAttendance();
        setRecords(attendanceData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
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

  // Filter records based on search, date, status, and teacher
  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesDate = selectedDate ? record.date === selectedDate : true;
    const matchesStatus = selectedStatus === 'all' ? true : record.status === selectedStatus;
    const matchesTeacher = selectedTeacher ? record.teacherId === selectedTeacher : true;
    return matchesSearch && matchesDate && matchesStatus && matchesTeacher;
  });
  
  // Group records by teacher for the selected date
  const getTeacherNameById = (id) => {
    const teacher = teachers.find(t => t.id === id);
    return teacher ? teacher.name : 'Unknown';
  };
  
  // Calculate total salary deductions
  const totalSalaryDeduction = filteredRecords.reduce((total, record) => {
    return total + (record.salaryDeduction || 0);
  }, 0);

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
          <span>حاضری نظام</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/admin" className="admin-nav-link">
            <i className="fas fa-tachometer-alt"></i> ڈیش بورڈ
          </Link>
          <Link to="/admin/teachers" className="admin-nav-link">
            <i className="fas fa-chalkboard-teacher"></i> اساتذہ
          </Link>
          <Link to="/admin/attendance" className="admin-nav-link active">
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
          <i className="fas fa-clipboard-list dashboard-icon"></i>
          <h1>حاضری ریکارڈز</h1>
        </div>
        <div className="filters attendance-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="date"><i className="fas fa-calendar-day"></i> تاریخ:</label>
              <input 
                type="date" 
                id="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="teacher"><i className="fas fa-chalkboard-teacher"></i> استاد:</label>
              <select 
                id="teacher" 
                value={selectedTeacher} 
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="filter-input"
              >
                <option value="">تمام اساتذہ</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="status"><i className="fas fa-clipboard-check"></i> حالت:</label>
              <select 
                id="status" 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-input"
              >
                <option value="all">تمام</option>
                <option value="present">حاضر</option>
                <option value="absent">غیر حاضر</option>
                <option value="leave">چھٹی</option>
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-group search-group">
              <label htmlFor="search"><i className="fas fa-search"></i> تلاش:</label>
              <input 
                type="text" 
                id="search" 
                placeholder="استاد کا نام تلاش کریں..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
        </div>
      </header>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <i className="fas fa-clipboard-list summary-icon"></i>
          <h3>کل ریکارڈز</h3>
          <p>{filteredRecords.length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-check-circle summary-icon"></i>
          <h3>حاضر</h3>
          <p>{filteredRecords.filter(r => r.status === 'present').length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-times-circle summary-icon"></i>
          <h3>غیر حاضر</h3>
          <p>{filteredRecords.filter(r => r.status === 'absent').length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-calendar-minus summary-icon"></i>
          <h3>چھٹی</h3>
          <p>{filteredRecords.filter(r => r.status === 'leave').length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-money-bill-wave summary-icon"></i>
          <h3>کل کٹوتی</h3>
          <p>Rs. {totalSalaryDeduction.toLocaleString()}</p>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>تاریخ</th>
              <th>استاد</th>
              <th>حالت</th>
              <th>چیک ان</th>
              <th>چیک آؤٹ</th>
              <th>کام کے گھنٹے</th>
              <th>تفصیلات</th>
              <th>کٹوتی</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => (
                <tr key={index}>
                  <td>{record.date}</td>
                  <td>{record.teacherName || getTeacherNameById(record.teacherId)}</td>
                  <td>
                    {record.status === 'present' ? (
                      <span className="status-badge present">
                        <i className="fas fa-check-circle"></i> حاضر
                      </span>
                    ) : record.status === 'absent' ? (
                      <span className="status-badge absent">
                        <i className="fas fa-times-circle"></i> غیر حاضر
                      </span>
                    ) : (
                      <span className="status-badge leave">
                        <i className="fas fa-calendar-minus"></i> چھٹی
                      </span>
                    )}
                  </td>
                  <td>{record.checkIn ? formatTime(record.checkIn) : '-'}</td>
                  <td>{record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                  <td>{record.workHours || '0.00'}</td>
                  <td>
                    <div className="status-flags">
                      {record.status === 'present' && record.isLate && (
                        <span className="status-tag late">دیر سے آئے</span>
                      )}
                      {record.status === 'present' && record.isShortDay && (
                        <span className="status-tag short">جلدی گئے</span>
                      )}
                      {record.status === 'leave' && (
                        <span className="notes-text">{record.notes || 'چھٹی کی وضاحت نہیں'}</span>
                      )}
                    </div>
                  </td>
                  <td>{calculateDetailedDeduction(record)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-message">
                  <i className="fas fa-clipboard-list"></i> منتخب معیار کے مطابق کوئی ریکارڈ نہیں ملا
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - حاضری نظام - دارالافتا</p>
      </footer>
    </div>
  );
}

export default AttendanceRecords; 