import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher } from '../../services/firebase';
import { createUserAccount } from '../../services/firebase';
import '../../App.css';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Function to generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    designation: 'جونیئر استاد',
    monthlySalary: '',
    contactNumber: '',
    email: '',
    startTime: '08:00',
    endTime: '16:00'
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState('');
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Fetch teachers on component mount
  useEffect(() => {
    fetchTeachers();
  }, []);
  
  // Fetch teachers from Firebase
  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const teachersData = await getTeachers();
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Filter teachers based on search
  const filteredTeachers = teachers.filter((teacher) => {
    return teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           teacher.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (teacher.username && teacher.username.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Handle form change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Open modal for adding new teacher
  const handleAddTeacher = () => {
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({
      name: '',
      designation: 'جونیئر استاد',
      monthlySalary: '',
      contactNumber: '',
      email: '',
      startTime: '08:00',
      endTime: '16:00'
    });
    setIsModalOpen(true);
  };

  // Open modal for editing teacher
  const handleEditTeacher = (teacher) => {
    setIsEditMode(true);
    setCurrentEditId(teacher.id);
    setFormData({
      name: teacher.name,
      designation: teacher.designation,
      monthlySalary: teacher.monthlySalary,
      contactNumber: teacher.contactNumber,
      email: teacher.email,
      startTime: teacher.workingHours ? teacher.workingHours.startTime : '08:00',
      endTime: teacher.workingHours ? teacher.workingHours.endTime : '16:00'
    });
    setGeneratedUsername(teacher.username);
    setIsModalOpen(true);
  };

  // Handle teacher deletion
  const handleDeleteTeacher = async (id) => {
    if (window.confirm('کیا آپ واقعی اس استاد کو حذف کرنا چاہتے ہیں؟')) {
      setIsLoading(true);
      try {
        await deleteTeacher(id);
        setTeachers(prevTeachers => prevTeachers.filter(teacher => teacher.id !== id));
      } catch (error) {
        console.error('Error deleting teacher:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Create a safe username by handling any null values
      const teacherName = formData.name || '';
      const username = teacherName.toLowerCase().replace(/\s+/g, '.');
      
      // Safely convert monthlySalary to number
      let monthlySalary = 0;
      try {
        monthlySalary = formData.monthlySalary ? Number(formData.monthlySalary) : 0;
      } catch (error) {
        console.error('Error converting salary to number:', error);
      }
      
      const teacherData = {
        name: teacherName,
        username: username,
        designation: formData.designation || 'استاد',
        monthlySalary: monthlySalary,
        joiningDate: new Date().toLocaleDateString('ur-PK'),
        contactNumber: formData.contactNumber || '',
        email: formData.email || `${username}@hazrisystem.com`,
        workingHours: {
          startTime: formData.startTime || '08:00',
          endTime: formData.endTime || '16:00'
        }
      };
      
      if (isEditMode) {
        // Update existing teacher
        if (!currentEditId) {
          throw new Error('Teacher ID is missing for edit operation');
        }
        
        await updateTeacher(currentEditId, teacherData);
        
        setTeachers(prevTeachers => 
          prevTeachers.map(teacher => 
            teacher.id === currentEditId ? { ...teacher, ...teacherData, id: currentEditId } : teacher
          )
        );
        setIsModalOpen(false);
      } else {
        // Add new teacher with generated ID and password
        const newPassword = generatePassword();
        setGeneratedPassword(newPassword);
        
        try {
          // First create a Firebase Authentication account for the teacher
          const email = teacherData.email;
          console.log("Creating Firebase Authentication account with email:", email);
          
          try {
            // Create the authentication account
            await createUserAccount(email, newPassword);
            console.log("Firebase Authentication account created successfully");
          } catch (authError) {
            console.error('Error creating authentication account:', authError);
            // If the error is not because the account already exists, throw it
            if (authError.code !== 'auth/email-already-in-use') {
              throw new Error(`توثیقی اکاؤنٹ بنانے میں خرابی: ${authError.message}`);
            } else {
              console.log("User already exists in authentication, continuing with Firestore update");
            }
          }
          
          // Generate a unique ID
          const teacherId = username + Date.now().toString();
          console.log("Generated teacher ID:", teacherId);
          
          // Add teacher to Firestore
          console.log("Adding teacher to Firestore");
          
          // DIRECT FIRESTORE APPROACH - Use direct Firestore methods instead of our helper
          try {
            // Make sure the teachers collection exists
            const teachersRef = collection(db, 'teachers');
            
            // Add the document with explicit ID
            console.log("Adding teacher document with data");
            
            // Use direct setDoc call to Firestore
            await setDoc(doc(db, 'teachers', teacherId), {
            ...teacherData,
              password: newPassword,
              createdAt: new Date().toISOString()
          });
            
            console.log(`Teacher added with ID: ${teacherId} successfully`);
          
          const newTeacher = {
            id: teacherId,
            ...teacherData,
            password: newPassword
          };
          
          setTeachers(prevTeachers => [...prevTeachers, newTeacher]);
          setGeneratedUsername(username);
          
          // Show the credentials
            alert(`استاد کا اکاؤنٹ کامیابی سے بنا دیا گیا!\n\nصارف نام: ${username}\nای میل: ${teacherData.email}\nپاس ورڈ: ${newPassword}`);
            
            // Close the modal only
            setIsModalOpen(false);
            
            // Refresh the teachers list
            fetchTeachers();
          } catch (firestoreError) {
            console.error('Error writing to Firestore:', firestoreError);
            alert(`فائربیس میں استاد کا ڈیٹا شامل کرنے میں خرابی: ${firestoreError.message}`);
          }
        } catch (error) {
          console.error('Error in teacher creation process:', error);
          alert(`خطا: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error submitting teacher data:', error);
      alert(`خطا: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>برائے مہربانی انتظار کریں...</p>
        </div>
      )}
      
      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditMode ? 'استاد کی معلومات میں ترمیم' : 'نیا استاد شامل کریں'}</h2>
              <button 
                className="close-button" 
                onClick={() => setIsModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="teacher-form">
              <div className="form-group">
                <label htmlFor="name">مکمل نام:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                  placeholder="استاد کا مکمل نام"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="designation">عہدہ:</label>
                  <select
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  >
                    <option value="سینئر استاد">سینئر استاد</option>
                    <option value="جونیئر استاد">جونیئر استاد</option>
                    <option value="لیکچرار">لیکچرار</option>
                    <option value="اسسٹنٹ استاد">اسسٹنٹ استاد</option>
                    <option value="ٹیوٹر">ٹیوٹر</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="monthlySalary">ماہانہ تنخواہ:</label>
                  <input
                    type="number"
                    id="monthlySalary"
                    name="monthlySalary"
                    value={formData.monthlySalary}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="مثال: 50000"
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">آغاز کار:</label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="endTime">اختتام کار:</label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="contactNumber">رابطہ نمبر:</label>
                <input
                  type="text"
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  pattern="[0-9]+"
                  className="form-control"
                  placeholder="مثال: 03001234567"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">ای میل:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="مثال: name@example.com"
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setIsModalOpen(false)}>
                  منسوخ کریں
                </button>
                <button type="submit" className="submit-button">
                  {isEditMode ? 'تبدیلیاں محفوظ کریں' : 'محفوظ کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Navigation */}
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
            <i className="fas fa-chalkboard-teacher"></i> اساتذہ کا انتظام
          </Link>
          <Link to="/admin/attendance" className="admin-nav-link">
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
          <i className="fas fa-chalkboard-teacher dashboard-icon"></i>
          <h1>اساتذہ کا انتظام</h1>
        </div>
        <div className="filters">
          <div className="filter-group search-group">
            <label htmlFor="search"><i className="fas fa-search"></i> تلاش:</label>
            <input 
              type="text" 
              id="search" 
              placeholder="نام، عہدہ یا صارف نام سے تلاش کریں..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          <button className="add-teacher-button" onClick={handleAddTeacher}>
            <i className="fas fa-user-plus"></i> نیا استاد شامل کریں
          </button>
        </div>
      </header>

      {/* Teachers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>نام</th>
              <th>صارف نام</th>
              <th>عہدہ</th>
              <th>ماہانہ تنخواہ</th>
              <th>کام کے اوقات</th>
              <th>تاریخ شمولیت</th>
              <th>رابطہ نمبر</th>
              <th>ای میل</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <tr key={teacher?.id || Math.random()}>
                  <td>{teacher?.name || '-'}</td>
                  <td>{teacher?.username || '-'}</td>
                  <td>{teacher?.designation || '-'}</td>
                  <td>Rs. {teacher?.monthlySalary ? teacher.monthlySalary.toLocaleString() : '0'}</td>
                  <td>{teacher?.workingHours?.startTime || '-'} - {teacher?.workingHours?.endTime || '-'}</td>
                  <td>{teacher?.joiningDate || '-'}</td>
                  <td>{teacher?.contactNumber || '-'}</td>
                  <td>{teacher?.email || '-'}</td>
                  <td className="action-cell">
                    <Link to={`/admin/teacher/${encodeURIComponent(teacher?.id || '')}`} className="table-action view" onClick={(e) => {
                      // Add debug info
                      console.log("Navigating to teacher profile with ID:", teacher?.id);
                      if (!teacher?.id) {
                        e.preventDefault();
                        alert("استاد کی شناخت (ID) موجود نہیں ہے");
                      }
                    }}>
                      <i className="fas fa-eye"></i>
                    </Link>
                    <button className="table-action edit" onClick={() => handleEditTeacher(teacher)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="table-action delete" onClick={() => handleDeleteTeacher(teacher?.id)}>
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="empty-message">
                  <i className="fas fa-user-slash"></i> کوئی استاد موجود نہیں۔ نیا استاد شامل کرنے کے لیے "نیا استاد شامل کریں" بٹن پر کلک کریں
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

export default TeacherManagement; 