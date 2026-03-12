import "../scss/main.scss";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const map = L.map('mapContainer').setView([55.6050, 13.0038], 9);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const spinner = document.getElementById("spinner");
let markers = [];

function showLoadingSpinner() {
  spinner.style.display = "block";
}

function hideLoadingSpinner() {
  spinner.style.display = "none";
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

function renderMarkers(events) {
  clearMarkers();

  events.forEach(event => {
    const venue = event._embedded?.venues?.[0];
    const { latitude, longitude } = venue?.location || {};
    if (!latitude || !longitude) return;

    const marker = L.circleMarker([parseFloat(latitude), parseFloat(longitude)], {
      radius: 8,
      fillColor: "#ff006e",
      color: "#fff",
      weight: 2,
      fillOpacity: 0.9,
      opacity: 0,
    }).addTo(map);

    setTimeout(() => marker.setStyle({ opacity: 1 }), 50);

    marker.bindPopup(`
      <strong>${event.name}</strong><br>
      ${venue.name}<br>
      ${event.dates.start.localDate}<br>
      <a href="${event.url}" target="_blank" rel="noopener">Biljetter</a>
    `);

    markers.push(marker);
  });

  if (markers.length) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const place = document.getElementById("placeInput").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const category = document.getElementById("categorySelect").value;

  showLoadingSpinner();
  const events = await fetchEvents({ category, startDate, endDate, place });
  hideLoadingSpinner();

  renderMarkers(events);

  if (place) {
    try {
      const geoResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place + ", Skåne, Sweden")}`);
      const geoData = await geoResp.json();
      if (geoData.length) {
        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);
        map.setView([lat, lon], 12);
      } else {
        alert("Platsen kunde inte hittas på kartan.");
      }
    } catch {
      alert("Fel vid geokodning av platsen.");
    }
  } else {
    map.setView([55.6050, 13.0038], 9);
  }
});

(async () => {
  const events = await fetchEvents();
  renderMarkers(events);
})();