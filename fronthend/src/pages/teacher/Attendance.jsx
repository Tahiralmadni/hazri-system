import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../App.css';

// Empty initial data
const emptyAttendanceData = {
  teacherId: '',
  name: '',
  months: [],
  attendanceRecords: {},
  monthlySummaries: {}
};

// Function to format time in 12-hour format (AM/PM)
const formatTime = (timeString) => {
  if (!timeString) return '-';
  const [hours, minutes] = timeString.split(':');
  const hoursNum = parseInt(hours, 10);
  const period = hoursNum >= 12 ? 'PM' : 'AM';
  const hours12 = hoursNum % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
};

function TeacherAttendance() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [showSummary, setShowSummary] = useState(true);
  const [monthSummary, setMonthSummary] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Load attendance data
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAttendanceData(emptyAttendanceData);
      if (emptyAttendanceData.months.length > 0) {
        setSelectedMonth(emptyAttendanceData.months[0].id);
      } else {
        const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
        setSelectedMonth(currentMonth);
      }
      setIsLoading(false);
    }, 1000);
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
  
  // Update filtered records and month summary when selected month changes or search term changes
  useEffect(() => {
    if (!attendanceData || !selectedMonth) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      // Get the records for the selected month
      const records = attendanceData.attendanceRecords[selectedMonth] || [];
      
      // Filter records based on search term
      const filtered = records.filter(record => 
        record.date.toLowerCase().includes(searchTerm.toLowerCase()) || 
        record.day.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      setFilteredRecords(filtered);
      setMonthSummary(attendanceData.monthlySummaries[selectedMonth] || null);
      setIsLoading(false);
    }, 500);
  }, [selectedMonth, searchTerm, attendanceData]);

  return (
    <div className="dashboard">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>برائے مہربانی انتظار کریں...</p>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="admin-nav teacher-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>حاضری اور تنخواہ نظام</span>
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
          <h1>حاضری ریکارڈ</h1>
        </div>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="month"><i className="fas fa-calendar-alt"></i> مہینہ:</label>
            <select 
              id="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="filter-input"
            >
              {attendanceData && attendanceData.months.length > 0 ? (
                attendanceData.months.map(month => (
                  <option key={month.id} value={month.id}>{month.name}</option>
                ))
              ) : (
                <option value={selectedMonth}>{new Date().toLocaleDateString('ur-PK', { year: 'numeric', month: 'long' })}</option>
              )}
            </select>
          </div>
          <div className="filter-group search-group">
            <label htmlFor="search"><i className="fas fa-search"></i> تلاش:</label>
            <input 
              type="text" 
              id="search" 
              placeholder="تاریخ، دن یا حالت سے تلاش کریں..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <button 
              className={`toggle-button ${showSummary ? 'active' : ''}`} 
              onClick={() => setShowSummary(!showSummary)}
            >
              {showSummary ? (
                <><i className="fas fa-chart-pie"></i> خلاصہ چھپائیں</>
              ) : (
                <><i className="fas fa-chart-pie"></i> خلاصہ دکھائیں</>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Monthly Summary */}
      {showSummary && (
        <div className="attendance-summary">
          <div className="summary-title">
            <h2>{selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('ur-PK', { year: 'numeric', month: 'long' }) : ''} کا خلاصہ</h2>
          </div>
          
          {monthSummary ? (
            <>
              <div className="summary-stats-cards">
                <div className="summary-stat-card">
                  <div className="stat-icon present">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <div className="stat-details">
                    <div className="stat-number">{monthSummary.presentDays}</div>
                    <div className="stat-label">حاضر دن</div>
                  </div>
                </div>
                
                <div className="summary-stat-card">
                  <div className="stat-icon absent">
                    <i className="fas fa-calendar-times"></i>
                  </div>
                  <div className="stat-details">
                    <div className="stat-number">{monthSummary.absentDays}</div>
                    <div className="stat-label">غیر حاضر دن</div>
                  </div>
                </div>
                
                <div className="summary-stat-card">
                  <div className="stat-icon leave">
                    <i className="fas fa-calendar-minus"></i>
                  </div>
                  <div className="stat-details">
                    <div className="stat-number">{monthSummary.leaveDays}</div>
                    <div className="stat-label">چھٹیاں</div>
                  </div>
                </div>
                
                <div className="summary-stat-card">
                  <div className="stat-icon percentage">
                    <i className="fas fa-percentage"></i>
                  </div>
                  <div className="stat-details">
                    <div className="stat-number">{monthSummary.attendancePercentage}%</div>
                    <div className="stat-label">حاضری شرح</div>
                  </div>
                </div>
              </div>
              
              <div className="additional-stats">
                <div className="additional-stat">
                  <span className="label"><i className="fas fa-clock"></i> کام کے گھنٹے:</span>
                  <span className="value">{monthSummary.totalWorkHours} / {monthSummary.requiredWorkHours}</span>
                </div>
                <div className="additional-stat">
                  <span className="label"><i className="fas fa-exclamation-circle"></i> دیر سے آنا:</span>
                  <span className="value">{monthSummary.lateCount} دن</span>
                </div>
                <div className="additional-stat">
                  <span className="label"><i className="fas fa-sign-out-alt"></i> جلدی جانا:</span>
                  <span className="value">{monthSummary.shortLeaveCount} دن</span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data-message">
              <i className="fas fa-chart-pie"></i>
              <p>اس مہینے کا کوئی خلاصہ موجود نہیں</p>
            </div>
          )}
        </div>
      )}

      {/* Attendance Records */}
      <div className="attendance-records">
        <h3>روزانہ کی حاضری</h3>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>دن</th>
                <th>حالت</th>
                <th>چیک ان</th>
                <th>چیک آؤٹ</th>
                <th>کام کے گھنٹے</th>
                <th>تفصیلات</th>
                <th>نوٹس</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={index}>
                    <td data-label="تاریخ">{record.date}</td>
                    <td data-label="دن">{record.day}</td>
                    <td data-label="حالت">
                      {record.status === 'present' ? (
                        <span className="status-badge present"><i className="fas fa-check-circle"></i> حاضر</span>
                      ) : record.status === 'absent' ? (
                        <span className="status-badge absent"><i className="fas fa-times-circle"></i> غیر حاضر</span>
                      ) : (
                        <span className="status-badge leave"><i className="fas fa-calendar-minus"></i> چھٹی</span>
                      )}
                    </td>
                    <td data-label="چیک ان">{formatTime(record.checkIn)}</td>
                    <td data-label="چیک آؤٹ">{formatTime(record.checkOut)}</td>
                    <td data-label="کام کے گھنٹے">{record.workHours?.toFixed(2) || '0.00'}</td>
                    <td data-label="تفصیلات">
                      <div className="status-flags">
                        {record.isLate && <span className="status-tag late">دیر سے</span>}
                        {record.isShortDay && <span className="status-tag short">جلدی گئے</span>}
                      </div>
                    </td>
                    <td data-label="نوٹس">{record.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-message">
                    <i className="fas fa-clipboard-list"></i> حاضری کا کوئی ریکارڈ موجود نہیں
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-button">
          <i className="fas fa-file-excel"></i>
          <span>ایکسل میں برآمد کریں</span>
        </button>
        <button className="action-button">
          <i className="fas fa-file-pdf"></i>
          <span>PDF میں برآمد کریں</span>
        </button>
        <button className="action-button">
          <i className="fas fa-print"></i>
          <span>پرنٹ کریں</span>
        </button>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - حاضری نظام - دارالافتا</p>
      </footer>
    </div>
  );
}

export default TeacherAttendance;