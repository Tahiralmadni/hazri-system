import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addAttendanceRecord, getTeacherById, getTeacherAttendance } from '../../services/api';
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

// Function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Function to convert time string to minutes
const timeToMinutes = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Function to calculate working hours between two time strings
const calculateWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  // Parse the time strings
  const [checkInHours, checkInMinutes] = checkIn.split(':').map(Number);
  const [checkOutHours, checkOutMinutes] = checkOut.split(':').map(Number);
  
  // Calculate total minutes for each time
  const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;
  const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes;
  
  // Calculate difference in minutes
  let diffMinutes = checkOutTotalMinutes - checkInTotalMinutes;
  
  // If the difference is negative (meaning checkout is on the next day)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours in minutes
  }
  
  // Convert to hours with 2 decimal places
  const hours = (diffMinutes / 60).toFixed(2);
  
  return hours;
};

// Function to calculate salary deduction for lateness and leaves
const calculateSalaryDeduction = (status, monthlySalary, checkIn, startTime) => {
  if (!monthlySalary) return 0;

  // Calculate daily salary (assuming 30 days in a month)
  const dailySalary = monthlySalary / 30;

  // Calculate hourly salary (assuming 8 hours per day)
  const hourlySalary = dailySalary / 8;
  const minuteSalary = hourlySalary / 60; // Salary per minute

  if (status === 'leave') {
    // 50% deduction for leave
    const deduction = dailySalary * 0.5;
    return deduction;
  } else if (status === 'absent') {
    // Full deduction for absent
    return dailySalary;
  } else if (status === 'present' && checkIn && startTime) {
    // Calculate minutes late
    const checkInMinutes = timeToMinutes(checkIn);
    const startTimeMinutes = timeToMinutes(startTime);

    // If late, deduct based on minutes late
    if (checkInMinutes > startTimeMinutes) {
      const minutesLate = checkInMinutes - startTimeMinutes;
      const deduction = Math.min(dailySalary * 0.5, minutesLate * minuteSalary); // Cap at 50% of daily salary
      return deduction;
    }
  }

  return 0; // No deduction if on time
};

function TeacherDashboard() {
  const { t } = useTranslation();
  const today = getTodayDateString();
  const [isLoading, setIsLoading] = useState(false); // Start with no loading
  const [todayRecord, setTodayRecord] = useState(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [teacherData, setTeacherData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    date: today,
    status: 'present',
    checkIn: '',
    checkOut: '',
    notes: ''
  });
  const [errorState, setErrorState] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Force clear loading state after component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Force clear after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Load teacher data and attendance records
  useEffect(() => {
    const loadTeacherData = async () => {
      if (!currentUser?.id) {
        setErrorState(true);
        return;
      }

      setIsLoading(true);
      setLoadingError(null);

      try {
        const teacherId = currentUser.id;
        
        // Get teacher data
        const teacher = await getTeacherById(currentUser.id);
        
        if (!teacher) {
          throw new Error(t('components.error.teacherNotFound'));
        }
        
        setTeacherData(teacher);
        
        // Get attendance records for today
        const records = await getTeacherAttendance(teacherId);

        if (Array.isArray(records)) {
          // Sort records by date (newest first)
          const sortedRecords = [...records].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
          });
          setAttendanceRecords(sortedRecords);

          // Check if there's already a record for today
          const todayRec = sortedRecords.find(r => r.date === today);
          if (todayRec) {
            setTodayRecord(todayRec);
            setHasCheckedIn(!!todayRec.checkIn);
            setHasCheckedOut(!!todayRec.checkOut);
          }
        } else {
          setAttendanceRecords([]);
        }
      } catch (error) {
        console.error('Error loading teacher data:', error);
        setErrorState(true);
        setLoadingError(error.message || t('components.error.generic'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTeacherData();
  }, [currentUser, today, refreshKey, t, logout, navigate]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
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

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If check-in or check-out changes, calculate hours
    if (name === 'checkIn' || name === 'checkOut') {
      const checkIn = name === 'checkIn' ? value : formData.checkIn;
      const checkOut = name === 'checkOut' ? value : formData.checkOut;

      if (checkIn && checkOut) {
        const workHours = calculateWorkHours(checkIn, checkOut);
        setFormData(prev => ({ ...prev, workHours }));
      }
    }
  };

  // Handle form submission
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Calculate work hours
      const workHours = calculateWorkHours(formData.checkIn, formData.checkOut);

      // Get standard starting time
      const startTime = teacherData?.workingHours?.startTime || '08:00';

      // Calculate salary deduction
      const salaryDeduction = calculateSalaryDeduction(
        formData.status,
        teacherData?.monthlySalary || 0,
        formData.checkIn,
        startTime
      );

      // Determine if check-in is late (only applicable for present status)
      const isLate = formData.status === 'present' &&
        timeToMinutes(formData.checkIn) > timeToMinutes(startTime);

      // Determine if check-out is early (only applicable for present status)
      const isEarly = formData.status === 'present' && teacherData?.workingHours?.endTime &&
        timeToMinutes(formData.checkOut) < timeToMinutes(teacherData.workingHours.endTime);

      // Generate note for leave
      const leaveNote = formData.status === 'leave'
        ? (formData.notes || t('components.attendanceStatus.leaveDefaultNote', 'Leave taken'))
        : formData.notes;

      // Get the teacherId, ensuring we have a valid ID
      const teacherId = teacherData.id || teacherData._id || currentUser.id;
      
      // Create attendance record
      const attendanceData = {
        teacherId: teacherId,
        teacherName: currentUser.name,
        date: formData.date,
        status: formData.status,
        checkIn: formData.status === 'present' ? formData.checkIn : null,
        checkOut: formData.status === 'present' ? formData.checkOut : null,
        workHours: formData.status === 'present' ? workHours : 0,
        isLate: isLate,
        isShortDay: isEarly,
        salaryDeduction: Number(salaryDeduction.toFixed(2)),
        notes: leaveNote,
        createdAt: new Date().toISOString()
      };

      console.log("Saving attendance record with teacherId:", teacherId);
      
      // Save attendance record
      const result = await addAttendanceRecord(attendanceData);

      if (result.success) {
        // Use the returned record from Firebase for consistency
        const savedRecord = result.record || {
          ...attendanceData,
          id: result.id
        };

        // If this is today's record, update todayRecord state
        if (formData.date === today) {
          setTodayRecord(savedRecord);
          setHasCheckedIn(!!savedRecord.checkIn);
          setHasCheckedOut(!!savedRecord.checkOut);
        }

        // Add to records array - ensure we're updating the state properly
        setAttendanceRecords(prevRecords => {
          const updatedRecords = [...prevRecords];
          // First remove any existing record for the same date
          const existingIndex = updatedRecords.findIndex(r => r.date === formData.date);
          if (existingIndex !== -1) {
            updatedRecords.splice(existingIndex, 1);
          }
          // Add the new record at the beginning
          return [savedRecord, ...updatedRecords];
        });

        // Close modal and reset form
        setIsAddModalOpen(false);
        setFormData({
          date: today,
          status: 'present',
          checkIn: '',
          checkOut: '',
          notes: ''
        });

        // Show success alert
        alert(t('pages.teacherDashboard.attendanceSuccess', 'Attendance recorded successfully'));

        // Force a re-fetch of attendance data to ensure UI is updated
        setTimeout(() => {
          setRefreshKey(oldKey => oldKey + 1);
        }, 500);
      } else {
        throw new Error(result.error || t('components.error.unknownError', 'Unknown error occurred'));
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert(t('pages.teacherDashboard.attendanceError', 'Error submitting attendance. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Open add attendance modal
  const handleAddAttendance = () => {
    setFormData({
      date: today,
      status: 'present',
      checkIn: teacherData?.workingHours?.startTime || '08:00',
      checkOut: teacherData?.workingHours?.endTime || '16:00',
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  // Format current time for display
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Format current date for display
  const formattedDate = currentTime.toLocaleDateString('ur-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="dashboard teacher-dashboard">
      <Helmet>
        <title>{t('pages.teacherDashboard.title')}</title>
        <meta name="description" content={t('app.subtitle')} />
      </Helmet>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{loadingError || t('components.loading')}</p>
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

      {/* Add Attendance Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('pages.teacherDashboard.markAttendance')}</h2>
              <button
                className="close-button"
                onClick={() => setIsAddModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAttendanceSubmit} className="attendance-form">
              <div className="form-group">
                <label htmlFor="date">{t('pages.attendanceRecords.table.date')}:</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">{t('pages.attendanceRecords.table.status')}:</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="present">{t('components.attendanceStatus.present')}</option>
                  <option value="leave">{t('components.attendanceStatus.leave')}</option>
                  <option value="absent">{t('components.attendanceStatus.absent')}</option>
                </select>
              </div>

              {formData.status === 'present' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="checkIn">{t('pages.attendanceRecords.table.checkIn')}:</label>
                      <input
                        type="time"
                        id="checkIn"
                        name="checkIn"
                        value={formData.checkIn}
                        onChange={handleInputChange}
                        required={formData.status === 'present'}
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="checkOut">{t('pages.attendanceRecords.table.checkOut')}:</label>
                      <input
                        type="time"
                        id="checkOut"
                        name="checkOut"
                        value={formData.checkOut}
                        onChange={handleInputChange}
                        required={formData.status === 'present'}
                        className="form-control"
                      />
                    </div>
                  </div>

                  {formData.checkIn && formData.checkOut && (
                    <div className="form-group info-box">
                      <div className="info-label">{t('pages.attendanceRecords.table.workingHours')}:</div>
                      <div className="info-value">
                        {calculateWorkHours(formData.checkIn, formData.checkOut)} {t('pages.teacherDashboard.hours', 'hours')}
                      </div>
                    </div>
                  )}
                </>
              )}

              {(formData.status === 'leave' || formData.status === 'absent') && (
                <div className="form-group info-box warning">
                  <div className="info-label">{t('pages.attendanceRecords.table.deduction')}:</div>
                  <div className="info-value">
                    Rs. {calculateSalaryDeduction(formData.status, teacherData?.monthlySalary || 0, formData.checkIn, teacherData?.workingHours?.startTime || '08:00').toFixed(2)}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="notes">{t('pages.teacherDashboard.notes', 'Notes')}:</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder={t('pages.teacherDashboard.notesPlaceholder', 'Additional information...')}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setIsAddModalOpen(false)}>
                  {t('components.buttons.cancel')}
                </button>
                <button type="submit" className="submit-button">
                  <i className="fas fa-save"></i> {t('components.buttons.save')}
                </button>
              </div>
            </form>
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
          <Link to="/teacher" className="admin-nav-link active">
            <i className="fas fa-tachometer-alt"></i> {t('components.nav.dashboard')}
          </Link>
          <Link to="/teacher/attendance" className="admin-nav-link">
            <i className="fas fa-clipboard-list"></i> {t('components.nav.attendance')}
          </Link>
        </div>
        <div className="admin-nav-user">
          <LanguageSwitcher />
          <ThemeToggle />
          <span>{t('components.nav.welcome')}, {currentUser?.name || t('components.nav.teacher')}</span>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> {t('components.nav.logout')}
          </button>
        </div>
      </nav>

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-user-graduate dashboard-icon"></i>
          <h1>{t('pages.teacherDashboard.heading')}</h1>
        </div>
      </header>

      {/* Schedule Info Card */}
      <div className="schedule-card">
        <div className="card-header">
          <h3>{t('pages.teacherDashboard.workingHours')}</h3>
        </div>
        <div className="schedule-info">
          <div className="time-slot">
            <i className="fas fa-sign-in-alt"></i>
            <span>{t('pages.teacherDashboard.startTime')}: {teacherData?.workingHours?.startTime || '08:00'}</span>
          </div>
          <div className="time-slot">
            <i className="fas fa-sign-out-alt"></i>
            <span>{t('pages.teacherDashboard.endTime')}: {teacherData?.workingHours?.endTime || '16:00'}</span>
          </div>
          <div className="time-slot">
            <i className="fas fa-money-bill-wave"></i>
            <span>{t('pages.teacherDashboard.salary')}: Rs. {teacherData?.monthlySalary?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Current Time and Date */}
      <div className="current-time-card">
        <div className="time-display">
          <h2>{formattedTime}</h2>
          <p>{formattedDate}</p>
        </div>
      </div>

      {/* Recent Attendance Records */}
      <div className="recent-records">
        <div className="header-with-button">
          <h3>{t('pages.teacherDashboard.attendanceRecords')}</h3>
          <div className="button-group">
            <button onClick={handleAddAttendance} className="add-button">
              <i className="fas fa-plus"></i> {t('pages.teacherDashboard.markAttendance')}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.attendanceRecords.table.date')}</th>
                <th>{t('pages.teacherDashboard.day', 'Day')}</th>
                <th>{t('pages.attendanceRecords.table.status')}</th>
                <th>{t('pages.attendanceRecords.table.checkIn')}</th>
                <th>{t('pages.attendanceRecords.table.checkOut')}</th>
                <th>{t('pages.attendanceRecords.table.workingHours')}</th>
                <th>{t('pages.attendanceRecords.table.details')}</th>
                <th>{t('pages.attendanceRecords.table.deduction')}</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords && attendanceRecords.length > 0 ? (
                attendanceRecords.map((record, index) => (
                  <tr key={index}>
                    <td>{record.date}</td>
                    <td>{record.day || '-'}</td>
                    <td>
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
                    <td>{record.checkIn ? formatTime(record.checkIn) : '-'}</td>
                    <td>{record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                    <td>{record.workHours || '0.00'}</td>
                    <td>
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
                      </div>
                    </td>
                    <td>
                      {record.salaryDeduction > 0
                        ? `Rs. ${record.salaryDeduction.toFixed(2)}`
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-message">
                    <i className="fas fa-clipboard-list"></i> {t('pages.teacherDashboard.noAttendanceRecords', 'No attendance records found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - {t('app.title')}</p>
      </footer>
    </div>
  );
}

export default TeacherDashboard; 