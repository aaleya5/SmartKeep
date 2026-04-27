// Authentication service
import apiClient from './api';

const TOKEN_KEY = 'smartkeep_auth_token';
const USER_KEY = 'smartkeep_user';

export const authService = {
  // Login
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      // Store token and user
      localStorage.setItem(TOKEN_KEY, access_token);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      
      // Set token in axios client for future requests
      apiClient.defaults.headers.common['Authorization'] = \Bearer \;
      
      return { success: true, token: access_token, user: user || response.data };
    } catch (err) {
      console.error('Login failed:', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Login failed' 
      };
    }
  },

  // Register
  async register(email, password) {
    try {
      const response = await apiClient.post('/auth/register', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem(TOKEN_KEY, access_token);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      apiClient.defaults.headers.common['Authorization'] = \Bearer \;
      
      return { success: true, token: access_token, user: user || response.data };
    } catch (err) {
      console.error('Registration failed:', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Registration failed' 
      };
    }
  },

  // Logout
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
  },

  // Get current token
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Get current user
  getUser() {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if logged in
  isAuthenticated() {
    return !!this.getToken();
  },

  // Initialize auth from localStorage
  initializeAuth() {
    const token = this.getToken();
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = \Bearer \;
    }
  }
};

export default authService;
