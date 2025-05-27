import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addAttendanceRecord, getTeacher, getTeacherAttendance, getTeacherAttendanceSimple, getTeachers, debugGetAllAttendance } from '../../services/firebase';
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
  const checkInMinutes = timeToMinutes(checkIn);
  const checkOutMinutes = timeToMinutes(checkOut);
  return ((checkOutMinutes - checkInMinutes) / 60).toFixed(2);
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
      console.log("Starting to load teacher data...");
      setIsLoading(true);
      setLoadingError(null);

      // Add a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
        setLoadingError("لوڈنگ ٹائم آؤٹ - براہ کرم صفحہ ریفریش کریں");
        console.error('Loading timeout reached - forcing loading state to complete');
        // Force redirect to login on timeout
        logout().then(() => navigate('/login'));
      }, 30000); // 30 seconds timeout

      try {
        if (!currentUser || !currentUser.id) {
          console.error('No valid current user available:', currentUser);
          setErrorState(true);
          throw new Error("صارف کی معلومات دستیاب نہیں ہیں۔");
        }

        // Debug current user info
        console.log("Current user data:", JSON.stringify(currentUser));
        console.log("Fetching teacher data with ID:", currentUser.id);

        try {
          // Force login refresh
          const storedUser = JSON.parse(localStorage.getItem('currentUser'));
          if (storedUser) {
            console.log("Stored user from localStorage:", JSON.stringify(storedUser));
          }
        } catch (e) {
          console.error("Error reading localStorage:", e);
        }

        // Try to list all teachers first
        try {
          const allTeachers = await getTeachers();
          console.log("Found teachers in database:",
            allTeachers.map(t => ({ id: t.id, name: t.name, username: t.username })));

          // Check if current teacher's ID exists in the list
          const teacherExists = allTeachers.some(t => t.id === currentUser.id);
          console.log(`Current teacher ID ${currentUser.id} exists in teachers list: ${teacherExists}`);

          // Try to find teacher by username if ID doesn't match
          if (!teacherExists) {
            const matchByUsername = allTeachers.find(t => t.username === currentUser.username);
            if (matchByUsername) {
              console.log("Found teacher by username instead of ID:", matchByUsername.id);
              // Update localStorage with correct ID
              const updatedUser = {...currentUser, id: matchByUsername.id};
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
              window.location.reload(); // Force reload to use new ID
              return;
            }
          }
        } catch (listError) {
          console.error("Error listing teachers:", listError);
        }

        // Load teacher data
        const teacher = await getTeacher(currentUser.id);

        if (!teacher) {
          console.error('Teacher data not found for ID:', currentUser.id);
          setErrorState(true);
          throw new Error("استاد کی معلومات نہیں ملی۔");
        }

        console.log("Teacher data loaded successfully:", teacher);
        setTeacherData(teacher);

        // Load attendance records with reliable method
        console.log("Fetching attendance records for teacher ID:", currentUser.id);
        const records = await getTeacherAttendance(currentUser.id);

        if (Array.isArray(records)) {
          console.log(`Successfully loaded ${records.length} attendance records`);
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
          console.error('Received invalid attendance records:', records);
          setAttendanceRecords([]);
        }
      } catch (error) {
        console.error('Error loading teacher data:', error);
        setErrorState(true);
        setLoadingError(error.message || "ڈیٹا لوڈ کرنے میں نامعلوم خرابی ہوئی ہے۔"); // Set specific error message
      } finally {
        clearTimeout(loadingTimeout); // Clear the timeout
        setIsLoading(false);
      }
    };

    loadTeacherData();
  }, [currentUser, today, refreshKey]);

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
        ? (formData.notes || 'چھٹی لی گئی')
        : formData.notes;

      // Create attendance record
      const attendanceData = {
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        date: formData.date,
        status: formData.status,
        checkIn: formData.status === 'present' ? formData.checkIn : null,
        checkOut: formData.status === 'present' ? formData.checkOut : null,
        workHours: formData.status === 'present' ? workHours : 0,
        isLate: isLate,
        isShortDay: isEarly,
        salaryDeduction: Number(salaryDeduction.toFixed(2)),  // Convert to number with 2 decimal places
        notes: leaveNote,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase
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
        alert('حاضری کامیابی سے درج ہو گئی ہے');

        // Force a re-fetch of attendance data to ensure UI is updated
        setTimeout(() => {
          setRefreshKey(oldKey => oldKey + 1);
        }, 500);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('حاضری جمع کرانے میں خرابی آگئی ہے۔ براہ کرم دوبارہ کوشش کریں۔');
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to check attendance data
  const handleDebugAttendance = async () => {
    console.log("=== DEBUG ATTENDANCE DATA ===");
    console.log("Current User:", JSON.stringify(currentUser));
    console.log("Teacher Data:", JSON.stringify(teacherData));
    console.log("Current attendance records:", attendanceRecords.length);

    try {
      // Get all attendance records to see what's in the database
      const allRecords = await debugGetAllAttendance();
      console.log("All attendance records in database:", allRecords.length);

      // Re-fetch attendance data for this teacher
      const freshRecords = await getTeacherAttendance(currentUser.id);
      console.log("Fresh attendance records:", freshRecords.length);
      console.log("Fresh records data:", JSON.stringify(freshRecords));

      // Update state with fresh data
      setAttendanceRecords(freshRecords);

      // Show detailed alert with debug info
      const debugMessage = `
Debug Information:
- Teacher ID: ${currentUser.id}
- Teacher Name: ${currentUser.name}
- Records Found: ${freshRecords.length}
- Total Records in DB: ${allRecords.length}
- Teacher Exists: ${teacherData ? 'Yes' : 'No'}

Check browser console for detailed logs.
      `;

      alert(debugMessage);
    } catch (error) {
      console.error("Debug error:", error);
      alert("Debug error: " + error.message);
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
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{loadingError || 'برائے مہربانی انتظار کریں...'}</p>
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

      {/* Add Attendance Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>حاضری درج کریں</h2>
              <button
                className="close-button"
                onClick={() => setIsAddModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAttendanceSubmit} className="attendance-form">
              <div className="form-group">
                <label htmlFor="date">تاریخ:</label>
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
                <label htmlFor="status">حاضری کی حالت:</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="present">حاضر</option>
                  <option value="leave">چھٹی</option>
                  <option value="absent">غیر حاضر</option>
                </select>
              </div>

              {formData.status === 'present' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="checkIn">چیک ان:</label>
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
                      <label htmlFor="checkOut">چیک آؤٹ:</label>
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
                      <div className="info-label">کام کے گھنٹے:</div>
                      <div className="info-value">
                        {calculateWorkHours(formData.checkIn, formData.checkOut)} گھنٹے
                      </div>
                    </div>
                  )}
                </>
              )}

              {(formData.status === 'leave' || formData.status === 'absent') && (
                <div className="form-group info-box warning">
                  <div className="info-label">تنخواہ میں کٹوتی:</div>
                  <div className="info-value">
                    Rs. {calculateSalaryDeduction(formData.status, teacherData?.monthlySalary || 0, formData.checkIn, teacherData?.workingHours?.startTime || '08:00').toFixed(2)}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="notes">نوٹ:</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="کوئی اضافی معلومات..."
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setIsAddModalOpen(false)}>
                  منسوخ کریں
                </button>
                <button type="submit" className="submit-button">
                  <i className="fas fa-save"></i> محفوظ کریں
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
          <span>حاضری نظام</span>
        </div>
        <div className="admin-nav-menu">
          <Link to="/teacher" className="admin-nav-link active">
            <i className="fas fa-tachometer-alt"></i> ڈیش بورڈ
          </Link>
          <Link to="/teacher/attendance" className="admin-nav-link">
            <i className="fas fa-clipboard-list"></i> حاضری ریکارڈ
          </Link>
          <Link to="/teacher/debug" className="admin-nav-link">
            <i className="fas fa-bug"></i> ڈیٹا مرمت
          </Link>
        </div>
        <div className="admin-nav-user">
          <span>خوش آمدید، {currentUser?.name || 'استاد'}</span>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> لاگ آؤٹ
          </button>
        </div>
      </nav>

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-user-graduate dashboard-icon"></i>
          <h1>استاد کا ڈیش بورڈ</h1>
        </div>
      </header>

      {/* Schedule Info Card */}
      <div className="schedule-card">
        <div className="card-header">
          <h3>آپ کے کام کے اوقات</h3>
        </div>
        <div className="schedule-info">
          <div className="time-slot">
            <i className="fas fa-sign-in-alt"></i>
            <span>آغاز کار: {teacherData?.workingHours?.startTime || '08:00'}</span>
          </div>
          <div className="time-slot">
            <i className="fas fa-sign-out-alt"></i>
            <span>اختتام کار: {teacherData?.workingHours?.endTime || '16:00'}</span>
          </div>
          <div className="time-slot">
            <i className="fas fa-money-bill-wave"></i>
            <span>ماہانہ تنخواہ: Rs. {teacherData?.monthlySalary?.toLocaleString() || '0'}</span>
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
          <h3>حاضری ریکارڈ</h3>
          <div className="button-group">
            <button onClick={handleDebugAttendance} className="debug-button" style={{marginRight: '10px', backgroundColor: '#ff6b6b'}}>
              <i className="fas fa-bug"></i> ڈیبگ
            </button>
            <button onClick={handleAddAttendance} className="add-button">
              <i className="fas fa-plus"></i> نئی حاضری درج کریں
            </button>
          </div>
        </div>

        <div className="table-container">
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
              {attendanceRecords && attendanceRecords.length > 0 ? (
                attendanceRecords.map((record, index) => (
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
                    <td>
                      {record.salaryDeduction > 0
                        ? `Rs. ${record.salaryDeduction.toFixed(2)}`
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-message">
                    <i className="fas fa-clipboard-list"></i> حاضری کا کوئی ریکارڈ موجود نہیں
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} - حاضری نظام - دارالافتا</p>
      </footer>
    </div>
  );
}

export default TeacherDashboard;
