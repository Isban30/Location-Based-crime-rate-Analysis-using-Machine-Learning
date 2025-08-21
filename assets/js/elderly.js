window.initMap = function () {
  console.log("Initializing map...");

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: { lat: 15.3173, lng: 75.7139 },
    mapTypeControl: false,
  });

  const infoWindow = new google.maps.InfoWindow({ content: "", disableAutoPan: true });
  const crimeFileName = '../assets/csv/elderly2.csv';
  const markers = [];
  let markerCluster = null;
  let activeCircle = null;

  document.getElementById('crime-select').addEventListener('change', function () {
    const selectedCrime = this.value;
    filterMarkers(selectedCrime);
  });

  fetch(crimeFileName)
    .then((response) => response.text())
    .then((csvData) => {
      const locations = parseCSV(csvData);
      geocodeLocations(locations);
    })
    .catch((error) => {
      console.error("Error loading CSV:", error);
    });

  function parseCSV(csvData) {
    const lines = csvData.split('\n');
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line !== '') {
        const items = line.split(',');
        const year = parseInt(items[0], 10);
        const age = parseInt(items[1], 10);
        const address = items.slice(2, -1).join(',').replace(/"/g, '');
        const crime = items[items.length - 1];

        if (!isNaN(year) && !isNaN(age) && age > 50) {
          result.push({ age, year, crime, address });
        }
      }
    }

    return result;
  }

  async function geocodeLocations(locations) {
    for (const location of locations) {
      try {
        const position = await geocode({ address: location.address });
        createMarker(position, location);
      } catch (error) {
        console.error("Geocode failed:", location.address, error);
      }
    }

    if (markerCluster) {
      markerCluster.clearMarkers();
    }

    markerCluster = new markerClusterer.MarkerClusterer({
      map,
      markers
    });
  }

  function geocode(request) {
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode(request, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
        } else {
          reject(status);
        }
      });
    });
  }

  function createMarker(position, location) {
    const marker = new google.maps.Marker({
      position,
      map,
      title: location.crime,
    });

    marker.addListener("click", () => {
      // Zoom and center
      map.setZoom(13);
      map.panTo(marker.getPosition());

      // Clear old circle
      if (activeCircle) activeCircle.setMap(null);

      // Draw new red circle
      activeCircle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.3,
        map,
        center: marker.getPosition(),
        radius: 800, // fixed radius for elderly analysis
      });

      infoWindow.setContent(`
        <div style="font-family: Arial; font-size: 14px;">
          <strong>Crime:</strong> ${location.crime}<br>
          <strong>Age:</strong> ${location.age}<br>
          <strong>Year:</strong> ${location.year}
        </div>
      `);
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  }

  function filterMarkers(selectedCrime) {
    const visibleMarkers = [];

    markers.forEach(marker => {
      const isVisible = selectedCrime === 'All' || marker.title === selectedCrime;
      marker.setVisible(isVisible);
      if (isVisible) visibleMarkers.push(marker);
    });

    if (markerCluster) {
      markerCluster.clearMarkers();
      markerCluster.addMarkers(visibleMarkers);
    }
  }
};
