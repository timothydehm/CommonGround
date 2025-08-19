// create.js

// Configuration
const CONFIG = {
  SUPABASE_URL: 'https://ziidawfildpacymfddqh.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaWRhd2ZpbGRwYWN5bWZkZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM0NzQsImV4cCI6MjA2NTUwOTQ3NH0.AsyZJu6fcpvGDhHqak37q1LV4VDmfPvyDLDaU3b1tR4'
};

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Form validation
function validateForm() {
  const title = document.getElementById('mapTitle').value.trim();
  const prompt = document.getElementById('mapPrompt').value.trim();
  const fileInput = document.getElementById('geojsonFile');
  const file = fileInput.files[0];

  if (!title) {
    showError('Please enter a map title');
    return false;
  }

  if (!prompt) {
    showError('Please enter a prompt/instructions');
    return false;
  }

  if (!file) {
    showError('Please select a GeoJSON file');
    return false;
  }

  if (!file.name.toLowerCase().endsWith('.geojson')) {
    showError('Please select a valid GeoJSON file');
    return false;
  }

  return { title, prompt, file };
}

// Parse GeoJSON file
async function parseGeoJSONFile(file) {
  try {
    const text = await file.text();
    const geojson = JSON.parse(text);
    
    // Basic validation
    if (!geojson.type || geojson.type !== 'FeatureCollection') {
      throw new Error('Invalid GeoJSON: Must be a FeatureCollection');
    }
    
    if (!geojson.features || !Array.isArray(geojson.features)) {
      throw new Error('Invalid GeoJSON: Must have features array');
    }
    
    if (geojson.features.length === 0) {
      throw new Error('Invalid GeoJSON: Must have at least one feature');
    }
    
    return geojson;
  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

// Generate unique map ID
function generateMapId() {
  return 'map_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Save map to Supabase
async function saveMapToSupabase(mapData) {
  const { data, error } = await supabaseClient
    .from('maps')
    .insert(mapData)
    .select();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

// Show error message
function showError(message) {
  // Remove existing error messages
  const existingErrors = document.querySelectorAll('.error');
  existingErrors.forEach(error => error.remove());

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message;
  
  const form = document.getElementById('mapForm');
  form.insertBefore(errorDiv, form.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Show success message
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success';
  successDiv.textContent = message;
  
  const form = document.getElementById('mapForm');
  form.insertBefore(successDiv, form.firstChild);
  
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

// Set form loading state
function setFormLoading(loading) {
  const submitBtn = document.querySelector('button[type="submit"]');
  const inputs = document.querySelectorAll('input, textarea');
  
  if (loading) {
    submitBtn.textContent = 'Creating Map...';
    submitBtn.disabled = true;
    inputs.forEach(input => input.disabled = true);
    document.body.classList.add('loading');
  } else {
    submitBtn.textContent = 'Create Map';
    submitBtn.disabled = false;
    inputs.forEach(input => input.disabled = false);
    document.body.classList.remove('loading');
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  try {
    // Validate form
    const formData = validateForm();
    if (!formData) return;
    
    const { title, prompt, file } = formData;
    
    // Set loading state
    setFormLoading(true);
    
    // Parse GeoJSON file
    const geojson = await parseGeoJSONFile(file);
    
    // Generate map ID
    const mapId = generateMapId();
    
    // Save to Supabase
    const savedData = await saveMapToSupabase({
      id: mapId,
      title: title,
      prompt: prompt,
      geojson: geojson
    });
    
    console.log('Successfully created map:', savedData);
    showSuccess('Map created successfully! Redirecting...');
    
    // Redirect to voting map
    setTimeout(() => {
      window.location.href = `map.html?id=${mapId}`;
    }, 1000);
    
  } catch (error) {
    console.error('Error creating map:', error);
    showError(error.message || 'Error creating map. Please try again.');
  } finally {
    setFormLoading(false);
  }
}

// Initialize form
function initForm() {
  const form = document.getElementById('mapForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initForm); 