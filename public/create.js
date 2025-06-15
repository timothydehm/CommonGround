// create.js

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
  const mapId = Math.random().toString(36).substring(2, 10);

  // Save to Supabase
  const supabase = supabase.createClient('https://YOUR_PROJECT_ID.supabase.co', 'YOUR_ANON_KEY');

  const { error } = await supabase
    .from('maps')
    .insert([{ id: mapId, title, prompt, geojson }]);

  if (error) {
    alert('Error saving map to database.');
    console.error(error);
    return;
  }

  // Redirect to voting map
  window.location.href = `map.html?id=${mapId}`;
}); 