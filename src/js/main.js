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