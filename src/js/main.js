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

/**
 * Hämtar koordinater för en stad via OpenWeather Geocoding API
 * @param {string} city - Namnet på staden
 * @returns {Promise<{lat: number, lon: number} | null>} - Latitud och longitud eller null om ingen data
 */
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

/**
 * Hämtar väderdata för en stad via OpenWeather Weather API
 * @param {string} city - Namnet på staden
 * @returns {Promise<Object|null>} - Weather API-respons eller null
 */
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

/**
 * Skapar en markör på Leaflet-kartan
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 * @param {string} city - Stadens namn
 * @param {Object} weatherData - Väderdata från API
 * @param {boolean} autoOpen - Om popupen ska öppnas automatiskt
 */
function createMarker(lat, lon, city, weatherData, autoOpen = false) {
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

  if (autoOpen) {
  marker.bindPopup(popupContent).openPopup();
} else {
  marker.bindPopup(popupContent);
}

markers.push(marker);
}

/**
 * Renderar markörer för fördefinierade städer
 */
async function addCityMarker(city) {
  const coords = await fetchCoordinates(city);
  if (!coords) return;

  const weather = await fetchWeather(city);
  if (!weather) return;

  createMarker(coords.lat, coords.lon, city, weather);
}

function renderWeatherMarkers() {
  const cities = ["Malmö", "Helsingborg", "Lund", "Kristianstad", "Trelleborg", "Ystad"];
  cities.forEach(addCityMarker);
}

const skaneCitiesCoords = [
  { lat: 55.6050, lon: 13.0038 }, 
  { lat: 56.0465, lon: 12.6945 }, 
  { lat: 55.7047, lon: 13.1910 }, 
  { lat: 56.0396, lon: 14.1562 }, 
  { lat: 55.3780, lon: 13.1570 }, 
  { lat: 55.4290, lon: 13.8200 }, 
];

const bounds = L.latLngBounds(
  skaneCitiesCoords.map(city => [city.lat, city.lon])
);

map.fitBounds(bounds.pad(0.1));

const spinner = document.getElementById("spinner");
let markers = [];

/**
 * Visar loadingspinner
 */
function showLoadingSpinner() {
    spinner.style.display = "block";
}

/**
 * Döljer loadingspinner
 */
function hideLoadingSpinner() {
    spinner.style.display = "none";
}

/**
 * Tar bort alla markers från kartan
 */
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();

const place = document.getElementById("placeInput").value.trim();
  if (!place) return;

    showLoadingSpinner();
    clearMarkers();

    const coords = await fetchCoordinates(place);
    if (!coords) {
        alert("Hittade ingen plats med det namnet.");
        hideLoadingSpinner();
        return;
    }

    const weather = await fetchWeather(place);
    if (!weather) {
        alert("Kunde inte hämta väderdata för platsen.");
        hideLoadingSpinner();
        return;
    }

    createMarker(coords.lat, coords.lon, place, weather, true);
    map.setView([coords.lat, coords.lon], 10);

    hideLoadingSpinner();

});

document.addEventListener("DOMContentLoaded", () => {
  renderWeatherMarkers();
  hideLoadingSpinner();
});