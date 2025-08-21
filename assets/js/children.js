let map;
let locations = [];
const markers = [];
let markerCluster;
const crimeFileName = '../assets/csv/children.csv'; // 🔁 Update this to your actual file

window.initMap = async function () {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: { lat: 15.3173, lng: 75.7139 }, // Karnataka center
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
    console.error("Error reading CSV file:", error);
  }
};

function parseCSV(csvData) {
  const lines = csvData.split('\n');
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const items = line.split(',');
      const year = parseInt(items[0], 10);
      const age = parseInt(items[1], 10);
      const address = items.slice(2, -1).join(',').replace(/"/g, '');
      const crime = items[items.length - 1];

      if (!isNaN(year) && !isNaN(age) && age < 18) {
        result.push({ year, age, crime, address });
      }
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
      const marker = createMarker(position, loc.crime, loc.age, loc.year);
      visibleMarkers.push(marker);
    } catch (err) {
      console.warn("Geocoding failed for:", loc.address, err);
    }
  }

  // Marker clusterer
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

function createMarker(position, crime, age, year) {
  const marker = new google.maps.Marker({
    position,
    map,
    title: crime,
  });

  const infoContent = `
    <div style="font-family: Arial; font-size: 14px;">
      <strong>Crime:</strong> ${crime}<br>
      <strong>Age:</strong> ${age}<br>
      <strong>Year:</strong> ${year}
    </div>
  `;

  marker.addListener("click", () => {
    const info = new google.maps.InfoWindow({
      content: infoContent,
    });
    info.open(map, marker);
  });

  return marker;
}

function filterMarkers(selectedCrime) {
  const filtered = [];

  markers.forEach(marker => {
    const match = selectedCrime === "All" || marker.title === selectedCrime;
    marker.setVisible(match);
    if (match) filtered.push(marker);
  });

  if (markerCluster) {
    markerCluster.clearMarkers();
    markerCluster.addMarkers(filtered);
  }
}
