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

document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const place = document.getElementById("placeInput").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const category = document.getElementById("categorySelect").value;

      const cityCheckboxes = document.querySelectorAll('input[name="city"]:checked');
  const selectedCities = Array.from(cityCheckboxes).map(cb => cb.value);

    showLoadingSpinner();
    const events = await fetchEvents({ category, startDate, endDate, place, cities: selectedCities });
    hideLoadingSpinner();

    renderMarkers(events);
    renderEventCards(events);

    if (place) {
        map.setView([55.6050, 13.0038], 9);
    }
});

(async () => {
    const events = await fetchEvents();
    renderMarkers(events);
    renderEventCards(events);
})();