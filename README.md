# Tap to Plan

A simple, efficient voting map application for collaborative land use planning. Users can create maps with GeoJSON data and vote on parcels by clicking them.

## Core Features

- **Create Maps**: Upload GeoJSON files with custom titles and prompts
- **Vote on Parcels**: Click parcels to vote/unvote with real-time updates
- **Visual Feedback**: Vote counts displayed as color intensity on the map
- **Personal Vote View**: Toggle between all votes and your own votes only
- **Share Maps**: Copy direct links to share voting maps
- **Export Results**: Download GeoJSON with spreadsheet-friendly voter columns

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
6. Use the toggle button to view only your own votes
7. Export spreadsheet-friendly voting results with voter columns

## Voting Features

### **All Votes View (Default)**
- Shows vote counts from all users
- Color intensity represents total votes per parcel
- Best for seeing overall community preferences

### **My Votes Only View**
- Click "Show My Votes Only" toggle button
- Shows only your personal voting history
- Useful for reviewing your own choices
- Toggle back to "Show All Votes" anytime

## Export Format

The exported GeoJSON uses a spreadsheet-friendly format with voter columns for easy analysis:

### **Per-Parcel Data**
- **Original parcel data** with all properties preserved
- **Vote counts** (`vote_count`) for each parcel
- **Vote percentages** (`vote_percentage`) relative to the most voted parcel
- **Vote indicators** (`has_votes`) boolean flag
- **Voter count** (`voter_count`) number of unique voters per parcel
- **Voter columns** (`voter_username`) timestamp when each person voted (null if they didn't vote)

### **Spreadsheet-Friendly Structure**
Each parcel row includes:
- All original parcel properties
- Summary voting statistics
- One column per voter with their voting timestamp
- Easy to filter, sort, and analyze in Excel/GIS software

### **Example Exported Feature**
```json
{
  "type": "Feature",
  "geometry": { ... },
  "properties": {
    "PARCELID": "12345",
    "vote_count": 3,
    "vote_percentage": 75.0,
    "has_votes": true,
    "voter_count": 3,
    "voter_council_member_jones": "2024-01-15T10:30:00.000Z",
    "voter_resident_smith": "2024-01-15T11:15:00.000Z",
    "voter_developer_abc": "2024-01-15T14:20:00.000Z",
    "voter_other_user": null
  }
}
```

### **Metadata & Analysis**
- **Map information**: title, prompt, totals
- **Voter column list**: all voter usernames for reference
- **Voter summary**: activity levels, participation statistics
- **Voting patterns**: clusters, collaboration indicators
- **Stakeholder identification**: high-activity users, focused voters

### **Stakeholder Analysis**
The export includes detailed analysis to identify:
- **High-activity users**: Users with many votes across multiple parcels
- **Focused voters**: Users voting on specific areas (potential stakeholders)
- **Voting clusters**: Parcels with multiple voters (collaboration indicators)
- **Bad actor detection**: Unusual voting patterns or excessive activity

### **Use Cases for Spreadsheet Export**
- **Excel Analysis**: Import directly into Excel for filtering and sorting
- **GIS Integration**: Use in QGIS, ArcGIS, or other mapping software
- **Transparency**: See exactly who voted for what in tabular format
- **Stakeholder identification**: Identify council members, developers, residents
- **Pattern analysis**: Detect voting clusters or coordinated efforts
- **Accountability**: Track individual voting behavior
- **Collaboration mapping**: Find areas of agreement/disagreement

## Dependencies

- Leaflet.js for map functionality
- Supabase for backend storage
- No build process required

## License

MIT License 