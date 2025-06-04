const fetch = require('node-fetch');

// Base URL for API
const API_URL = 'http://localhost:5000/api';

// Test admin login
async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('Admin login response:', data);
    return data.token;
  } catch (error) {
    console.error('Admin login test failed:', error);
    return null;
  }
}

// Test adding a teacher
async function testAddTeacher(token) {
  try {
    console.log('Testing add teacher...');
    const response = await fetch(`${API_URL}/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        name: 'Test Teacher',
        username: 'testteacher',
        email: 'test@example.com',
        password: 'test123',
        phoneNumber: '1234567890',
        address: 'Test Address',
        joiningDate: new Date()
      })
    });
    
    const data = await response.json();
    console.log('Add teacher response:', data);
    return data.teacher?._id || data.teacher?.id;
  } catch (error) {
    console.error('Add teacher test failed:', error);
    return null;
  }
}

// Test getting all teachers
async function testGetTeachers(token) {
  try {
    console.log('Testing get all teachers...');
    const response = await fetch(`${API_URL}/teachers`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    const data = await response.json();
    console.log('Get teachers response:', data);
    return data.teachers;
  } catch (error) {
    console.error('Get teachers test failed:', error);
    return [];
  }
}

// Run all tests
async function runTests() {
  console.log('Starting API tests...');
  
  // Test admin login
  const token = await testAdminLogin();
  if (!token) {
    console.error('Admin login failed, aborting further tests');
    return;
  }
  
  // Test add teacher
  const teacherId = await testAddTeacher(token);
  if (!teacherId) {
    console.log('Add teacher failed or teacher already exists, continuing with other tests');
  }
  
  // Test get teachers
  const teachers = await testGetTeachers(token);
  if (teachers.length === 0) {
    console.log('No teachers found');
  }
  
  console.log('API tests completed');
}

// Run the tests
runTests().catch(console.error); 