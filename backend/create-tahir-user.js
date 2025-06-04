const fetch = require('node-fetch');

// Base URL for API
const API_URL = 'http://localhost:5000/api';

async function createTahirUser() {
  try {
    console.log('Logging in as admin...');
    // Login as admin
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.token) {
      console.error('Admin login failed');
      return;
    }
    
    console.log('Admin login successful, adding tahir user...');
    const token = loginData.token;
    
    // Create tahir user
    const createResponse = await fetch(`${API_URL}/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        name: 'Tahir',
        username: 'tahir',
        email: 'tahir@example.com',
        password: 'tahir123',
        phoneNumber: '1234567890',
        address: 'Tahir Address',
        joiningDate: new Date()
      })
    });
    
    const createData = await createResponse.json();
    console.log('Tahir user creation result:', createData);
    
  } catch (error) {
    console.error('Error creating tahir user:', error);
  }
}

createTahirUser(); 