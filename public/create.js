// create.js

// Initialize Supabase client once
const supabaseClient = window.supabase.createClient(
  'https://ziidawfildpacymfddqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaWRhd2ZpbGRwYWN5bWZkZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM0NzQsImV4cCI6MjA2NTUwOTQ3NH0.AsyZJu6fcpvGDhHqak37q1LV4VDmfPvyDLDaU3b1tR4'
);

document.getElementById('mapForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('mapTitle').value.trim();
  const prompt = document.getElementById('mapPrompt').value.trim();
  const fileInput = document.getElementById('geojsonFile');
  const file = fileInput.files[0];

  if (!title || !prompt || !file) {
    alert('Please fill out all fields and upload a GeoJSON file.');
    return;
  }

  const text = await file.text();
  let geojson;
  try {
    geojson = JSON.parse(text);
  } catch (err) {
    alert('Invalid GeoJSON file.');
    return;
  }

  // Generate a unique ID for the map
  const mapId = 'map_' + Date.now().toString(36);

  try {
    const { data, error } = await supabaseClient
      .from('maps')
      .insert({
        id: mapId,
        title: title,
        prompt: prompt,
        geojson: geojson
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      alert('Error saving map to database: ' + error.message);
      return;
    }

    console.log('Successfully created map:', data);
    // Redirect to voting map
    window.location.href = `map.html?id=${mapId}`;
  } catch (err) {
    console.error('Error:', err);
    alert('Error connecting to database. Please try again.');
  }
}); 