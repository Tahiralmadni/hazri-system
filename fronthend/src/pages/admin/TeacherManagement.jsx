import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher } from '../../services/api';
import '../../App.css';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

// Function to format joining date
const formatJoiningDate = (dateString) => {
  if (!dateString) return '-';
  
  // Check if it's an ISO date string
  if (dateString.includes('T')) {
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return dateString;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }
  
  // Return the date string if it's already formatted
  return dateString;
};

// Function to generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Add auto-generate GR number function after the generatePassword function
// Function to generate a random 5-digit GR number
const generateGrNumber = () => {
  // Generate a random number between 10000 and 99999
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Add a function to check if a GR number already exists and generate a unique one
const generateUniqueGrNumber = async () => {
  try {
    // Fetch all teachers to check existing GR numbers
    const teachersData = await getTeachers();
    const existingGrNumbers = teachersData
      .map(teacher => teacher.grNumber)
      .filter(grNumber => grNumber); // Filter out null/undefined/empty
    
    let grNumber;
    let attempts = 0;
    const maxAttempts = 50;
    
    // Keep generating until we find a unique one or hit max attempts
    do {
      grNumber = generateGrNumber();
      attempts++;
      
      if (attempts > maxAttempts) {
        console.warn("Reached maximum attempts to generate unique GR number");
        break;
      }
    } while (existingGrNumbers.includes(grNumber));
    
    return grNumber;
  } catch (error) {
    console.error("Error generating unique GR number:", error);
    return generateGrNumber(); // Fallback to simple generation if error
  }
};

function TeacherManagement() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    designation: 'قاعدہ',
    jamiaType: '',
    grNumber: '',
    monthlySalary: 0,
    startTime: '08:00',
    endTime: '16:00',
    contactNumber: '',
    email: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState('');
  // Add states for multiple selection
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  // Add state for loading GR number
  const [isGeneratingGrNumber, setIsGeneratingGrNumber] = useState(false);
  // Add state to track if any teacher has Jamia designation
  const [hasJamiaTeachers, setHasJamiaTeachers] = useState(false);
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Fetch teachers on component mount
  useEffect(() => {
    fetchTeachers();
  }, []);
  
  // Set up event listener to refresh data when the tab becomes active again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible again, refreshing teacher data");
        fetchTeachers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Fetch teachers from Firebase
  const fetchTeachers = async () => {
    console.log("Fetching teachers...");
    setIsLoading(true);
    try {
      const teachersData = await getTeachers();
      console.log("Fetched teachers data:", teachersData);
      
      // Ensure consistent data format, particularly for salary
      const processedTeachers = teachersData.map(teacher => ({
        ...teacher,
        monthlySalary: teacher.monthlySalary ? Number(teacher.monthlySalary) : 0,
        designation: teacher.designation || 'قاعدہ',
        workingHours: teacher.workingHours || { startTime: '08:00', endTime: '16:00' }
      }));
      
      // Check if any teacher has Jamia designation
      const jamiaExists = processedTeachers.some(teacher => teacher.designation === 'جامعہ');
      setHasJamiaTeachers(jamiaExists);
      
      setTeachers(processedTeachers);
      console.log("Teachers state updated with:", processedTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update existing teachers with missing fields
  const fixExistingTeachers = async () => {
    try {
      console.log("Starting to fix existing teacher records...");
      setIsLoading(true);
      
      // First get all teachers
      const teachersData = await getTeachers();
      let fixedCount = 0;
      
      // Loop through each teacher and check for missing fields
      for (const teacher of teachersData) {
        let needsUpdate = false;
        const updates = {};
        
        // Check for missing monthlySalary
        if (teacher.monthlySalary === undefined || teacher.monthlySalary === null) {
          updates.monthlySalary = 0;
          needsUpdate = true;
        }
        
        // Check for missing designation
        if (!teacher.designation) {
          updates.designation = 'قاعدہ';
          needsUpdate = true;
        }
        
        // Check for missing contactNumber
        if (!teacher.contactNumber && teacher.phoneNumber) {
          updates.contactNumber = teacher.phoneNumber;
          needsUpdate = true;
        } else if (!teacher.contactNumber && !teacher.phoneNumber) {
          updates.contactNumber = '';
          updates.phoneNumber = '';
          needsUpdate = true;
        }
        
        // Check for missing workingHours
        if (!teacher.workingHours) {
          updates.workingHours = {
            startTime: '08:00',
            endTime: '16:00'
          };
          needsUpdate = true;
        }
        
        // If needs update, update the teacher
        if (needsUpdate) {
          console.log(`Updating teacher ${teacher.name} with:`, updates);
          await updateTeacher(teacher._id, { ...teacher, ...updates });
          fixedCount++;
        }
      }
      
      console.log(`Fixed ${fixedCount} teacher records`);
      
      // Refetch teachers after updates
      if (fixedCount > 0) {
        await fetchTeachers();
      }
      
      return fixedCount;
    } catch (error) {
      console.error('Error fixing teacher records:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run migration once when component mounts
  useEffect(() => {
    const runMigration = async () => {
      // Check localStorage to see if migration has been run already
      const migrationRun = localStorage.getItem('teacherMigrationRun');
      if (!migrationRun) {
        const count = await fixExistingTeachers();
        if (count > 0) {
          console.log(`Migration completed: ${count} teachers updated`);
        }
        localStorage.setItem('teacherMigrationRun', 'true');
      }
    };
    
    runMigration();
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
  const handleAddTeacher = async () => {
    setIsEditMode(false);
    setCurrentEditId(null);
    
    // Initialize with default values
    setFormData({
      name: '',
      designation: 'قاعدہ',
      jamiaType: '',
      grNumber: '',
      monthlySalary: 0,
      contactNumber: '',
      email: '',
      startTime: '08:00',
      endTime: '16:00'
    });
    
    setIsModalOpen(true);
    
    // Auto-generate a GR number by default
    try {
      setIsGeneratingGrNumber(true);
      const uniqueGrNumber = await generateUniqueGrNumber();
      setFormData(prev => ({
        ...prev,
        grNumber: uniqueGrNumber
      }));
    } catch (error) {
      console.error("Error auto-generating initial GR number:", error);
    } finally {
      setIsGeneratingGrNumber(false);
    }
  };

  // Edit teacher
  const handleEditTeacher = (teacher) => {
    if (!teacher) return;
    
    setCurrentEditId(teacher._id);
    setFormData({
      name: teacher.name || '',
      designation: teacher.designation || 'قاعدہ',
      jamiaType: teacher.jamiaType || '',
      grNumber: teacher.grNumber || '',
      monthlySalary: teacher.monthlySalary || 0,
      startTime: teacher.workingHours?.startTime || '08:00',
      endTime: teacher.workingHours?.endTime || '16:00',
      contactNumber: teacher.phoneNumber || teacher.contactNumber || '',
      email: teacher.email || '',
    });
    
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Delete teacher
  const handleDeleteTeacher = async (id) => {
    try {
      if (!id) {
        alert(t('pages.teacherManagement.errors.noId'));
        return;
      }
      
      const confirmDelete = window.confirm(t('pages.teacherManagement.confirmDelete'));
      if (!confirmDelete) return;
      
      setIsLoading(true);
      
      const result = await deleteTeacher(id);
      if (result) {
        setTeachers(teachers.filter(teacher => teacher._id !== id));
        alert(t('pages.teacherManagement.deleteSuccess'));
      } else {
        throw new Error(t('pages.teacherManagement.errors.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
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
        monthlySalary = formData.monthlySalary ? parseInt(formData.monthlySalary, 10) : 0;
        if (isNaN(monthlySalary)) monthlySalary = 0;
      } catch (error) {
        console.error('Error converting salary to number:', error);
      }

      // Validate GR number if provided - must be exactly 5 digits
      if (formData.grNumber && formData.grNumber.length !== 5) {
        setIsLoading(false);
        return alert('GR Number must be exactly 5 digits');
      }
      
      const teacherData = {
        name: teacherName,
        username: username,
        grNumber: formData.grNumber || '',
        designation: formData.designation || 'قاعدہ',
        monthlySalary: monthlySalary,
        joiningDate: new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}),
        contactNumber: formData.contactNumber || '',
        phoneNumber: formData.contactNumber || '',
        email: formData.email || `${username}@hazrisystem.com`,
        workingHours: {
          startTime: formData.startTime || '08:00',
          endTime: formData.endTime || '16:00'
        }
      };
      
      // Add Jamia type if applicable
      if (formData.designation === 'جامعہ' && formData.jamiaType) {
        teacherData.jamiaType = formData.jamiaType;
      }
      
      console.log("Form data before submission:", {
        salary: monthlySalary,
        contact: formData.contactNumber,
        designation: formData.designation
      });
      
      if (isEditMode) {
        // Update existing teacher
        if (!currentEditId) {
          throw new Error('Teacher ID is missing for edit operation');
        }
        
        console.log(`Updating teacher with ID: ${currentEditId}`);
        
        // For updates, make sure to keep the existing password
        // Get the existing teacher data to get the password
        const existingTeachers = await getTeachers();
        const existingTeacher = existingTeachers.find(t => t._id === currentEditId);
        
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
        
        // Ensure the updated data in state has the proper numeric type for monthlySalary
        setTeachers(prevTeachers => 
          prevTeachers.map(teacher => 
            teacher._id === currentEditId ? { 
              ...teacher, 
              ...teacherData, 
              _id: currentEditId,
              monthlySalary: Number(teacherData.monthlySalary)
            } : teacher
          )
        );
        console.log("Updated teacher in state with salary:", Number(teacherData.monthlySalary));
        setIsModalOpen(false);
      } else {
        // Add new teacher with generated password
        const newPassword = generatePassword();
        setGeneratedPassword(newPassword);
        setGeneratedUsername(username);
        
        // Add password to teacher data
        teacherData.password = newPassword;
        teacherData.plainPassword = newPassword;
        
        try {
          // Use the API to add a new teacher
          const result = await addTeacher(teacherData);
          console.log("Teacher added successfully:", result);
          
          if (result) {
            // Add the new teacher to the state
            const newTeacher = {
              ...result,
              ...teacherData,
              monthlySalary: Number(teacherData.monthlySalary)
            };
            
            setTeachers(prevTeachers => [...prevTeachers, newTeacher]);
            console.log("Added new teacher to state with salary:", Number(teacherData.monthlySalary));
            
            // Show success message
            alert(`استاد کا اکاؤنٹ کامیابی سے بنا دیا گیا!\n\nصارف نام: ${username}\nپاس ورڈ: ${newPassword}`);
            
            // Close the modal
            setIsModalOpen(false);
            
            // Refresh the teachers list
            fetchTeachers();
          }
        } catch (error) {
          console.error('Error creating teacher:', error);
          alert(`خطا: ${error.message || 'Unknown error occurred'}`);
        }
      }
    } catch (error) {
      console.error('Error submitting teacher data:', error);
      alert(`خطا: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle select all checkbox change
  const handleSelectAll = () => {
    const newSelectAllValue = !selectAll;
    setSelectAll(newSelectAllValue);
    
    if (newSelectAllValue) {
      // Select all filtered teachers
      const selectedIds = filteredTeachers.map(teacher => teacher._id);
      setSelectedTeachers(selectedIds);
    } else {
      // Deselect all
      setSelectedTeachers([]);
    }
  };
  
  // Handle individual checkbox change
  const handleSelectTeacher = (teacherId) => {
    if (selectedTeachers.includes(teacherId)) {
      // Remove from selection
      setSelectedTeachers(selectedTeachers.filter(id => id !== teacherId));
      setSelectAll(false);
    } else {
      // Add to selection
      setSelectedTeachers([...selectedTeachers, teacherId]);
      
      // Check if all filtered teachers are now selected
      if (selectedTeachers.length + 1 === filteredTeachers.length) {
        setSelectAll(true);
      }
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedTeachers.length === 0) {
      alert(t('pages.teacherManagement.errors.noSelection', 'No teachers selected'));
      return;
    }
    
    const confirmDelete = window.confirm(
      t('pages.teacherManagement.confirmBulkDelete', 
        `Are you sure you want to delete ${selectedTeachers.length} selected teachers?`)
    );
    
    if (!confirmDelete) return;
    
    setIsLoading(true);
    
    try {
      let failedCount = 0;
      
      // Delete each selected teacher
      for (const id of selectedTeachers) {
        try {
          await deleteTeacher(id);
        } catch (error) {
          console.error(`Error deleting teacher ${id}:`, error);
          failedCount++;
        }
      }
      
      // Refresh teacher list
      await fetchTeachers();
      
      // Reset selection
      setSelectedTeachers([]);
      setSelectAll(false);
      
      if (failedCount > 0) {
        alert(`${selectedTeachers.length - failedCount} teachers deleted successfully. ${failedCount} deletions failed.`);
      } else {
        alert(`${selectedTeachers.length} teachers deleted successfully.`);
      }
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      alert(error.message || t('pages.teacherManagement.errors.bulkDeleteError', 'Error deleting teachers'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auto-generate GR number
  const handleAutoGenerateGrNumber = async () => {
    setIsGeneratingGrNumber(true);
    try {
      const uniqueGrNumber = await generateUniqueGrNumber();
      setFormData(prev => ({
        ...prev,
        grNumber: uniqueGrNumber
      }));
    } catch (error) {
      console.error("Error auto-generating GR number:", error);
    } finally {
      setIsGeneratingGrNumber(false);
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

              <div className="form-group">
                <label htmlFor="grNumber">GR Number (5 digits):</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    id="grNumber"
                    name="grNumber"
                    value={formData.grNumber}
                    onChange={handleInputChange}
                    maxLength="5"
                    pattern="[0-9]{5}"
                    className="form-control"
                    placeholder="12345"
                    title="GR Number must be exactly 5 digits"
                  />
                  <button 
                    type="button" 
                    className="auto-generate-button"
                    onClick={handleAutoGenerateGrNumber}
                    disabled={isGeneratingGrNumber}
                    title="Auto-generate unique GR number"
                  >
                    {isGeneratingGrNumber ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-magic"></i>
                    )}
                  </button>
                </div>
                <small className="form-text text-muted">Click the magic wand button to auto-generate a unique GR number</small>
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
                    <option value="قاعدہ">قاعدہ</option>
                    <option value="ناظرہ">ناظرہ</option>
                    <option value="حفظ">حفظ</option>
                    <option value="جامعہ">جامعہ</option>
                  </select>
                </div>
                
                {formData.designation === 'جامعہ' && (
                  <div className="form-group">
                    <label htmlFor="jamiaType">جامعہ کی قسم:</label>
                    <select
                      id="jamiaType"
                      name="jamiaType"
                      value={formData.jamiaType}
                      onChange={handleInputChange}
                      required={formData.designation === 'جامعہ'}
                      className="form-control"
                    >
                      <option value="">انتخاب کریں</option>
                      <option value="عالم">عالم</option>
                      <option value="مفتی">مفتی</option>
                    </select>
                  </div>
                )}
                
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
          <button className="repair-button" onClick={() => fixExistingTeachers()} title="Fix any missing teacher data like salary, contact, etc.">
            <i className="fas fa-tools"></i> {t('Fix Data', 'Fix Data')}
          </button>
          {selectedTeachers.length > 0 && (
            <button className="delete-selected-button" onClick={handleBulkDelete}>
              <i className="fas fa-trash-alt"></i> {t('pages.teacherManagement.deleteSelected', 'Delete Selected')} ({selectedTeachers.length})
            </button>
          )}
        </div>
      </header>

      {/* Teachers Table */}
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
                  title={selectAll ? t('pages.teacherManagement.deselectAll', 'Deselect All') : t('pages.teacherManagement.selectAll', 'Select All')}
                />
              </th>
              <th>{t('pages.teacherManagement.table.name')}</th>
              <th>GR Number</th>
              <th>{t('pages.teacherManagement.table.username')}</th>
              <th>{t('pages.teacherManagement.table.designation')}</th>
              {hasJamiaTeachers && <th>جامعہ کی قسم</th>}
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
                  <td className="checkbox-column">
                    <input 
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher?._id)}
                      onChange={() => handleSelectTeacher(teacher?._id)}
                      className="select-checkbox"
                    />
                  </td>
                  <td>{teacher?.name || '-'}</td>
                  <td>{teacher?.grNumber || 'Not Assigned'}</td>
                  <td>{teacher?.username || '-'}</td>
                  <td>{teacher?.designation || '-'}</td>
                  {hasJamiaTeachers && <td>{teacher?.designation === 'جامعہ' ? teacher?.jamiaType || '-' : '-'}</td>}
                  <td>Rs. {(teacher?.monthlySalary !== undefined && teacher?.monthlySalary !== null) ? 
                    Number(teacher.monthlySalary).toLocaleString() : '0'}</td>
                  <td>
                    {teacher?.workingHours?.startTime && teacher?.workingHours?.endTime 
                      ? `${teacher.workingHours.startTime} - ${teacher.workingHours.endTime}`
                      : '-'}
                  </td>
                  <td>{formatJoiningDate(teacher?.joiningDate)}</td>
                  <td>{teacher?.contactNumber || '-'}</td>
                  <td>{teacher?.email || '-'}</td>
                  <td className="action-cell">
                    <Link to={`/admin/teacher/${encodeURIComponent(teacher?._id || '')}`} className="table-action view" onClick={(e) => {
                      console.log("Navigating to teacher profile with ID:", teacher?._id);
                      if (!teacher?._id) {
                        e.preventDefault();
                        alert(t('pages.teacherManagement.errors.noId'));
                      }
                    }}>
                      <i className="fas fa-eye"></i>
                    </Link>
                    <button className="table-action edit" onClick={() => handleEditTeacher(teacher)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="table-action delete" onClick={() => handleDeleteTeacher(teacher?._id)}>
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty-message">
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