import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher } from '../../services/firebase';
import { createUserAccount } from '../../services/firebase';
import '../../App.css';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

// Function to generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
  zzzxzx6//'/;l]\;l;ll.,vg
};

function TeacherManagement() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    designation: t('pages.teacherManagement.defaultDesignation', 'جونیئر استاد'),
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
      designation: t('pages.teacherManagement.defaultDesignation', 'جونیئر استاد'),
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
    if (window.confirm(t('pages.teacherManagement.confirmDelete', 'کیا آپ واقعی اس استاد کو حذف کرنا چاہتے ہیں؟'))) {
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
      // Create a more consistent username by removing spaces and special characters
      const username = teacherName.toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^\w.]/g, '')
        .trim();
      
      console.log(`Generated username: ${username} from name: ${teacherName}`);
      
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
        
        console.log(`Updating teacher with ID: ${currentEditId}`);
        
        // For updates, make sure to keep the existing password
        // Get the existing teacher data to get the password
        const existingTeachers = await getTeachers();
        const existingTeacher = existingTeachers.find(t => t.id === currentEditId);
        
        if (existingTeacher && existingTeacher.password) {
          console.log("Found existing password, preserving it in update");
          teacherData.password = existingTeacher.password;
        } else {
          console.log("No existing password found, generating new one");
          const newPassword = generatePassword();
          teacherData.password = newPassword;
          setGeneratedPassword(newPassword);
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
          const email = teacherData.email || `${username}@hazrisystem.com`;
          console.log("Creating teacher with email:", email);
          console.log("Generated password:", newPassword);
          
          // Save the password in teacherData for Firestore
          teacherData.password = newPassword;
          
          // Generate a unique ID that will be consistent
          const teacherId = username + Date.now().toString();
          console.log("Generated teacher ID:", teacherId);

          // Try to create Firebase Authentication account
          try {
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
          
          // Now add teacher to Firestore with the same password
          try {
            // Make sure the teachers collection exists
            const teachersRef = collection(db, 'teachers');
            
            // Add the document with explicit ID
            console.log("Adding teacher document with data");
            
            // Use direct setDoc call to Firestore
            await setDoc(doc(db, 'teachers', teacherId), {
              ...teacherData,
              password: newPassword, // Ensure password is included
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
            alert(`استاد کا اکاؤنٹ کامیابی سے بنا دیا گیا!\n\nصارف نام: ${username}\nای میل: ${email}\nپاس ورڈ: ${newPassword}`);
            
            // Close the modal
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
      <Helmet>
        <title>{t('pages.teacherManagement.title')}</title>
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
      
      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditMode ? t('pages.teacherManagement.editTeacher') : t('pages.teacherManagement.addTeacher')}</h2>
              <button 
                className="close-button" 
                onClick={() => setIsModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="teacher-form">
              <div className="form-group">
                <label htmlFor="name">{t('pages.teacherManagement.form.name')}:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                  placeholder={t('pages.teacherManagement.form.namePlaceholder')}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="designation">{t('pages.teacherManagement.form.designation')}:</label>
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
                  <label htmlFor="monthlySalary">{t('pages.teacherManagement.form.salary')}:</label>
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
                  <label htmlFor="startTime">{t('pages.teacherManagement.form.startTime')}:</label>
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
                  <label htmlFor="endTime">{t('pages.teacherManagement.form.endTime')}:</label>
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
                <label htmlFor="contactNumber">{t('pages.teacherManagement.form.contact')}:</label>
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
                <label htmlFor="email">{t('pages.teacherManagement.form.email')}:</label>
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
                  {t('components.form.cancel')}
                </button>
                <button type="submit" className="submit-button">
                  {t('components.form.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Page Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-chalkboard-teacher dashboard-icon"></i>
          <h1>{t('pages.teacherManagement.heading')}</h1>
        </div>
        <div className="filters">
          <div className="filter-group search-group">
            <label htmlFor="search"><i className="fas fa-search"></i> {t('pages.teacherManagement.searchTeacher')}:</label>
            <input 
              type="text" 
              id="search" 
              placeholder={t('pages.teacherManagement.searchPlaceholder')} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          <button className="add-teacher-button" onClick={handleAddTeacher}>
            <i className="fas fa-user-plus"></i> {t('pages.teacherManagement.addTeacher')}
          </button>
        </div>
      </header>

      {/* Teachers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('pages.teacherManagement.table.name')}</th>
              <th>{t('pages.teacherManagement.table.username')}</th>
              <th>{t('pages.teacherManagement.table.designation')}</th>
              <th>{t('pages.teacherManagement.table.salary')}</th>
              <th>{t('pages.teacherManagement.table.workingHours')}</th>
              <th>{t('pages.teacherManagement.table.joinDate')}</th>
              <th>{t('pages.teacherManagement.table.contact')}</th>
              <th>{t('pages.teacherManagement.table.email')}</th>
              <th>{t('pages.teacherManagement.table.actions')}</th>
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
                      console.log("Navigating to teacher profile with ID:", teacher?.id);
                      if (!teacher?.id) {
                        e.preventDefault();
                        alert(t('pages.teacherManagement.errors.noId'));
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
                  <i className="fas fa-user-slash"></i> {t('pages.teacherManagement.noTeachersFound')}
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

export default TeacherManagement; 