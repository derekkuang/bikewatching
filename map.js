// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZGVyZWtrdWFuZyIsImEiOiJjbWFwdm93a3UwMnh5MmtwdXdsc2l1MmtoIn0.IvDj31IUvTl52oVl-RNG6A';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.1056, 42.3751], // Cambridge, MA coordinates [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

// Add map controls (optional)
map.addControl(new mapboxgl.NavigationControl());

// Create SVG element for station markers
const svg = d3.select('#map').append('svg');

// Format minutes as HH:MM AM/PM
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

// Global time filter variable
let timeFilter = -1;

// Function to compute minutes since midnight from a Date object
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Function to filter trips based on time
function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips // If no filter is applied (-1), return all trips
    : trips.filter((trip) => {
        // Convert trip start and end times to minutes since midnight
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);

        // Include trips that started or ended within 60 minutes of the selected time
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

// Function to compute station traffic metrics
function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );
  
  // Compute arrivals
  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );
  
  // Update each station with traffic data
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

map.on('load', async () => {
    // Define a reusable style object for bike lanes
    const bikeLineStyle = {
        'line-color': '#32D400',  // A bright green using hex code
        'line-width': 5,          // Thicker lines
        'line-opacity': 0.6       // Slightly less transparent
    };

    // Add Boston bike routes
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    // Add Cambridge bike routes
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    // Add Boston bike lanes layer
    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: bikeLineStyle,
    });

    // Add Cambridge bike lanes layer
    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: bikeLineStyle,
    });

    // Fetch Bluebikes station data
    const jsonUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    
    // Fetch traffic data with date parsing
    const trips = await d3.csv(
        'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
        (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            return trip;
        }
    );
    
    // Load station data
    const jsonData = await d3.json(jsonUrl);
    
    console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    console.log('Loaded Traffic Data (first few entries):', trips.slice(0, 5));
    
    // Process station data with traffic metrics
    let stations = computeStationTraffic(jsonData.data.stations, trips);
    
    console.log('Stations with traffic data:', stations);
    
    // Create a square root scale for circle radius based on traffic
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]);
      
    // Create a quantize scale for departure ratio
    const stationFlow = d3
      .scaleQuantize()
      .domain([0, 1])
      .range([0, 0.5, 1]);

    function getCoords(station) {
        const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
        const { x, y } = map.project(point); // Project to pixel coordinates
        return { cx: x, cy: y }; // Return as object for use in SVG attributes
    }
    
    // Append circles to the SVG for each station
    const circles = svg
        .selectAll('circle')
        .data(stations, (d) => d.short_name) // Use station short_name as the key
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic)) // Use traffic data for radius
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .style('--departure-ratio', d => 
            stationFlow(d.totalTraffic > 0 ? d.departures / d.totalTraffic : 0.5)
        )
        .each(function (d) {
            // Add <title> for browser tooltips
            d3.select(this)
              .append('title')
              .text(
                `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
              );
        });
    
    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
        circles
        .attr('cx', d => getCoords(d).cx) // Set the x-position using projected coordinates
        .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
    }
    
    // Initial position update when map loads
    updatePositions();
    
    // Reposition markers on map interactions
    map.on('move', updatePositions); // Update during map movement
    map.on('zoom', updatePositions); // Update during zooming
    map.on('resize', updatePositions); // Update on window resize
    map.on('moveend', updatePositions); // Final adjustment after movement ends
    
    // Function to update the scatterplot based on filtered data
    function updateScatterPlot(timeFilter) {
        // Get only the trips that match the selected time filter
        const filteredTrips = filterTripsbyTime(trips, timeFilter);
        
        // Recompute station traffic based on the filtered trips
        const filteredStations = computeStationTraffic(jsonData.data.stations, filteredTrips);
        
        // Keep size range consistent regardless of filtering
        radiusScale.range([0, 25]);
        
        // Update the domain to match the new data
        radiusScale.domain([0, d3.max(filteredStations, d => d.totalTraffic) || 1]);
        
        // Update the circles
        circles
            .data(filteredStations, (d) => d.short_name) // Ensure D3 tracks elements correctly
            .join('circle')
            .attr('r', d => radiusScale(d.totalTraffic)) // Update radius
            .style('--departure-ratio', d => 
                stationFlow(d.totalTraffic > 0 ? d.departures / d.totalTraffic : 0.5)
            )
            .each(function (d) {
                // Update tooltips
                d3.select(this).select('title')
                    .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            });
            
        // Update positions after changing data
        updatePositions();
    }
    
    // Get the slider and display elements
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');
    
    // Function to update the UI when the slider moves
    function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value); // Get slider value
        
        if (timeFilter === -1) {
            selectedTime.textContent = ''; // Clear time display
            anyTimeLabel.style.visibility = 'visible'; // Show "(any time)"
            selectedTime.style.visibility = 'hidden'; // Hide time
        } else {
            selectedTime.textContent = formatTime(timeFilter); // Display formatted time
            anyTimeLabel.style.visibility = 'hidden'; // Hide "(any time)"
            selectedTime.style.visibility = 'visible'; // Show time
        }
        
        // Call updateScatterPlot to reflect the changes on the map
        updateScatterPlot(timeFilter);
    }
    
    // Bind slider input event
    timeSlider.addEventListener('input', updateTimeDisplay);
    
    // Initialize the display
    updateTimeDisplay();
});