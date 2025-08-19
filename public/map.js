// Configuration
const CONFIG = {
  SUPABASE_URL: 'https://ziidawfildpacymfddqh.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaWRhd2ZpbGRwYWN5bWZkZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM0NzQsImV4cCI6MjA2NTUwOTQ3NH0.AsyZJu6fcpvGDhHqak37q1LV4VDmfPvyDLDaU3b1tR4',
  POLLING_INTERVAL: 5000,
  DEFAULT_CENTER: [41.50, -81.60],
  DEFAULT_ZOOM: 13
};

// Global state
let map, supabaseClient, mapId, layerMap = {}, pollingInterval;

// Initialize the application
async function init() {
  try {
    initializeMap();
    initializeSupabase();
    setupCopyLinkButton();
    
    const urlParams = new URLSearchParams(window.location.search);
    mapId = urlParams.get('id');
    
    if (!mapId) {
      await loadSampleData();
    } else {
      await loadMapData(mapId);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize the application');
  }
}

// Initialize Leaflet map
function initializeMap() {
  map = L.map('map').setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
}

// Initialize Supabase client
function initializeSupabase() {
  supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
}

// Setup copy link button
function setupCopyLinkButton() {
  const copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyMapLink);
  }
}

// Copy map link to clipboard
async function copyMapLink() {
  if (!mapId) {
    showError('No map link to copy (sample mode)');
    return;
  }
  
  const copyBtn = document.getElementById('copyLinkBtn');
  const mapUrl = `${window.location.origin}${window.location.pathname}?id=${mapId}`;
  
  try {
    await navigator.clipboard.writeText(mapUrl);
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    
    setTimeout(() => {
      copyBtn.textContent = 'Copy Link URL';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Failed to copy link:', error);
    showError('Failed to copy link to clipboard');
  }
}

// Get username from localStorage or prompt for it
function getUsername() {
  let username = localStorage.getItem('username');
  if (!username) {
    username = prompt("Enter your username to vote:");
    if (username && username.trim()) {
      localStorage.setItem('username', username.trim());
    }
  }
  return username;
}

// Calculate vote counts from vote data
function getVoteCounts(votes) {
  return votes.reduce((counts, vote) => {
    counts[vote.parcel_id] = (counts[vote.parcel_id] || 0) + 1;
    return counts;
  }, {});
}

// Get color based on vote count
function getColorByVotes(voteCount, maxVotes) {
  if (voteCount === 0) return '#ffffff';
  const scale = voteCount / maxVotes;
  const opacity = 0.1 + scale * 0.9;
  return `rgba(0, 0, 0, ${opacity})`;
}

// Load and update vote styles
async function loadVotesAndUpdateStyles() {
  if (!mapId) return;
  
  try {
    const { data: votes, error } = await supabaseClient
      .from('votes')
      .select('*')
      .eq('map_id', mapId);

    if (error) {
      console.error('Error loading votes:', error);
      return;
    }

    const voteCounts = getVoteCounts(votes);
    const maxVotes = Math.max(...Object.values(voteCounts), 0);

    Object.keys(layerMap).forEach(pid => {
      const count = voteCounts[pid] || 0;
      const color = getColorByVotes(count, maxVotes);
      layerMap[pid].setStyle({
        fillColor: color,
        fillOpacity: 1,
      });
    });
  } catch (error) {
    console.error('Error updating vote styles:', error);
  }
}

// Load sample data
async function loadSampleData() {
  try {
    const response = await fetch('parcels.geojson');
    if (!response.ok) throw new Error('Failed to load sample data');
    
    const data = await response.json();
    
    document.title = 'Sample Voting Map';
    document.getElementById('map-title').textContent = 'Sample Voting Map';
    document.getElementById('map-prompt').textContent = 'Click on parcels to vote. This is a sample map.';

    addGeoJSONToMap(data, true);
  } catch (error) {
    console.error('Error loading sample data:', error);
    showError('Error loading sample data');
  }
}

// Load map data from Supabase
async function loadMapData(mapId) {
  try {
    const { data, error } = await supabaseClient
      .from('maps')
      .select('*')
      .eq('id', mapId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Map not found');

    document.title = data.title;
    document.getElementById('map-title').textContent = data.title;
    document.getElementById('map-prompt').textContent = data.prompt;

    // Show copy button for real maps
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) copyBtn.style.display = 'block';

    addGeoJSONToMap(data.geojson, false);
    
    // Start polling for vote updates
    startPolling();
  } catch (error) {
    console.error('Error loading map:', error);
    showError('Error loading map: ' + error.message);
  }
}

// Add GeoJSON to map with consistent styling
function addGeoJSONToMap(geojsonData, isSample = false) {
  const geojsonLayer = L.geoJSON(geojsonData, {
    style: {
      color: '#999999',
      weight: 1.5,
      fillColor: '#ffffff',
      fillOpacity: 1
    },
    onEachFeature: (feature, layer) => {
      const parcelId = feature.properties.PARCELID || feature.properties.id || feature.id;
      layerMap[parcelId] = layer;

      if (isSample) {
        layer.on('click', () => {
          alert('This is a sample map. Create a real map to enable voting.');
        });
      } else {
        layer.on('click', () => handleParcelClick(parcelId));
      }
    }
  }).addTo(map);

  map.fitBounds(geojsonLayer.getBounds());
  
  if (!isSample) {
    loadVotesAndUpdateStyles();
  }
}

// Handle parcel click for voting
async function handleParcelClick(parcelId) {
  const username = getUsername();
  if (!username) return;

  try {
    const { data: existingVotes, error: checkError } = await supabaseClient
      .from('votes')
      .select('*')
      .filter('map_id', 'eq', mapId)
      .filter('parcel_id', 'eq', parcelId)
      .filter('username', 'eq', username);

    if (checkError) throw checkError;

    if (existingVotes && existingVotes.length > 0) {
      // Remove vote
      const { error: deleteError } = await supabaseClient
        .from('votes')
        .delete()
        .filter('map_id', 'eq', mapId)
        .filter('parcel_id', 'eq', parcelId)
        .filter('username', 'eq', username);

      if (deleteError) throw deleteError;
    } else {
      // Add vote
      const { error: insertError } = await supabaseClient
        .from('votes')
        .insert([{
          map_id: mapId,
          parcel_id: parcelId,
          username: username
        }]);

      if (insertError) throw insertError;
    }
    
    await loadVotesAndUpdateStyles();
  } catch (error) {
    console.error('Error saving vote:', error);
    showError('Error saving vote. Please try again.');
  }
}

// Start polling for vote updates
function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(loadVotesAndUpdateStyles, CONFIG.POLLING_INTERVAL);
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message;
  
  const infoPanel = document.getElementById('info-panel');
  infoPanel.appendChild(errorDiv);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 