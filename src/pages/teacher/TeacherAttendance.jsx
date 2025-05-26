import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherAttendance, getAttendanceSummary, getTeacher } from '../../services/firebase';
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

// Function to get current month and year
const getCurrentMonthYear = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // 1-12
    year: now.getFullYear()
  };
};

function TeacherAttendance() {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Generate array of months for select dropdown
  const months = [
    { value: 1, label: 'جنوری' },
    { value: 2, label: 'فروری' },
    { value: 3, label: 'مارچ' },
    { value: 4, label: 'اپریل' },
    { value: 5, label: 'مئی' },
    { value: 6, label: 'جون' },
    { value: 7, label: 'جولائی' },
    { value: 8, label: 'اگست' },
    { value: 9, label: 'ستمبر' },
    { value: 10, label: 'اکتوبر' },
    { value: 11, label: 'نومبر' },
    { value: 12, label: 'دسمبر' }
  ];
  
  // Generate array of years (current year - 2 to current year + 1)
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i);
  }
  
  // Force clear loading state after component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Force clear after 3 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Load attendance data when teacher or selected month/year changes
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!currentUser?.id) {
        setErrorState(true);
        return;
      }
      
      try {
        // Load teacher data first
        const teacher = await getTeacher(currentUser.id);
        if (teacher) {
          setTeacherData(teacher);
        } else {
          console.error("Teacher data not found");
          setErrorState(true);
          throw new Error("استاد کی معلومات نہیں ملی۔"); // Specific error
        }
        
        // Get all attendance records
        const attendanceRecords = await getTeacherAttendance(currentUser.id);
        setRecords(attendanceRecords || []);
        
        // Get attendance summary for selected month/year
        const monthlySummary = await getAttendanceSummary(
          currentUser.id,
          selectedMonth,
          selectedYear
        );
        setSummary(monthlySummary);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setErrorState(true);
        // Set specific error message
        setLoadingError(error.message || "ڈیٹا لوڈ کرنے میں نامعلوم خرابی ہوئی ہے۔"); 
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAttendanceData();
  }, [currentUser, selectedMonth, selectedYear]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  // Filter records based on selected month, year, and status
  const filteredRecords = records.filter((record) => {
    // Extract month and year from record date
    if (!record.date) {
      return false;
    }
    
    const [recordYear, recordMonth] = record.date.split('-').map(Number);
    
    const matchesMonthYear = (
      recordMonth === selectedMonth && 
      recordYear === selectedYear
    );
    
    const matchesStatus = selectedStatus === 'all' ? 
      true : record.status === selectedStatus;
    
    return matchesMonthYear && matchesStatus;
  });
  
  // Calculate statistics for filtered records
  const presentDays = filteredRecords.filter(r => r.status === 'present').length;
  const leaveDays = filteredRecords.filter(r => r.status === 'leave').length;
  const absentDays = filteredRecords.filter(r => r.status === 'absent').length;
  
  // Calculate total salary deductions
  const totalSalaryDeduction = filteredRecords.reduce((total, record) => {
    return total + (record.salaryDeduction || 0);
  }, 0);
  
  // Get month name
  const getMonthName = (monthNum) => {
    const month = months.find(m => m.value === monthNum);
    return month ? month.label : '';
  };

  return (
    <div className="dashboard teacher-dashboard">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>برائے مہربانی انتظار کریں...</p>
        </div>
      )}
      
      {errorState && (
        <div className="error-container">
          <div className="error-message-box">
            <i className="fas fa-exclamation-triangle"></i>
            <h2>مسئلہ پیش آ گیا ہے</h2>
            <p>{loadingError || 'ڈیٹا لوڈ کرنے میں دشواری ہوئی ہے۔'}</p> {/* Display specific error */}
            <div className="error-actions">
              <button onClick={() => window.location.reload()} className="refresh-button">
                <i className="fas fa-sync"></i> صفحہ ریفریش کریں
              </button>
              <button onClick={handleLogout} className="logout-button error-logout">
                <i className="fas fa-sign-out-alt"></i> دوبارہ لاگ ان کریں
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="admin-nav teacher-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>حاضری نظام</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/teacher" className="admin-nav-link">
            <i className="fas fa-tachometer-alt"></i> ڈیش بورڈ
          </Link>
          <Link to="/teacher/attendance" className="admin-nav-link active">
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
          <h1>میری حاضری کا ریکارڈ</h1>
        </div>
        <div className="filters">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="month"><i className="fas fa-calendar-alt"></i> مہینہ:</label>
              <select 
                id="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="filter-input"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="year"><i className="fas fa-calendar-day"></i> سال:</label>
              <select 
                id="year" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="filter-input"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="status"><i className="fas fa-filter"></i> حالت:</label>
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
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <i className="fas fa-calendar-check summary-icon"></i>
          <h3>کل دن</h3>
          <p>{summary?.workingDays || '0'}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-check-circle summary-icon"></i>
          <h3>حاضر</h3>
          <p>{presentDays}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-calendar-minus summary-icon"></i>
          <h3>چھٹی</h3>
          <p>{leaveDays}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-times-circle summary-icon"></i>
          <h3>غیر حاضر</h3>
          <p>{absentDays}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-money-bill-wave summary-icon"></i>
          <h3>کٹوتی</h3>
          <p>Rs. {totalSalaryDeduction.toLocaleString()}</p>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="summary-section">
        <h3 className="section-title">
          <i className="fas fa-calendar-alt"></i> 
          {getMonthName(selectedMonth)} {selectedYear} کا خلاصہ
        </h3>
        
        <div className="salary-summary">
          <div className="summary-item">
            <div className="summary-label">اصل تنخواہ:</div>
            <div className="summary-value">Rs. {teacherData?.monthlySalary?.toLocaleString() || '0'}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">کل کٹوتی:</div>
            <div className="summary-value deduction">- Rs. {summary?.totalDeductions?.toLocaleString() || '0'}</div>
          </div>
          <div className="divider"></div>
          <div className="summary-item total">
            <div className="summary-label">حتمی تنخواہ:</div>
            <div className="summary-value">Rs. {summary?.finalSalary?.toLocaleString() || '0'}</div>
          </div>
        </div>
        
        <div className="note-box">
          <i className="fas fa-info-circle"></i>
          <p>صرف چھٹی اور غیر حاضری پر تنخواہ میں کٹوتی ہوتی ہے، دیر سے آنے پر کوئی کٹوتی نہیں ہوتی</p>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="table-container">
        <h3 className="section-title">
          <i className="fas fa-list"></i> 
          حاضری کا تفصیلی ریکارڈ
        </h3>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>تاریخ</th>
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
                <td colSpan="7" className="empty-message">
                  <i className="fas fa-clipboard-list"></i> منتخب مہینے میں کوئی حاضری ریکارڈ نہیں ملا
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

export default TeacherAttendance;
