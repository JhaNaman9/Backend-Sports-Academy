const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// Admin credentials
const ADMIN_EMAIL = 'admin@sportsacademy.com';
const ADMIN_PASSWORD = 'Admin@123';

// Store the token
let accessToken = null;

/**
 * Login as admin and store the token
 * @returns {Promise<String>} The access token
 */
async function loginAsAdmin() {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (response.data && response.data.data && response.data.data.accessToken) {
      accessToken = response.data.data.accessToken;
      console.log('Admin login successful!');
      return accessToken;
    } else {
      throw new Error('Failed to get access token from login response');
    }
  } catch (error) {
    console.error('Error logging in as admin:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get the admin access token - will login if not already logged in
 * @returns {Promise<String>} The access token
 */
async function getAdminToken() {
  if (!accessToken) {
    return await loginAsAdmin();
  }
  return accessToken;
}

/**
 * Make an authenticated API request as admin
 * @param {String} method - HTTP method (GET, POST, etc.)
 * @param {String} endpoint - API endpoint (without base URL)
 * @param {Object} data - Request data (for POST, PUT, etc.)
 * @returns {Promise<Object>} API response
 */
async function adminRequest(method, endpoint, data = null) {
  try {
    const token = await getAdminToken();
    
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    // If token is expired or invalid, try to login again once
    if (error.response && error.response.status === 401) {
      console.log('Token might be expired, logging in again...');
      accessToken = null;
      const token = await getAdminToken();
      
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    }
    
    console.error('API request failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Helper methods for common operations
 */
const adminApi = {
  // Students
  getAllStudents: async () => adminRequest('GET', '/students'),
  createStudent: async (data) => adminRequest('POST', '/students', data),
  
  // Coaches
  getAllCoaches: async () => adminRequest('GET', '/coaches'),
  createCoach: async (data) => adminRequest('POST', '/coaches', data),
  
  // Tournaments
  getAllTournaments: async () => adminRequest('GET', '/tournaments'),
  createTournament: async (data) => adminRequest('POST', '/tournaments', data),
  
  // Subscriptions
  getAllPlans: async () => adminRequest('GET', '/subscriptions/plans'),
  createPlan: async (data) => adminRequest('POST', '/subscriptions/plans', data),
  
  // Reports
  getDashboardSummary: async () => adminRequest('GET', '/reports/dashboard/summary'),
  
  // Content
  createAnnouncement: async (data) => adminRequest('POST', '/content/announcements', data),
};

// Example usage
async function main() {
  try {
    // Get all students
    const students = await adminApi.getAllStudents();
    console.log('Students:', students.data.students);
    
    // Get dashboard summary
    const dashboard = await adminApi.getDashboardSummary();
    console.log('Dashboard Summary:', dashboard.data);
  } catch (error) {
    console.error('Error in main:', error.message);
  }
}

// If run directly, execute the main function
if (require.main === module) {
  main();
}

module.exports = adminApi; 