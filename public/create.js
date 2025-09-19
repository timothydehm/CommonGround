// create.js

// Form validation
function validateForm() {
  const creatorName = Utils.sanitizeInput(document.getElementById('creatorName').value);
  const title = Utils.sanitizeInput(document.getElementById('mapTitle').value);
  const prompt = Utils.sanitizeInput(document.getElementById('mapPrompt').value);
  const voteLimitInput = document.getElementById('voteLimit');
  const voteLimit = voteLimitInput.value ? parseInt(voteLimitInput.value) : null;
  const fileInput = document.getElementById('geojsonFile');
  const file = fileInput.files[0];

  if (!creatorName) {
    Utils.showError('Please enter your name as the map creator', document.getElementById('mapForm'));
    return false;
  }

  if (!title) {
    Utils.showError('Please enter a map title', document.getElementById('mapForm'));
    return false;
  }

  if (!prompt) {
    Utils.showError('Please enter a prompt/instructions', document.getElementById('mapForm'));
    return false;
  }

  if (voteLimit !== null && (isNaN(voteLimit) || voteLimit < 1)) {
    Utils.showError('Vote limit must be a positive number', document.getElementById('mapForm'));
    return false;
  }

  if (!file) {
    Utils.showError('Please select a GeoJSON file', document.getElementById('mapForm'));
    return false;
  }

  if (!file.name.toLowerCase().endsWith('.geojson')) {
    Utils.showError('Please select a valid GeoJSON file', document.getElementById('mapForm'));
    return false;
  }

  return { creatorName, title, prompt, voteLimit, file };
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
    
    const { creatorName, title, prompt, voteLimit, file } = formData;
    
    // Set loading state
    setFormLoading(true);
    
    // Parse GeoJSON file
    const geojson = await parseGeoJSONFile(file);
    
    // Generate map ID
    const mapId = Utils.generateId();
    
    // Save to Supabase
    const savedData = await saveMapToSupabase({
      id: mapId,
      title: title,
      prompt: prompt,
      geojson: geojson,
      vote_limit: voteLimit,
      creator_name: creatorName
    });
    
    console.log('Successfully created map:', savedData);
    
    // Set creator as logged in user
    localStorage.setItem('username', creatorName);
    
    Utils.showSuccess('Map created successfully! Redirecting...', document.getElementById('mapForm'));
    
    // Redirect to voting map
    setTimeout(() => {
      window.location.href = `map.html?id=${mapId}`;
    }, 1000);
    
  } catch (error) {
    console.error('Error creating map:', error);
    Utils.showError(error.message || 'Error creating map. Please try again.', document.getElementById('mapForm'));
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