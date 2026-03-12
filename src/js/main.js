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

    marker.on("click", () => {
        markers.forEach(m => m._path?.classList.remove("active-marker"));
        marker._path?.classList.add("active-marker");
        });

        markers.push(marker);
    });

    if (markers.length) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
    }
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

async function fetchEvents({ category, startDate, endDate, place } = {}) {
    showLoadingSpinner();
    try {
        let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TM_API_KEY}&latlong=55.6050,13.0038&radius=120&unit=km&size=50`;
        if (category) url += `&segmentName=${encodeURIComponent(category)}`;
        if (startDate) url += `&startDateTime=${startDate}T00:00:00Z`;
        if (endDate) url += `&endDateTime=${endDate}T23:59:59Z`;
        if (place) url += `&city=${encodeURIComponent(place)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("API error " + response.status);
        const data = await response.json();
        return data._embedded?.events || [];
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

    showLoadingSpinner();
    const events = await fetchEvents({ category, startDate, endDate, place });
    hideLoadingSpinner();

    renderMarkers(events);
    renderEventCards(events);

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
    renderEventCards(events);
})();