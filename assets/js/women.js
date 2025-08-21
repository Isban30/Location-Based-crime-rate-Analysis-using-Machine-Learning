let map;
let locations = [];
const markers = [];
let markerCluster;
const crimeFileName = '../assets/csv/women.csv'; // Adjust path if needed

window.initMap = async function () {
  console.log("Initializing map...");

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: { lat: 23.5937, lng: 80.9629 }, // India center
    mapTypeControl: false,
  });

  document.getElementById('crime-select').addEventListener('change', function () {
    const selectedCrime = this.value;
    filterMarkers(selectedCrime);
  });

  try {
    const response = await fetch(crimeFileName);
    const csvData = await response.text();
    locations = parseCSV(csvData);
    await geocodeLocations(locations);
  } catch (error) {
    console.error("Error loading CSV:", error);
  }
};

function parseCSV(csvData) {
  const lines = csvData.trim().split('\n');
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex to split CSV with commas inside quotes
    const match = line.match(/^(.*?),(.*?),(.*?),(.+)$/);
    if (!match) continue;

    const year = parseInt(match[1], 10);
    const age = parseInt(match[2], 10);
    const address = match[3].replace(/"/g, '').trim();
    const crime = match[4].replace(/"/g, '').trim();

    if (!isNaN(year) && !isNaN(age) && address.length > 2) {
      result.push({ year, age, address, crime });
    }
  }

  return result;
}

async function geocodeLocations(locations) {
  const geocoder = new google.maps.Geocoder();
  const visibleMarkers = [];

  for (const loc of locations) {
    try {
      const position = await geocode(geocoder, { address: loc.address });
      const marker = createMarker(position, loc);
      visibleMarkers.push(marker);
    } catch (err) {
      console.warn("Geocoding failed for:", loc.address, err);
    }

    await new Promise(r => setTimeout(r, 200)); // avoid Google rate limit
  }

  markerCluster = new markerClusterer.MarkerClusterer({
    map,
    markers: visibleMarkers,
  });

  markers.push(...visibleMarkers);
}

function geocode(geocoder, request) {
  return new Promise((resolve, reject) => {
    geocoder.geocode(request, (results, status) => {
      if (status === "OK" && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        reject(status);
      }
    });
  });
}

function createMarker(position, loc) {
  const marker = new google.maps.Marker({
    position,
    map,
    title: loc.crime,
  });

  const info = new google.maps.InfoWindow({
    content: `
      <div style="font-family: Arial; font-size: 14px;">
        <strong>Crime:</strong> ${loc.crime}<br>
        <strong>Age:</strong> ${loc.age}<br>
        <strong>Year:</strong> ${loc.year}
      </div>
    `,
  });

  marker.addListener("click", () => {
    info.open(map, marker);
  });

  return marker;
}

function filterMarkers(selectedCrime) {
  const filteredMarkers = [];

  markers.forEach(marker => {
    const match = selectedCrime === "All" || marker.title === selectedCrime;
    marker.setVisible(match);
    if (match) filteredMarkers.push(marker);
  });

  if (markerCluster) {
    markerCluster.clearMarkers();
    markerCluster.addMarkers(filteredMarkers);
  }
}
