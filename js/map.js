// Initialize the map
let map = L.map('map').setView([40.7128, -74.0060], 13);

// Add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load parcels from GeoJSON
async function loadParcels() {
    try {
        const response = await fetch('../public/parcels.geojson');
        const data = await response.json();
        
        L.geoJSON(data, {
            onEachFeature: function(feature, layer) {
                layer.on('click', function(e) {
                    showParcelDetails(feature.properties);
                });
            }
        }).addTo(map);
    } catch (error) {
        console.error('Error loading parcels:', error);
    }
}

// Show parcel details in the info panel
function showParcelDetails(properties) {
    const detailsDiv = document.getElementById('parcel-details');
    detailsDiv.innerHTML = `
        <h3>${properties.name}</h3>
        <p>ID: ${properties.id}</p>
    `;
}

// Initialize the map
document.addEventListener('DOMContentLoaded', () => {
    loadParcels();
}); 