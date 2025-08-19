// Initialize the map
const map = L.map('map').setView([41.50, -81.60], 13);

// Add the CartoDB light gray basemap
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(
  'https://ziidawfildpacymfddqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaWRhd2ZpbGRwYWN5bWZkZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM0NzQsImV4cCI6MjA2NTUwOTQ3NH0.AsyZJu6fcpvGDhHqak37q1LV4VDmfPvyDLDaU3b1tR4'
);

// Get map ID from URL
const urlParams = new URLSearchParams(window.location.search);
const mapId = urlParams.get('id');

if (!mapId) {
  alert('No map ID provided');
} else {
  // Load map data from Supabase
  loadMapData(mapId);
}

let layerMap = {}; // Track layers by parcel ID

// Get username from localStorage or prompt for it
function getUsername() {
  let username = localStorage.getItem('username');
  if (!username) {
    username = prompt("Enter your username to vote:");
    if (username) {
      localStorage.setItem('username', username);
    }
  }
  return username;
}

function getVoteCounts(votes) {
  const counts = {};
  for (const vote of votes) {
    const pid = vote.parcel_id;
    counts[pid] = (counts[pid] || 0) + 1;
  }
  return counts;
}

function getColorByVotes(voteCount, maxVotes) {
  if (voteCount === 0) return '#ffffff';  // white for no votes
  const scale = voteCount / maxVotes;
  const opacity = 0.1 + scale * 0.9;
  return `rgba(0, 0, 0, ${opacity})`; // black, scaled opacity
}

async function loadVotesAndUpdateStyles() {
  try {
    const { data: votes, error: voteError } = await supabaseClient
      .from('votes')
      .select()
      .eq('map_id', mapId);

    if (voteError) {
      console.error('Error loading votes:', voteError);
      return;
    }

    const voteCounts = getVoteCounts(votes);
    const maxVotes = Math.max(...Object.values(voteCounts), 0);

    for (const pid in layerMap) {
      const count = voteCounts[pid] || 0;
      const color = getColorByVotes(count, maxVotes);
      layerMap[pid].setStyle({
        fillColor: color,
        fillOpacity: 1,
      });
    }
  } catch (error) {
    console.error('Error updating vote styles:', error);
  }
}

async function loadMapData(mapId) {
  try {
    const { data, error } = await supabaseClient
      .from('maps')
      .select('*')
      .eq('id', mapId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Map not found');
    }

    // Update page title and info panel
    document.title = data.title;
    document.getElementById('map-title').textContent = data.title;
    document.getElementById('map-prompt').textContent = data.prompt;

    // Add GeoJSON to map
    const geojsonLayer = L.geoJSON(data.geojson, {
      style: {
        color: '#999999',  // darker grey border for better visibility
        weight: 1.5,       // slightly thicker border
        fillColor: '#ffffff',  // pure white fill
        fillOpacity: 1
      },
      onEachFeature: function(feature, layer) {
        const parcelId = feature.properties.PARCELID || feature.id;
        layerMap[parcelId] = layer;

        layer.on('click', async function() {
          const username = getUsername();
          if (!username) return;

          try {
            // Check if user has already voted for this parcel
            const { data: existingVotes, error: checkError } = await supabaseClient
              .from('votes')
              .select('*')
              .filter('map_id', 'eq', mapId)
              .filter('parcel_id', 'eq', parcelId)
              .filter('username', 'eq', username);

            if (checkError) {
              throw checkError;
            }

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
            
            // Refresh the vote display
            await loadVotesAndUpdateStyles();
          } catch (error) {
            console.error('Error saving vote:', error);
            alert('Error saving vote. Please try again.');
          }
        });
      }
    }).addTo(map);

    // Fit map to GeoJSON bounds
    map.fitBounds(geojsonLayer.getBounds());

    // Initial load of votes
    await loadVotesAndUpdateStyles();

    // Set up polling for vote updates
    setInterval(loadVotesAndUpdateStyles, 5000);

  } catch (error) {
    console.error('Error loading map:', error);
    alert('Error loading map: ' + error.message);
  }
} 