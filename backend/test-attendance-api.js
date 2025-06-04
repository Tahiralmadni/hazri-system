const fetch = require('node-fetch');

// Base URL for API
const API_URL = 'http://localhost:5000/api';
const TEACHER_ID = '683da22a54464d174c5a09de'; // Test Teacher ID

async function testTeacherAttendance() {
  try {
    console.log('Testing teacher attendance API...');
    
    // 1. Login first as test teacher
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testteacher',
        password: 'test123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.token) {
      console.error('Teacher login failed:', loginData);
      return;
    }
    
    console.log('Teacher login successful');
    const token = loginData.token;
    
    // 2. Try to fetch teacher attendance
    console.log(`Fetching attendance for teacher ID: ${TEACHER_ID}`);
    const response = await fetch(`${API_URL}/attendance/teacher/${TEACHER_ID}`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    const data = await response.json();
    console.log('API response:', data);
    console.log('Response status:', response.status);
    
    // 3. Try adding a sample attendance record
    console.log('Adding a sample attendance record...');
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const addResponse = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        date: today,
        status: 'present',
        timeIn: '09:00',
        timeOut: '17:00',
        comments: 'Test record',
        workHours: 8,
        salaryDeduction: 0
      })
    });
    
    const addData = await addResponse.json();
    console.log('Add attendance response:', addData);
    
    // 4. Try fetching attendance again
    console.log('Fetching attendance again after adding record...');
    const response2 = await fetch(`${API_URL}/attendance/teacher/${TEACHER_ID}`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    const data2 = await response2.json();
    console.log('API response after adding record:', data2);
    
  } catch (error) {
    console.error('Error testing attendance API:', error);
  }
}

testTeacherAttendance(); 