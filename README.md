# Tap to Plan

A simple, efficient voting map application for collaborative land use planning. Users can create maps with GeoJSON data and vote on parcels by clicking them.

## Core Features

- **Create Maps**: Upload GeoJSON files with custom titles and prompts
- **Vote on Parcels**: Click parcels to vote/unvote with real-time updates
- **Visual Feedback**: Vote counts displayed as color intensity on the map
- **Share Maps**: Copy direct links to share voting maps
- **Export Results**: Download GeoJSON with voting data included

## Architecture

- **Frontend**: Pure HTML/CSS/JavaScript with Leaflet.js for mapping
- **Backend**: Supabase for real-time data storage
- **Design**: Single-purpose, focused on voting functionality

## Setup

1. Clone the repository
2. Update Supabase credentials in `supabase.js`
3. Deploy to any static hosting service

## File Structure

```
├── index.html          # Redirects to create page
├── supabase.js         # Centralized configuration & utilities
├── public/
│   ├── create.html     # Map creation form
│   ├── create.js       # Form handling logic
│   ├── map.html        # Voting interface
│   ├── map.js          # Map & voting logic
│   └── style.css       # Application styles
└── README.md
```

## Usage

1. Visit the app to create a new voting map
2. Upload a GeoJSON file with parcel data
3. Add a title and voting instructions
4. Share the generated link for voting
5. Users click parcels to vote with real-time updates
6. Export voting results as GeoJSON with vote counts included

## Export Format

The exported GeoJSON includes:
- **Original parcel data** with all properties preserved
- **Vote counts** (`vote_count`) for each parcel
- **Vote percentages** (`vote_percentage`) relative to the most voted parcel
- **Vote indicators** (`has_votes`) boolean flag
- **Metadata** with map info, totals, and export date

Example exported feature:
```json
{
  "type": "Feature",
  "geometry": { ... },
  "properties": {
    "PARCELID": "12345",
    "vote_count": 5,
    "vote_percentage": 100.0,
    "has_votes": true
  }
}
```

## Dependencies

- Leaflet.js for map functionality
- Supabase for backend storage
- No build process required

## License

MIT License 