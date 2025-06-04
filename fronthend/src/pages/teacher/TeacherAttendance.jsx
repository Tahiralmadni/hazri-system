import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherAttendance, getAttendanceSummary, getTeacherById, deleteAttendanceRecord } from '../../services/api';
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
  const { t } = useTranslation();
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Generate array of months for select dropdown
  const months = [
    { value: 1, label: t('months.january') },
    { value: 2, label: t('months.february') },
    { value: 3, label: t('months.march') },
    { value: 4, label: t('months.april') },
    { value: 5, label: t('months.may') },
    { value: 6, label: t('months.june') },
    { value: 7, label: t('months.july') },
    { value: 8, label: t('months.august') },
    { value: 9, label: t('months.september') },
    { value: 10, label: t('months.october') },
    { value: 11, label: t('months.november') },
    { value: 12, label: t('months.december') }
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

  // Function to load attendance data and teacher info
  const loadAttendanceData = async () => {
    if (!currentUser?.id) {
      setErrorState(true);
      return;
    }

    setIsLoading(true);
    setLoadingError(null); // Clear previous errors on re-fetch

    try {
      // Load teacher data first
      const teacher = await getTeacherById(currentUser.id);
      if (teacher) {
        setTeacherData(teacher);
      } else {
        setErrorState(true);
        throw new Error(t('components.error.teacherNotFound'));
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
      setLoadingError(error.message || t('components.error.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load attendance data when teacher, selected month/year, location, or navigation state changes
  useEffect(() => {
    const shouldRefresh = location.state?.refreshAttendance;

    if (shouldRefresh) {
      loadAttendanceData();
      // Clear the navigation state to prevent unnecessary refetches
      window.history.replaceState({}, document.title);
    } else {
      loadAttendanceData();
    }

  }, [currentUser, selectedMonth, selectedYear, location.pathname]); // Removed location.state to prevent infinite loops

  // Handle manual refresh
  const handleRefresh = () => {
    loadAttendanceData();
  };

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

    const matchesMonthYear = showAllMonths ? true : (
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

  // Calculate final salary for visible records
  const calculatedFinalSalary = teacherData?.monthlySalary 
    ? Math.max(0, teacherData.monthlySalary - totalSalaryDeduction)
    : 0;

  // Get month name
  const getMonthName = (monthNum) => {
    const month = months.find(m => m.value === monthNum);
    return month ? month.label : '';
  };

  // Handle select all checkbox change
  const handleSelectAll = () => {
    const newSelectAllValue = !selectAll;
    setSelectAll(newSelectAllValue);
    
    if (newSelectAllValue) {
      // Select all filtered records
      const selectedIds = filteredRecords.map(record => record._id);
      setSelectedRecords(selectedIds);
    } else {
      // Deselect all
      setSelectedRecords([]);
    }
  };
  
  // Handle individual checkbox change
  const handleSelectRecord = (recordId) => {
    if (selectedRecords.includes(recordId)) {
      // Remove from selection
      setSelectedRecords(selectedRecords.filter(id => id !== recordId));
      setSelectAll(false);
    } else {
      // Add to selection
      setSelectedRecords([...selectedRecords, recordId]);
      
      // Check if all filtered records are now selected
      if (selectedRecords.length + 1 === filteredRecords.length) {
        setSelectAll(true);
      }
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      alert(t('pages.teacherAttendance.errors.noSelection', 'No records selected'));
      return;
    }
    
    const confirmDelete = window.confirm(
      t('pages.teacherAttendance.confirmBulkDelete', 
        `Are you sure you want to delete ${selectedRecords.length} selected attendance records?`)
    );
    
    if (!confirmDelete) return;
    
    setIsLoading(true);
    
    try {
      let successCount = 0;
      let failedCount = 0;
      let errorMessages = [];
      
      // Delete each selected record
      for (const id of selectedRecords) {
        try {
          console.log(`Attempting to delete record ${id}...`);
          const result = await deleteAttendanceRecord(id);
          
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errorMessages.push(`ID ${id}: ${result.message}`);
          }
        } catch (error) {
          console.error(`Error deleting attendance record ${id}:`, error);
          failedCount++;
          errorMessages.push(`ID ${id}: ${error.message || 'Unknown error'}`);
        }
      }
      
      // Reset selection
      setSelectedRecords([]);
      setSelectAll(false);
      
      // Show appropriate message based on results
      if (failedCount > 0) {
        const errorDetails = errorMessages.length > 0 ? 
          `\n\nError details:\n${errorMessages.slice(0, 5).join('\n')}${errorMessages.length > 5 ? '\n...' : ''}` : '';
          
        alert(`${successCount} records deleted successfully. ${failedCount} deletions failed.${errorDetails}`);
      } else {
        alert(`${successCount} records deleted successfully.`);
      }
      
      // Refresh attendance data
      await loadAttendanceData();
      
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      alert(error.message || t('pages.teacherAttendance.errors.bulkDeleteError', 'Error deleting records'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard teacher-dashboard">
      <Helmet>
        <title>{t('pages.teacherAttendance.title')}</title>
        <meta name="description" content={t('app.subtitle')} />
      </Helmet>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{t('components.loading')}</p>
        </div>
      )}

      {errorState && (
        <div className="error-container">
          <div className="error-message-box">
            <i className="fas fa-exclamation-triangle"></i>
            <h2>{t('components.error.title')}</h2>
            <p>{loadingError || t('components.error.generic')}</p>
            <div className="error-actions">
              <button onClick={() => window.location.reload()} className="refresh-button">
                <i className="fas fa-sync"></i> {t('components.error.retry')}
              </button>
              <button onClick={handleLogout} className="logout-button error-logout">
                <i className="fas fa-sign-out-alt"></i> {t('components.error.relogin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="admin-nav teacher-nav">
        <div className="admin-nav-brand">
          <i className="fas fa-user-clock"></i>
          <span>{t('app.title')}</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/teacher" className="admin-nav-link">
            <i className="fas fa-tachometer-alt"></i> {t('components.nav.dashboard')}
          </Link>
          <Link to="/teacher/attendance" className="admin-nav-link active">
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
          <i className="fas fa-clipboard-list dashboard-icon"></i>
          <h1>{t('pages.teacherAttendance.heading')}</h1>
        </div>
        <div className="filters">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="month"><i className="fas fa-calendar-alt"></i> {t('pages.teacherAttendance.month')}:</label>
              <select
                id="month"
                value={showAllMonths ? "all" : selectedMonth}
                onChange={(e) => {
                  if (e.target.value === "all") {
                    setShowAllMonths(true);
                  } else {
                    setShowAllMonths(false);
                    setSelectedMonth(Number(e.target.value));
                  }
                }}
                className="filter-input"
              >
                <option value="all">{t('pages.teacherAttendance.allMonths')}</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="year"><i className="fas fa-calendar-day"></i> {t('pages.teacherAttendance.year')}:</label>
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
              <label htmlFor="status"><i className="fas fa-filter"></i> {t('pages.teacherAttendance.status')}:</label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-input"
              >
                <option value="all">{t('pages.teacherAttendance.allStatus')}</option>
                <option value="present">{t('components.attendanceStatus.present')}</option>
                <option value="absent">{t('components.attendanceStatus.absent')}</option>
                <option value="leave">{t('components.attendanceStatus.leave')}</option>
              </select>
            </div>
          </div>
          <div className="filter-group action-buttons">
            <button
              className="action-button"
              onClick={handleRefresh}
              disabled={isLoading} // Disable refresh while loading
            >
              <i className={`fas fa-sync ${isLoading ? 'fa-spin' : ''}`}></i> {t('components.buttons.refresh')}
            </button>
            {selectedRecords.length > 0 && (
              <button
                className="action-button delete-selected-button"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                <i className="fas fa-trash-alt"></i> {t('pages.teacherAttendance.deleteSelected', 'Delete Selected')} ({selectedRecords.length})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <i className="fas fa-calendar-check summary-icon"></i>
          <h3>{t('pages.teacherAttendance.totalDays')}</h3>
          <p>{showAllMonths ? filteredRecords.length : summary?.workingDays || '0'}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-check-circle summary-icon"></i>
          <h3>{t('components.attendanceStatus.present')}</h3>
          <p>{presentDays}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-calendar-minus summary-icon"></i>
          <h3>{t('components.attendanceStatus.leave')}</h3>
          <p>{leaveDays}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-times-circle summary-icon"></i>
          <h3>{t('components.attendanceStatus.absent')}</h3>
          <p>{absentDays}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-money-bill-wave summary-icon"></i>
          <h3>{t('pages.teacherAttendance.deduction')}</h3>
          <p>Rs. {totalSalaryDeduction.toLocaleString()}</p>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="table-container">
        <h3 className="section-title">
          <i className="fas fa-list"></i>
          {showAllMonths 
            ? t('pages.teacherAttendance.allAttendanceRecords') 
            : t('pages.teacherAttendance.monthlyRecordDetail', { month: getMonthName(selectedMonth), year: selectedYear })}
        </h3>

        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input 
                  type="checkbox" 
                  checked={selectAll} 
                  onChange={handleSelectAll} 
                  className="select-checkbox"
                  title={selectAll ? t('pages.teacherAttendance.deselectAll', 'Deselect All') : t('pages.teacherAttendance.selectAll', 'Select All')}
                />
              </th>
              <th>{t('pages.attendanceRecords.table.date')}</th>
              <th>{t('pages.attendanceRecords.table.status')}</th>
              <th>{t('pages.attendanceRecords.table.checkIn')}</th>
              <th>{t('pages.attendanceRecords.table.checkOut')}</th>
              <th>{t('pages.attendanceRecords.table.workingHours')}</th>
              <th>{t('pages.attendanceRecords.table.details')}</th>
              <th>{t('pages.attendanceRecords.table.deduction')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => (
                <tr key={index}>
                  <td className="checkbox-column">
                    <input 
                      type="checkbox"
                      checked={selectedRecords.includes(record._id)}
                      onChange={() => handleSelectRecord(record._id)}
                      className="select-checkbox"
                    />
                  </td>
                  <td data-label={t('pages.attendanceRecords.table.date')}>{record.date}</td>
                  <td data-label={t('pages.attendanceRecords.table.status')}>
                    {record.status === 'present' ? (
                      <span className="status-badge present">
                        <i className="fas fa-check-circle"></i> {t('components.attendanceStatus.present')}
                      </span>
                    ) : record.status === 'absent' ? (
                      <span className="status-badge absent">
                        <i className="fas fa-times-circle"></i> {t('components.attendanceStatus.absent')}
                      </span>
                    ) : (
                      <span className="status-badge leave">
                        <i className="fas fa-calendar-minus"></i> {t('components.attendanceStatus.leave')}
                      </span>
                    )}
                  </td>
                  <td data-label={t('pages.attendanceRecords.table.checkIn')}>{(record.timeIn || record.checkIn) ? formatTime(record.timeIn || record.checkIn) : '-'}</td>
                  <td data-label={t('pages.attendanceRecords.table.checkOut')}>{(record.timeOut || record.checkOut) ? formatTime(record.timeOut || record.checkOut) : '-'}</td>
                  <td data-label={t('pages.attendanceRecords.table.workingHours')}>{record.workHours || '0.00'}</td>
                  <td>
                    <div className="status-flags">
                      {record.status === 'present' && record.isLate && (
                        <span className="status-tag late">{t('components.attendanceFlags.late')}</span>
                      )}
                      {record.status === 'present' && record.isShortDay && (
                        <span className="status-tag short">{t('components.attendanceFlags.shortDay')}</span>
                      )}
                      {record.status === 'leave' && (
                        <span className="notes-text">{record.notes || t('pages.teacherAttendance.noLeaveReason')}</span>
                      )}
                    </div>
                  </td>
                  <td>{calculateDetailedDeduction(record)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-message">
                  <i className="fas fa-clipboard-list"></i> {t('pages.teacherAttendance.noRecordsFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - {t('app.title')}</p>
      </footer>
    </div>
  );
}

export default TeacherAttendance;
