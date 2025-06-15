# Tap to Plan

An interactive web application for planning and voting on land use proposals. Built with Leaflet.js and Supabase.

## Features

- Interactive map interface for viewing parcels
- Drawing tools for creating new plans
- Real-time data storage with Supabase
- Responsive design for all devices

## Setup

1. Clone the repository
2. Update the Supabase configuration in `supabase.js` with your credentials
3. Open `pages/index.html` in your browser to view the map
4. Open `pages/create.html` to create new plans

## Dependencies

- Leaflet.js for map functionality
- Leaflet.Draw for drawing tools
- Supabase for backend storage

## Project Structure

```
tap-to-plan/
│
├── public/
│   └── parcels.geojson    # sample file for testing
│
├── pages/
│   ├── index.html         # map view
│   └── create.html        # creator's setup page
│
├── js/
│   ├── map.js            # handles the voting map
│   └── create.js         # handles the create map form
│
├── styles/
│   └── style.css         # all basic styles
│
└── supabase.js           # Supabase configuration
```

## License

MIT License 