// Global state
let map, mapId, layerMap = {}, pollingInterval, lastVoteCount = 0, mapData = null;
let showMyVotesOnly = false, currentUsername = null;
let debounceTimeout = null;
let infoModeEnabled = false;
let currentVotes = [];

// Initialize the application
async function init() {
  try {
    showLoadingIndicator(true);
    initializeMap();
    setupCopyLinkButton();
    setupExportButton();
    setupViewToggleButton();
    setupChangeUserButton();
    setupInfoModeToggleButton();
    
    const urlParams = new URLSearchParams(window.location.search);
    mapId = urlParams.get('id');
    
    if (!mapId) {
      showError('No map ID provided. Please use a valid map link.');
      showLoadingIndicator(false);
      return;
    }
    
    await loadMapData(mapId);
    showLoadingIndicator(false);
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize the application');
    showLoadingIndicator(false);
  }
}

// Initialize Leaflet map with performance optimizations
function initializeMap() {
  map = L.map('map', {
    preferCanvas: true, // Use canvas for better performance with many features
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    dragging: true,
    touchZoom: true
  }).setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    updateWhenZooming: false, // Performance optimization
    updateWhenIdle: true
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

// Setup change user button
function setupChangeUserButton() {
  const changeUserBtn = document.getElementById('changeUserBtn');
  if (changeUserBtn) {
    changeUserBtn.addEventListener('click', changeUser);
  }
}

// Setup info mode toggle button
function setupInfoModeToggleButton() {
  const infoModeToggleBtn = document.getElementById('infoModeToggleBtn');
  if (infoModeToggleBtn) {
    infoModeToggleBtn.addEventListener('click', toggleInfoMode);
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

// Toggle info mode on/off
function toggleInfoMode() {
  infoModeEnabled = !infoModeEnabled;
  const infoModeToggleBtn = document.getElementById('infoModeToggleBtn');
  
  if (infoModeToggleBtn) {
    infoModeToggleBtn.textContent = infoModeEnabled ? 'Exit Info Mode' : 'Info Mode';
    infoModeToggleBtn.classList.toggle('active', infoModeEnabled);
  }
  
  // Close any open info panel when exiting info mode
  if (!infoModeEnabled) {
    closeInfoPanel();
  }
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

    // Calculate vote counts and collect voter details
    const voteCounts = getVoteCounts(votes);
    const voterDetails = getVoterDetails(votes);
    const uniqueVoters = getUniqueVoters(votes);
    const maxVotes = Math.max(...Object.values(voteCounts), 0);

    // Create export data with vote counts and voter details
    const exportData = {
      type: 'FeatureCollection',
      features: mapData.geojson.features.map(feature => {
        const parcelId = feature.properties.PARCELID || feature.properties.id || feature.id;
        const voteCount = voteCounts[parcelId] || 0;
        const votePercentage = maxVotes > 0 ? (voteCount / maxVotes * 100).toFixed(1) : 0;
        const parcelVoters = voterDetails[parcelId] || [];
        
        // Create voter columns for each unique voter
        const voterColumns = {};
        uniqueVoters.forEach(voter => {
          const voterVote = parcelVoters.find(v => v.username === voter);
          voterColumns[`voter_${voter}`] = voterVote ? voterVote.voted_at : null;
        });
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            vote_count: voteCount,
            vote_percentage: parseFloat(votePercentage),
            has_votes: voteCount > 0,
            voter_count: parcelVoters.length,
            // Add voter columns
            ...voterColumns
          }
        };
      }),
      metadata: {
        map_title: mapData.title,
        map_prompt: mapData.prompt,
        total_votes: votes.length,
        total_parcels: mapData.geojson.features.length,
        parcels_with_votes: Object.keys(voteCounts).length,
        unique_voters: uniqueVoters.length,
        export_date: new Date().toISOString(),
        max_votes_per_parcel: maxVotes,
        voter_columns: uniqueVoters.map(voter => `voter_${voter}`),
        voting_analysis: {
          voter_summary: getVoterSummary(votes),
          voting_patterns: getVotingPatterns(votes),
          stakeholder_identification: getStakeholderIdentification(votes)
        }
      }
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_voting_results_spreadsheet.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Spreadsheet-friendly voting results exported successfully!');
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
  
  // Update user identifier display
  updateUserIdentifier(username);
  
  // Update vote counter when username is set
  if (username && mapData && mapData.vote_limit) {
    loadVotesAndUpdateStyles();
  }
  
  return username;
}

// Update user identifier display
function updateUserIdentifier(username) {
  const userIdentifier = document.getElementById('user-identifier');
  const currentUsernameSpan = document.getElementById('current-username');
  
  if (username) {
    if (currentUsernameSpan) {
      currentUsernameSpan.textContent = username;
    }
    if (userIdentifier) {
      userIdentifier.style.display = 'flex';
    }
  } else {
    if (userIdentifier) {
      userIdentifier.style.display = 'none';
    }
  }
}

// Change user functionality
function changeUser() {
  const newUsername = prompt("Enter your new username:");
  if (newUsername && newUsername.trim()) {
    localStorage.setItem('username', Utils.sanitizeInput(newUsername));
    currentUsername = newUsername;
    updateUserIdentifier(newUsername);
    
    // Refresh vote data for new user
    if (mapData && mapData.vote_limit) {
      loadVotesAndUpdateStyles();
    }
    
    showSuccess(`Switched to user: ${newUsername}`);
  }
}

// Calculate vote counts from vote data
function getVoteCounts(votes) {
  return votes.reduce((counts, vote) => {
    counts[vote.parcel_id] = (counts[vote.parcel_id] || 0) + 1;
    return counts;
  }, {});
}

// Get detailed voter information for each parcel
function getVoterDetails(votes) {
  const voterDetails = {};
  
  votes.forEach(vote => {
    const parcelId = vote.parcel_id;
    if (!voterDetails[parcelId]) {
      voterDetails[parcelId] = [];
    }
    
    voterDetails[parcelId].push({
      username: vote.username,
      voted_at: vote.created_at || new Date().toISOString()
    });
  });
  
  return voterDetails;
}

// Get unique voters from all votes
function getUniqueVoters(votes) {
  const uniqueUsernames = new Set();
  votes.forEach(vote => uniqueUsernames.add(vote.username));
  return Array.from(uniqueUsernames).sort(); // Sort for consistent column order
}

// Generate voter summary statistics
function getVoterSummary(votes) {
  const voterCounts = {};
  const voterParcelCounts = {};
  
  votes.forEach(vote => {
    // Count total votes per user
    voterCounts[vote.username] = (voterCounts[vote.username] || 0) + 1;
    
    // Count unique parcels voted on per user
    if (!voterParcelCounts[vote.username]) {
      voterParcelCounts[vote.username] = new Set();
    }
    voterParcelCounts[vote.username].add(vote.parcel_id);
  });
  
  const summary = {
    total_voters: Object.keys(voterCounts).length,
    voter_activity: Object.keys(voterCounts).map(username => ({
      username: username,
      total_votes: voterCounts[username],
      unique_parcels_voted: voterParcelCounts[username].size,
      average_votes_per_parcel: (voterCounts[username] / voterParcelCounts[username].size).toFixed(2)
    })).sort((a, b) => b.total_votes - a.total_votes)
  };
  
  return summary;
}

// Analyze voting patterns
function getVotingPatterns(votes) {
  const patterns = {
    most_active_voters: [],
    voting_clusters: {},
    potential_collaboration: []
  };
  
  // Group votes by user to find patterns
  const userVotes = {};
  votes.forEach(vote => {
    if (!userVotes[vote.username]) {
      userVotes[vote.username] = [];
    }
    userVotes[vote.username].push(vote.parcel_id);
  });
  
  // Find most active voters
  const voterActivity = Object.entries(userVotes).map(([username, parcels]) => ({
    username,
    parcel_count: parcels.length,
    parcels: parcels
  })).sort((a, b) => b.parcel_count - a.parcel_count);
  
  patterns.most_active_voters = voterActivity.slice(0, 5);
  
  // Find potential voting clusters (users voting on same parcels)
  const parcelVoters = {};
  votes.forEach(vote => {
    if (!parcelVoters[vote.parcel_id]) {
      parcelVoters[vote.parcel_id] = [];
    }
    parcelVoters[vote.parcel_id].push(vote.username);
  });
  
  // Find parcels with multiple voters
  Object.entries(parcelVoters).forEach(([parcelId, voters]) => {
    if (voters.length > 1) {
      patterns.voting_clusters[parcelId] = {
        voter_count: voters.length,
        voters: voters
      };
    }
  });
  
  return patterns;
}

// Identify potential stakeholders based on voting behavior
function getStakeholderIdentification(votes) {
  const stakeholderAnalysis = {
    high_activity_users: [],
    focused_voters: [],
    potential_stakeholders: []
  };
  
  const userVotes = {};
  votes.forEach(vote => {
    if (!userVotes[vote.username]) {
      userVotes[vote.username] = [];
    }
    userVotes[vote.username].push(vote.parcel_id);
  });
  
  // Analyze each user's voting pattern
  Object.entries(userVotes).forEach(([username, parcels]) => {
    const uniqueParcels = new Set(parcels);
    const totalVotes = parcels.length;
    const uniqueParcelCount = uniqueParcels.size;
    
    const userAnalysis = {
      username: username,
      total_votes: totalVotes,
      unique_parcels: uniqueParcelCount,
      vote_concentration: (totalVotes / uniqueParcelCount).toFixed(2),
      voting_behavior: totalVotes > 10 ? 'high_activity' : 
                      uniqueParcelCount < 3 ? 'focused' : 'moderate'
    };
    
    if (totalVotes > 10) {
      stakeholderAnalysis.high_activity_users.push(userAnalysis);
    } else if (uniqueParcelCount < 3 && totalVotes > 1) {
      stakeholderAnalysis.focused_voters.push(userAnalysis);
    }
    
    // Flag potential stakeholders (high activity or focused voting)
    if (totalVotes > 5 || (uniqueParcelCount < 3 && totalVotes > 1)) {
      stakeholderAnalysis.potential_stakeholders.push({
        ...userAnalysis,
        stakeholder_type: totalVotes > 10 ? 'high_engagement' : 'focused_interest'
      });
    }
  });
  
  return stakeholderAnalysis;
}

// Get color based on vote count
function getColorByVotes(voteCount, maxVotes) {
  if (voteCount === 0) return '#ffffff';
  const scale = voteCount / maxVotes;
  const opacity = 0.1 + scale * 0.9;
  return `rgba(0, 0, 0, ${opacity})`;
}

// Update vote counter display
function updateVoteCounter(votes) {
  if (!currentUsername || !mapData || !mapData.vote_limit) return;
  
  const userVotes = votes.filter(vote => vote.username === currentUsername);
  const voteCountSpan = document.getElementById('vote-count');
  
  if (voteCountSpan) {
    voteCountSpan.textContent = userVotes.length;
  }
}

// Optimistic vote counter update
function updateVoteCounterOptimistic() {
  if (!currentUsername || !mapData || !mapData.vote_limit) return;
  
  const voteCountSpan = document.getElementById('vote-count');
  if (voteCountSpan) {
    const currentCount = parseInt(voteCountSpan.textContent) || 0;
    // We'll update this more accurately when the full refresh happens
    voteCountSpan.textContent = currentCount;
  }
}

// Get current vote count for a specific parcel (from cached data)
function getCurrentVoteCount(parcelId) {
  // This is a simplified version - in a real implementation, you'd cache vote counts
  return 0; // Will be updated by the full refresh
}

// Get max vote count (from cached data)
function getMaxVoteCount() {
  // This is a simplified version - in a real implementation, you'd cache this
  return 1; // Will be updated by the full refresh
}

// Update single parcel style optimistically
function updateSingleParcelStyle(parcelId, isVoted) {
  const layer = layerMap[parcelId];
  if (!layer) return;
  
  // Simple optimistic styling - will be corrected by full refresh
  const color = isVoted ? '#4caf50' : '#ffffff'; // Green for voted, white for not voted
  layer.setStyle({
    fillColor: color,
    fillOpacity: 1,
  });
}

// Load and update vote styles with optimization
async function loadVotesAndUpdateStyles() {
  if (!mapId) return;
  
  try {
    // Always load all votes for info mode, regardless of view filter
    const { data: allVotes, error: allVotesError } = await supabaseClient
      .from('votes')
      .select('*')
      .eq('map_id', mapId);
    
    if (allVotesError) {
      console.error('Error loading all votes:', allVotesError);
      return;
    }

    // Store all votes for info mode
    currentVotes = allVotes;

    // Load filtered votes for display (if showing only my votes)
    let displayVotes = allVotes;
    if (showMyVotesOnly && currentUsername) {
      displayVotes = allVotes.filter(vote => vote.username === currentUsername);
    }

    // Only update if vote count changed
    if (displayVotes.length === lastVoteCount) return;
    lastVoteCount = displayVotes.length;

    // Update vote counter
    updateVoteCounter(displayVotes);

    const voteCounts = getVoteCounts(displayVotes);
    const maxVotes = Math.max(...Object.values(voteCounts), 0);

    // Batch style updates for better performance
    const styleUpdates = [];
    Object.keys(layerMap).forEach(pid => {
      const count = voteCounts[pid] || 0;
      const color = getColorByVotes(count, maxVotes);
      styleUpdates.push({
        layer: layerMap[pid],
        style: {
          fillColor: color,
          fillOpacity: 1,
        }
      });
    });

    // Apply all style updates at once
    styleUpdates.forEach(({ layer, style }) => {
      layer.setStyle(style);
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

    // Show vote counter if there's a vote limit
    const voteCounter = document.getElementById('vote-counter');
    const voteLimitSpan = document.getElementById('vote-limit');
    if (data.vote_limit) {
      voteLimitSpan.textContent = data.vote_limit;
      voteCounter.style.display = 'block';
    } else {
      voteCounter.style.display = 'none';
    }

    // Show all buttons
    const copyBtn = document.getElementById('copyLinkBtn');
    const exportBtn = document.getElementById('exportBtn');
    const toggleBtn = document.getElementById('viewToggleBtn');
    const infoModeToggleBtn = document.getElementById('infoModeToggleBtn');
    if (copyBtn) copyBtn.style.display = 'block';
    if (exportBtn) exportBtn.style.display = 'block';
    if (toggleBtn) toggleBtn.style.display = 'block';
    if (infoModeToggleBtn) infoModeToggleBtn.style.display = 'block';

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
  
  // Info mode doesn't need special event listeners - it uses the existing click handler
}

// Handle parcel click for voting with optimistic updates
async function handleParcelClick(parcelId) {
  // If in info mode, show info panel instead of voting
  if (infoModeEnabled) {
    showInfoPanel(parcelId);
    return;
  }
  
  const username = getUsername();
  if (!username) return;

  // Show loading state on the clicked parcel
  const layer = layerMap[parcelId];
  if (layer) {
    layer.setStyle({ fillColor: '#ffeb3b', fillOpacity: 0.7 }); // Yellow loading state
  }

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
      
      // Optimistic update: immediately update the parcel color
      updateSingleParcelStyle(parcelId, false);
    } else {
      // Check vote limit before adding vote
      if (mapData && mapData.vote_limit) {
        const { data: userVotes, error: userVotesError } = await supabaseClient
          .from('votes')
          .select('*')
          .filter('map_id', 'eq', mapId)
          .filter('username', 'eq', username);

        if (userVotesError) throw userVotesError;

        if (userVotes && userVotes.length >= mapData.vote_limit) {
          // Revert loading state
          if (layer) {
            const currentVoteCount = getCurrentVoteCount(parcelId);
            const maxVotes = getMaxVoteCount();
            const color = getColorByVotes(currentVoteCount, maxVotes);
            layer.setStyle({ fillColor: color, fillOpacity: 1 });
          }
          showError(`You have reached the vote limit of ${mapData.vote_limit} votes. Remove a vote to add a new one.`);
          return;
        }
      }

      // Add vote
      const { error: insertError } = await supabaseClient
        .from('votes')
        .insert([{
          map_id: mapId,
          parcel_id: parcelId,
          username: username
        }]);

      if (insertError) throw insertError;
      
      // Optimistic update: immediately update the parcel color
      updateSingleParcelStyle(parcelId, true);
    }
    
    // Update vote counter immediately
    updateVoteCounterOptimistic();
    
    // Debounced refresh to prevent excessive API calls
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => loadVotesAndUpdateStyles(), 200);
  } catch (error) {
    console.error('Error saving vote:', error);
    showError('Error saving vote. Please try again.');
    
    // Revert loading state on error
    if (layer) {
      const currentVoteCount = getCurrentVoteCount(parcelId);
      const maxVotes = getMaxVoteCount();
      const color = getColorByVotes(currentVoteCount, maxVotes);
      layer.setStyle({ fillColor: color, fillOpacity: 1 });
    }
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

// Show/hide loading indicator
function showLoadingIndicator(show) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
}

// Show info panel for a parcel
function showInfoPanel(parcelId) {
  if (!infoModeEnabled) return;
  
  console.log('Info mode - currentVotes:', currentVotes);
  console.log('Info mode - parcelId:', parcelId);
  
  const parcelVotes = currentVotes.filter(vote => vote.parcel_id === parcelId);
  console.log('Info mode - parcelVotes:', parcelVotes);
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'info-panel-overlay';
  overlay.addEventListener('click', closeInfoPanel);
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'info-panel';
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'info-panel-close';
  closeBtn.innerHTML = '×';
  closeBtn.addEventListener('click', closeInfoPanel);
  
  // Create content
  let content = '';
  if (parcelVotes.length === 0) {
    content = `
      <div class="info-panel-title">No votes yet</div>
      <div class="info-panel-no-votes">No one has voted for this parcel yet</div>
    `;
  } else {
    const voterList = parcelVotes.map(vote => {
      const voteTime = new Date(vote.created_at).toLocaleString();
      return `
        <div class="info-panel-voter">
          <span class="info-panel-voter-name">${vote.username}</span>
          <span class="info-panel-voter-time">${voteTime}</span>
        </div>
      `;
    }).join('');
    
    content = `
      <div class="info-panel-title">${parcelVotes.length} vote${parcelVotes.length > 1 ? 's' : ''}</div>
      <div class="info-panel-voters">${voterList}</div>
    `;
  }
  
  panel.innerHTML = content;
  panel.appendChild(closeBtn);
  
  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  
  // Prevent panel clicks from closing
  panel.addEventListener('click', (e) => e.stopPropagation());
}

// Close info panel
function closeInfoPanel() {
  const overlay = document.querySelector('.info-panel-overlay');
  const panel = document.querySelector('.info-panel');
  
  if (overlay) overlay.remove();
  if (panel) panel.remove();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 