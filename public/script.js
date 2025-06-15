const map = L.map('map').setView([41.50, -81.60], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

fetch('parcels.geojson')
  .then(response => response.json())
  .then(data => {
    function getDefaultStyle() {
      return {
        color: '#555',
        weight: 1,
        fillColor: '#ccc',
        fillOpacity: 0.7
      };
    }

    function getSelectedStyle() {
      return {
        color: '#0057e7',
        weight: 2,
        fillColor: '#0099ff',
        fillOpacity: 0.9
      };
    }

    function onEachFeature(feature, layer) {
      layer._selected = false;

      layer.on('click', function () {
        layer._selected = !layer._selected;

        layer.setStyle(layer._selected ? getSelectedStyle() : getDefaultStyle());
      });
    }

    const geojsonLayer = L.geoJSON(data, {
      style: getDefaultStyle,
      onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());
  })
  .catch(error => console.error('Error loading GeoJSON:', error)); 