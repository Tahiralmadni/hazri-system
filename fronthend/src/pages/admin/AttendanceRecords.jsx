import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeachers, getAllAttendance, deleteAttendanceRecord } from '../../services/api';
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

function AttendanceRecords() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // Default to empty (show all dates)
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Add states for multiple selection
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log('Loading attendance records and teachers...');

        // Load teachers
        const teachersData = await getTeachers();
        console.log('Loaded teachers:', teachersData.length);
        setTeachers(teachersData);

        // Load attendance records
        const attendanceData = await getAllAttendance();
        console.log('Loaded attendance records:', attendanceData.length);
        setRecords(attendanceData);
      } catch (error) {
        console.error('Error loading data:', error);
        alert(t('components.error.generic'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [t]);

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
      alert(t('pages.attendanceRecords.errors.noSelection', 'No records selected'));
      return;
    }
    
    const confirmDelete = window.confirm(
      t('pages.attendanceRecords.confirmBulkDelete', 
        `Are you sure you want to delete ${selectedRecords.length} selected attendance records?`)
    );
    
    if (!confirmDelete) return;
    
    setIsLoading(true);
    
    try {
      let failedCount = 0;
      
      // Delete each selected record
      for (const id of selectedRecords) {
        try {
          await deleteAttendanceRecord(id);
        } catch (error) {
          console.error(`Error deleting attendance record ${id}:`, error);
          failedCount++;
        }
      }
      
      // Refresh records list by loading data again
      const loadData = async () => {
        try {
          // Load attendance records
          const attendanceData = await getAllAttendance();
          setRecords(attendanceData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      await loadData();
      
      // Reset selection
      setSelectedRecords([]);
      setSelectAll(false);
      
      if (failedCount > 0) {
        alert(`${selectedRecords.length - failedCount} records deleted successfully. ${failedCount} deletions failed.`);
      } else {
        alert(`${selectedRecords.length} records deleted successfully.`);
      }
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      alert(error.message || t('pages.attendanceRecords.errors.bulkDeleteError', 'Error deleting records'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <Helmet>
        <title>{t('pages.attendanceRecords.title')}</title>
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
          <span>{t('app.title')}</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/admin" className="admin-nav-link">
            <i className="fas fa-tachometer-alt"></i> {t('components.nav.dashboard')}
          </Link>
          <Link to="/admin/teachers" className="admin-nav-link">
            <i className="fas fa-chalkboard-teacher"></i> {t('components.nav.teachers')}
          </Link>
          <Link to="/admin/attendance" className="admin-nav-link active">
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
          <h1>{t('pages.attendanceRecords.heading')}</h1>
        </div>
        <div className="filters attendance-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="date"><i className="fas fa-calendar-day"></i> {t('pages.attendanceRecords.searchDate')}:</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="filter-input"
                placeholder={t('pages.attendanceRecords.allDates')}
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="clear-filter-btn"
                  title={t('pages.attendanceRecords.showAllDates')}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            <div className="filter-group">
              <label htmlFor="teacher"><i className="fas fa-chalkboard-teacher"></i> {t('pages.attendanceRecords.searchTeacher')}:</label>
              <select
                id="teacher"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="filter-input"
              >
                <option value="">{t('pages.attendanceRecords.allTeachers')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="status"><i className="fas fa-clipboard-check"></i> {t('pages.attendanceRecords.status')}:</label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-input"
              >
                <option value="all">{t('pages.attendanceRecords.allStatus')}</option>
                <option value="present">{t('components.attendanceStatus.present')}</option>
                <option value="absent">{t('components.attendanceStatus.absent')}</option>
                <option value="leave">{t('components.attendanceStatus.leave')}</option>
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-group search-group">
              <label htmlFor="search"><i className="fas fa-search"></i> {t('pages.attendanceRecords.search')}:</label>
              <input
                type="text"
                id="search"
                placeholder={t('pages.attendanceRecords.searchTeacherName')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <button
                onClick={() => window.location.reload()}
                className="refresh-button"
                disabled={isLoading}
              >
                <i className={`fas fa-sync ${isLoading ? 'fa-spin' : ''}`}></i> {t('components.buttons.refresh')}
              </button>
              {selectedRecords.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="delete-selected-button"
                  disabled={isLoading}
                >
                  <i className="fas fa-trash-alt"></i> {t('pages.attendanceRecords.deleteSelected', 'Delete Selected')} ({selectedRecords.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Active Filters Indicator */}
      {(selectedDate || selectedTeacher || selectedStatus !== 'all' || searchTerm) && (
        <div className="active-filters-indicator">
          <div className="filter-info">
            <i className="fas fa-filter"></i>
            <span>{t('pages.attendanceRecords.activeFilters')}:</span>
            {selectedDate && <span className="filter-tag">{t('pages.attendanceRecords.table.date')}: {selectedDate}</span>}
            {selectedTeacher && <span className="filter-tag">{t('pages.attendanceRecords.table.teacher')}: {teachers.find(t => t.id === selectedTeacher)?.name}</span>}
            {selectedStatus !== 'all' && <span className="filter-tag">{t('pages.attendanceRecords.status')}: {t(`components.attendanceStatus.${selectedStatus}`)}</span>}
            {searchTerm && <span className="filter-tag">{t('pages.attendanceRecords.search')}: {searchTerm}</span>}
          </div>
          <button
            onClick={() => {
              setSelectedDate('');
              setSelectedTeacher('');
              setSelectedStatus('all');
              setSearchTerm('');
            }}
            className="clear-all-filters-btn"
          >
            <i className="fas fa-times"></i> {t('pages.attendanceRecords.clearAllFilters')}
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <i className="fas fa-clipboard-list summary-icon"></i>
          <h3>{t('pages.attendanceRecords.totalRecords')}</h3>
          <p>{filteredRecords.length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-check-circle summary-icon"></i>
          <h3>{t('components.attendanceStatus.present')}</h3>
          <p>{filteredRecords.filter(r => r.status === 'present').length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-times-circle summary-icon"></i>
          <h3>{t('components.attendanceStatus.absent')}</h3>
          <p>{filteredRecords.filter(r => r.status === 'absent').length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-calendar-minus summary-icon"></i>
          <h3>{t('components.attendanceStatus.leave')}</h3>
          <p>{filteredRecords.filter(r => r.status === 'leave').length}</p>
        </div>
        <div className="summary-card">
          <i className="fas fa-money-bill-wave summary-icon"></i>
          <h3>{t('pages.attendanceRecords.totalDeduction')}</h3>
          <p>Rs. {totalSalaryDeduction.toLocaleString()}</p>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input 
                  type="checkbox" 
                  checked={selectAll} 
                  onChange={handleSelectAll} 
                  className="select-checkbox"
                  title={selectAll ? t('pages.attendanceRecords.deselectAll', 'Deselect All') : t('pages.attendanceRecords.selectAll', 'Select All')}
                />
              </th>
              <th>{t('pages.attendanceRecords.table.date')}</th>
              <th>{t('pages.attendanceRecords.table.teacher')}</th>
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
                  <td data-label={t('pages.attendanceRecords.table.teacher')}>{record.teacherName || getTeacherNameById(record.teacherId)}</td>
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
                  <td data-label={t('pages.attendanceRecords.table.checkIn')}>{record.checkIn ? formatTime(record.checkIn) : '-'}</td>
                  <td data-label={t('pages.attendanceRecords.table.checkOut')}>{record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                  <td data-label={t('pages.attendanceRecords.table.workingHours')}>{record.workHours || '0.00'}</td>
                  <td data-label={t('pages.attendanceRecords.table.details')}>
                    <div className="status-flags">
                      {record.isLate && (
                        <span className="status-tag late">{t('components.attendanceFlags.late')}</span>
                      )}
                      {record.isShortDay && (
                        <span className="status-tag short">{t('components.attendanceFlags.shortDay')}</span>
                      )}
                      {record.notes && (
                        <span className="notes-text">{record.notes}</span>
                      )}
                      {!record.isLate && !record.isShortDay && !record.notes && '-'}
                    </div>
                  </td>
                  <td data-label={t('pages.attendanceRecords.table.deduction')}>{calculateDetailedDeduction(record)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="empty-message">
                  <i className="fas fa-info-circle"></i> {t('pages.attendanceRecords.noRecordsFound')}
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

export default AttendanceRecords;