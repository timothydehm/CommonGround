const map = L.map('map').setView([41.50, -81.60], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

fetch('parcels.geojson')
  .then(response => response.json())
  .then(data => {
    const geojsonLayer = L.geoJSON(data, {
      style: {
        color: '#555',
        weight: 1,
        fillColor: '#ccc',
        fillOpacity: 0.7
      }
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());
  })
  .catch(error => console.error('Error loading GeoJSON:', error)); 