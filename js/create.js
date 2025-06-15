// Initialize the map
let map = L.map('map').setView([40.7128, -74.0060], 13);
let drawingLayer = L.featureGroup().addTo(map);

// Add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Initialize drawing controls
let drawControl = new L.Control.Draw({
    draw: {
        polygon: true,
        rectangle: true,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false
    },
    edit: {
        featureGroup: drawingLayer
    }
});
map.addControl(drawControl);

// Handle drawing events
map.on('draw:created', function(e) {
    const layer = e.layer;
    drawingLayer.addLayer(layer);
});

// Handle form submission
document.getElementById('create-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('plan-name').value;
    const description = document.getElementById('plan-description').value;
    
    // Get the drawn features
    const features = drawingLayer.toGeoJSON();
    
    if (features.features.length === 0) {
        alert('Please draw at least one parcel on the map');
        return;
    }
    
    try {
        // Here you would typically save to Supabase
        console.log('Saving plan:', { name, description, features });
        alert('Plan created successfully!');
    } catch (error) {
        console.error('Error saving plan:', error);
        alert('Error creating plan. Please try again.');
    }
}); 