// Centralized configuration
const CONFIG = {
  SUPABASE_URL: 'https://ziidawfildpacymfddqh.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaWRhd2ZpbGRwYWN5bWZkZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM0NzQsImV4cCI6MjA2NTUwOTQ3NH0.AsyZJu6fcpvGDhHqak37q1LV4VDmfPvyDLDaU3b1tR4',
  POLLING_INTERVAL: 3000, // Reduced for better responsiveness
  DEFAULT_CENTER: [41.50, -81.60],
  DEFAULT_ZOOM: 13
};

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Utility functions
const Utils = {
  // Sanitize input
  sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
  },

  // Generate unique ID
  generateId() {
    return 'map_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  },

  // Show error message
  showError(message, container = document.body) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    if (container === document.body) {
      container.appendChild(errorDiv);
    } else {
      container.insertBefore(errorDiv, container.firstChild);
    }
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  },

  // Show success message
  showSuccess(message, container = document.body) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    if (container === document.body) {
      container.appendChild(successDiv);
    } else {
      container.insertBefore(successDiv, container.firstChild);
    }
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }
};
