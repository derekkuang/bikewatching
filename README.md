# 🚴🏼‍♀️ Bikewatching

An interactive visualization of bike traffic patterns in the Boston and Cambridge area using Bluebikes data.

## Overview

This project visualizes bike traffic from the Bluebikes bike-sharing system in Boston and Cambridge. It shows bike stations as circles on the map, where:

- **Circle size** represents the volume of traffic at each station
- **Circle color** indicates whether a station has more departures (blue), more arrivals (orange), or balanced traffic (purple)
- **Time slider** allows filtering traffic data to see patterns at different times of day

## Features

- Interactive map with bike lanes from both Boston and Cambridge
- Dynamic visualization of over 260,000 bike trips from March 2024
- Time-based filtering to analyze traffic patterns throughout the day
- Visual indication of traffic flow direction (departures vs arrivals)
- Responsive design that works across different screen sizes

## Technologies Used

- **Mapbox GL JS** - Base map and geographical features
- **D3.js** - Data visualization and manipulation
- **HTML/CSS/JavaScript** - Frontend implementation
- **ES Modules** - Modern JavaScript imports
- **Public GeoJSON APIs** - Boston and Cambridge bike lane data

## Data Sources

- Bluebikes station information: JSON data with station locations and details
- Bluebikes trip data: CSV file with over 260,000 bike rides from March 2024
- Boston bike lanes: Official GeoJSON from Boston Open Data
- Cambridge bike facilities: Official GeoJSON from Cambridge GIS

## How to Use

1. Open the website in a modern browser
2. The map shows all bike stations with their traffic represented by circle size
3. Use the time slider at the top to filter data by time of day
4. Hover over any station to see detailed statistics:
   - Total number of trips
   - Number of departures
   - Number of arrivals

## Local Development

1. Clone the repository
2. Open index.html in a modern browser
3. No build process required - the project uses ES modules loaded directly in the browser

## License

This project is for educational purposes, using publicly available data from Bluebikes and municipal open data portals. 