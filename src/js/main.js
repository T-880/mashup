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

const apiKey = '3a47e8306ddbe5a1ed0d82b79603a928'; 

async function fetchCoordinates(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
    if (!response.ok) throw new Error("Geocoding API error " + response.status);
    const data = await response.json();
    if (!data.length) return null;
    return { lat: data[0].lat, lon: data[0].lon };
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
}

async function fetchWeather(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=sv`);
    if (!response.ok) throw new Error("Weather API error " + response.status);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

const map = L.map('mapContainer').setView([55.6050, 13.0038], 9);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function createMarker(lat, lon, city, weatherData) {
  const marker = L.marker([lat, lon], {
    icon: new L.Icon({
      iconUrl: markerIcon,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: markerShadow,
      shadowSize: [41, 41]
    })
  }).addTo(map);

  const popupContent = `
    <strong>${city}</strong><br>
    Temp: ${weatherData.main.temp}°C<br>
    Väder: ${weatherData.weather[0].description}<br>
    Vind: ${weatherData.wind.speed} m/s
  `;

  marker.bindPopup(popupContent);
}

async function addCityMarker(city) {
  const coords = await fetchCoordinates(city);
  if (!coords) return;

  const weather = await fetchWeather(city);
  if (!weather) return;

  createMarker(coords.lat, coords.lon, city, weather);
}

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