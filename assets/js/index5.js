window.initMap = function () {
  console.log("Initializing map...");

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: { lat: 15.3173, lng: 75.7139 }, // Center of India
    mapTypeControl: false,
  });

  const infoWindow = new google.maps.InfoWindow({ content: "", disableAutoPan: true });
  let activeCircle = null;
  let crimeFileName = document.getElementById('crime-select').value;

  document.getElementById('crime-select').addEventListener('change', function () {
    crimeFileName = this.value;
    console.log("Reloading map with file:", crimeFileName);
    initMap(); // Reload map with new crime data
  });

  fetch(crimeFileName)
    .then(response => response.text())
    .then(csvData => {
      const crimeType = extractCrimeTypeFromFileName(crimeFileName);
      const locations = parseCSV(csvData, crimeType);
      geocodeLocations(locations);
    })
    .catch(error => console.error("Error reading CSV file:", error));

  function extractCrimeTypeFromFileName(path) {
    const filename = path.split('/').pop();
    return filename.split('_')[0]; // e.g. "RIOTS_data_loc_m_y.csv" → "RIOTS"
  }

  function parseCSV(csvData, crimeType) {
    const lines = csvData.trim().split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const items = line.split(',').map(i => i.trim());
      let place = items.slice(0, -2).join(',').replace(/"/g, '');

      // Deduplicate location fragments
      place = [...new Set(place.split(',').map(p => p.trim()))].join(', ');

      if (!place.toLowerCase().includes('india')) {
        place += ', India';
      }

      const count = parseInt(items[items.length - 2], 10);
      const year = parseInt(items[items.length - 1], 10);

      if (!isNaN(count) && !isNaN(year)) {
        result.push({ place, year, count, crimeType });
      }
    }

    return result;
  }

  async function geocodeLocations(locations) {
    const markers = [];
    const failed = [];

    for (const loc of locations) {
      try {
        const position = await geocode({ address: loc.place });
        const marker = createMarker(position, loc);
        markers.push(marker);
      } catch (err) {
        console.warn("Geocoding failed for:", loc.place, err);
        failed.push(loc.place);
      }
    }

    const { MarkerClusterer } = window.markerClusterer;
    new MarkerClusterer({ map, markers });
  }

  function geocode(request) {
    const geocoder = new google.maps.Geocoder();
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

  function createMarker(position, { crimeType, count, year }) {
    const marker = new google.maps.Marker({
      position,
      map,
      title: `${crimeType} (${year})`,
      label: {
        text: count.toString(),
        color: 'white',
        fontWeight: 'bold',
      },
    });

    marker.addListener("click", () => {
      map.setZoom(13);
      map.panTo(marker.getPosition());

      // Remove old circle
      if (activeCircle) {
        activeCircle.setMap(null);
      }

      // Draw new circle
      activeCircle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.3,
        map,
        center: marker.getPosition(),
        radius: 1000 + count * 100, // Bigger radius = more incidents
      });

      // Show info window with details
      infoWindow.setContent(`
        <div style="font-family: Arial; font-size: 14px;">
          <strong>Crime Type:</strong> ${crimeType}<br>
          <strong>Number of Incidents:</strong> ${count}<br>
          <strong>Year:</strong> ${year}
        </div>
      `);
      infoWindow.open(map, marker);
    });

    return marker;
  }
};
