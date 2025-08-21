// Global state
let map, mapId, layerMap = {}, pollingInterval, lastVoteCount = 0, mapData = null;
let showMyVotesOnly = false, currentUsername = null;

// Initialize the application
async function init() {
  try {
    initializeMap();
    setupCopyLinkButton();
    setupExportButton();
    setupViewToggleButton();
    
    const urlParams = new URLSearchParams(window.location.search);
    mapId = urlParams.get('id');
    
    if (!mapId) {
      showError('No map ID provided. Please use a valid map link.');
      return;
    }
    
    await loadMapData(mapId);
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

// Setup copy link button
function setupCopyLinkButton() {
  const copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyMapLink);
  }
}

// Setup export button
function setupExportButton() {
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportGeoJSON);
  }
}

// Setup view toggle button
function setupViewToggleButton() {
  const toggleBtn = document.getElementById('viewToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleViewMode);
  }
}

// Toggle between all votes and my votes only
function toggleViewMode() {
  showMyVotesOnly = !showMyVotesOnly;
  const toggleBtn = document.getElementById('viewToggleBtn');
  
  if (toggleBtn) {
    toggleBtn.textContent = showMyVotesOnly ? 'Show All Votes' : 'Show My Votes Only';
    toggleBtn.classList.toggle('active', showMyVotesOnly);
  }
  
  // Reload votes with new filter
  loadVotesAndUpdateStyles();
}

// Copy map link to clipboard
async function copyMapLink() {
  if (!mapId) {
    showError('No map link to copy');
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

// Export GeoJSON with vote counts
async function exportGeoJSON() {
  if (!mapData || !mapId) {
    showError('No map data available for export');
    return;
  }

  try {
    // Get current vote data (always export all votes, not filtered)
    const { data: votes, error } = await supabaseClient
      .from('votes')
      .select('*')
      .eq('map_id', mapId);

    if (error) {
      console.error('Error loading votes for export:', error);
      showError('Error loading vote data for export');
      return;
    }

    // Calculate vote counts
    const voteCounts = getVoteCounts(votes);
    const maxVotes = Math.max(...Object.values(voteCounts), 0);

    // Create export data with vote counts
    const exportData = {
      type: 'FeatureCollection',
      features: mapData.geojson.features.map(feature => {
        const parcelId = feature.properties.PARCELID || feature.properties.id || feature.id;
        const voteCount = voteCounts[parcelId] || 0;
        const votePercentage = maxVotes > 0 ? (voteCount / maxVotes * 100).toFixed(1) : 0;
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            vote_count: voteCount,
            vote_percentage: parseFloat(votePercentage),
            has_votes: voteCount > 0
          }
        };
      }),
      metadata: {
        map_title: mapData.title,
        map_prompt: mapData.prompt,
        total_votes: votes.length,
        total_parcels: mapData.geojson.features.length,
        parcels_with_votes: Object.keys(voteCounts).length,
        export_date: new Date().toISOString(),
        max_votes_per_parcel: maxVotes
      }
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_voting_results.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Voting results exported successfully!');
  } catch (error) {
    console.error('Error exporting GeoJSON:', error);
    showError('Error exporting voting results');
  }
}

// Get username from localStorage or prompt for it
function getUsername() {
  let username = localStorage.getItem('username');
  if (!username) {
    username = prompt("Enter your username to vote:");
    if (username && username.trim()) {
      localStorage.setItem('username', Utils.sanitizeInput(username));
    }
  }
  currentUsername = username;
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

// Load and update vote styles with optimization
async function loadVotesAndUpdateStyles() {
  if (!mapId) return;
  
  try {
    let query = supabaseClient
      .from('votes')
      .select('*')
      .eq('map_id', mapId);
    
    // Filter by username if showing only my votes
    if (showMyVotesOnly && currentUsername) {
      query = query.eq('username', currentUsername);
    }
    
    const { data: votes, error } = await query;

    if (error) {
      console.error('Error loading votes:', error);
      return;
    }

    // Only update if vote count changed
    if (votes.length === lastVoteCount) return;
    lastVoteCount = votes.length;

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

    // Store map data for export
    mapData = data;

    document.title = data.title;
    document.getElementById('map-title').textContent = data.title;
    document.getElementById('map-prompt').textContent = data.prompt;

    // Show all buttons
    const copyBtn = document.getElementById('copyLinkBtn');
    const exportBtn = document.getElementById('exportBtn');
    const toggleBtn = document.getElementById('viewToggleBtn');
    if (copyBtn) copyBtn.style.display = 'block';
    if (exportBtn) exportBtn.style.display = 'block';
    if (toggleBtn) toggleBtn.style.display = 'block';

    addGeoJSONToMap(data.geojson);
    
    // Start polling for vote updates
    startPolling();
  } catch (error) {
    console.error('Error loading map:', error);
    showError('Error loading map: ' + error.message);
  }
}

// Add GeoJSON to map with consistent styling
function addGeoJSONToMap(geojsonData) {
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
      layer.on('click', () => handleParcelClick(parcelId));
    }
  }).addTo(map);

  map.fitBounds(geojsonLayer.getBounds());
  loadVotesAndUpdateStyles();
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

// Show success message
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success';
  successDiv.textContent = message;
  
  const infoPanel = document.getElementById('info-panel');
  infoPanel.appendChild(successDiv);
  
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 