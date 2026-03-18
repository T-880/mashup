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
   markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const markersCluster = L.markerClusterGroup();
    
    const cityFallback = {
        "köpenhamn": [55.6761, 12.5683],
        "copenhagen s": [55.675, 12.58],
        "copenhagen k": [55.676, 12.57],
        "kløverparken": [55.666, 12.62],
        "malmö": [55.6050, 13.0038],
        "malmo": [55.6050, 13.0038],
        "helsingborg": [56.0465, 12.6945],
        "lund": [55.7047, 13.1910],
        "trelleborg": [55.378, 13.157],
        "falsterbo": [55.385, 12.825]
    };

    events.forEach(event => {
        const venue = event._embedded?.venues?.[0];
let latitude = venue?.location?.latitude;
        let longitude = venue?.location?.longitude;

        if (!latitude || !longitude) {
           const cityName = (venue?.city?.name || "").trim().toLowerCase();
            if (cityFallback[cityName]) {
                const jitter = 0.002;
                latitude = cityFallback[cityName][0] + (Math.random() - 0.5) * jitter;
                longitude = cityFallback[cityName][1] + (Math.random() - 0.5) * jitter;
            } else {
                const jitter = 0.02;
                latitude = 55.6050 + (Math.random() - 0.5) * jitter;
                longitude = 13.0038 + (Math.random() - 0.5) * jitter;
                console.log("Ingen koordinat/fallback:", event.name, cityName);
            }
        }

        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);
        
        const marker = L.marker([latitude, longitude]);

        marker.bindPopup(`<strong>${event.name}</strong><br>${venue?.name || "Okänd arena"}<br>${event.dates.start.localDate}<br><a href="${event.url}" target="_blank" rel="noopener">Biljetter</a>`);

        markersCluster.addLayer(marker);
        markers.push(marker);
    });

    map.addLayer(markersCluster);

    if (markers.length) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
    }

    console.log("Totalt markerade events:", markers.length);

}

function formatEventDate(dateString, timeString) {
    const date = new Date(dateString + "T" + (timeString || "00:00:00"));

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    };

    const formattedDate = date.toLocaleDateString("sv-SE", options);

    if (timeString) {
        const time = date.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit"
        });
        return `${formattedDate} kl. ${time}`;
    }

    return formattedDate;
}

function renderEventCards(events) {
    const container = document.getElementById("eventsContainer");
    container.innerHTML = "";

    events.forEach((event, index) => {
        const venue = event._embedded?.venues?.[0];
        const image = event.images?.[0]?.url || "";

        const card = document.createElement("div");
        card.className = "eventCard";

        card.innerHTML = `
      <img src="${image}" alt="${event.name}">
      <h3>${event.name}</h3>
      <p>${formatEventDate(event.dates.start.localDate, event.dates.start.localTime)}</p>
      <p>${venue?.name || "Okänd arena"}</p>
      <a href="${event.url}" target="_blank" rel="noopener">Mer information</a>
    `;

        container.appendChild(card);

        setTimeout(() => card.classList.add("show"), index * 100);
    });
}

const TM_API_KEY = "x4cCOD7dmBqja2AkM4bTsbzYa9WExx5O";

async function fetchEvents({ category, startDate, endDate, place, cities } = {}) {
    showLoadingSpinner();
    try {
        let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TM_API_KEY}&latlong=55.6050,13.0038&radius=120&unit=km&size=50`;
        if (category) url += `&segmentName=${encodeURIComponent(category)}`;
        if (startDate) url += `&startDateTime=${startDate}T00:00:00Z`;
        if (endDate) url += `&endDateTime=${endDate}T23:59:59Z`;
        if (place) url += `&keyword=${encodeURIComponent(place)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("API error " + response.status);
        const data = await response.json();

        let eventsData = data._embedded?.events || [];

        if (cities && cities.length > 0) {
      const cityMap = {
        "copenhagen": "Köpenhamn",
                "copenhagen, dk": "Köpenhamn",
                "københavn": "Köpenhamn",
                "københavn s": "Köpenhamn",
                "københavn k": "Köpenhamn",
                "kløverparken": "Köpenhamn",
                "malmo": "Malmö",
                "malmö": "Malmö",
                "helsingborg": "Helsingborg",
                "lund": "Lund"
                };
    
      const selectedRealCities = cities.filter(c => c !== "Övriga").map(c => c.toLowerCase());
    const includeOthers = cities.includes("Övriga");
    const knownCities = Object.values(cityMap).map(c => c.toLowerCase());

      eventsData = eventsData.filter(event => {
        const venue = event._embedded?.venues?.[0];
        if (!venue || !venue.city?.name) return false;

let apiCity = (venue.city?.name || venue.state?.name || venue.name || venue.address?.line1 || "")
                    .trim()
                    .toLowerCase();

        const cityName = cityMap[apiCity] || apiCity;

const isSelected = selectedRealCities.includes(cityName.toLowerCase());
                const isOther = includeOthers && !knownCities.includes(cityName.toLowerCase());

                return isSelected || isOther;
      });
    }

    return eventsData;

    } catch (err) {
        console.error(err);
        alert("Kunde inte hämta evenemang.");
        return [];
    } finally {
        hideLoadingSpinner();
    }
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