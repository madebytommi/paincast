
const DEFAULT_LAT = 36.1627;
const DEFAULT_LON = -86.7816;

let currentChart = null;

const dom = {
    dashboard: document.getElementById('dashboard'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),

    locationContainer: document.getElementById('location-container'),
    locationDisplay: document.getElementById('location-display'),
    btnManualLocation: document.getElementById('btn-manual-location'),
    btnRefresh: document.getElementById('btn-refresh'),
    modalLocation: document.getElementById('modal-location'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnSubmitLocation: document.getElementById('btn-submit-location'),
    inputLocation: document.getElementById('input-location'),

    painIndexTitle: document.getElementById('pain-index-title'),
    painValue: document.getElementById('pain-index-value'),
    painLabel: document.getElementById('pain-index-label'),
    indexGlow: document.getElementById('index-glow'),

    valTemp: document.getElementById('val-temp'),
    valHum: document.getElementById('val-hum'),
    valPres: document.getElementById('val-pres'),
    valWind: document.getElementById('val-wind'),

    factorTemp: document.getElementById('factor-temp'),
    factorDelta: document.getElementById('factor-delta'),
    factorPres: document.getElementById('factor-pres'),
    factorHum: document.getElementById('factor-hum'),

    chartCanvas: document.getElementById('forecast-chart')
};

function init() {
    setupEventListeners();
    const savedLoc = localStorage.getItem('paincast_location');
    if (savedLoc) {
        const { lat, lon, manual, locationName } = JSON.parse(savedLoc);
        if (manual) {
            fetchData(lat, lon, locationName);
        } else {
            getGeolocation();
        }
    } else {
        getGeolocation();
    }
}

function setupEventListeners() {
    dom.btnManualLocation.addEventListener('click', openModal);
    dom.btnCloseModal.addEventListener('click', closeModal);
    dom.btnSubmitLocation.addEventListener('click', handleManualSubmit);
    dom.btnRefresh.addEventListener('click', refreshData);
    dom.btnRetry.addEventListener('click', refreshData);
}

function refreshData() {
    const savedLoc = localStorage.getItem('paincast_location');
    if (savedLoc) {
        const { lat, lon, locationName } = JSON.parse(savedLoc);
        fetchData(lat, lon, locationName);
    } else {
        getGeolocation();
    }
}

function showLoading() {
    dom.loadingState.classList.remove('d-none');
    dom.dashboard.classList.add('d-none');
    dom.errorState.classList.add('d-none');
}

function showError(msg) {
    dom.errorMessage.textContent = msg;
    dom.errorState.classList.remove('d-none');
    dom.loadingState.classList.add('d-none');
    dom.dashboard.classList.add('d-none');
}

function showDashboard() {
    dom.dashboard.classList.remove('d-none');
    dom.loadingState.classList.add('d-none');
    dom.errorState.classList.add('d-none');
}

function openModal() {
    dom.modalLocation.classList.remove('d-none');
    dom.locationContainer.classList.add('d-none');

    const savedLoc = localStorage.getItem('paincast_location');
    if (savedLoc) {
        const { locationName } = JSON.parse(savedLoc);
        dom.inputLocation.value = locationName || '';
    }
}

function closeModal() {
    dom.modalLocation.classList.add('d-none');
    dom.locationContainer.classList.remove('d-none');
}

function getGeolocation() {
    showLoading();
    dom.locationDisplay.textContent = "Acquiring location...";

    if (!navigator.geolocation) {
        handleLocationError("Geolocation is not supported. Using default.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                const data = await res.json();
                const city = data.city || data.locality || "";
                const state = data.principalSubdivision ? `, ${data.principalSubdivision}` : "";
                const locationName = city ? `${city}${state}` : "Local GPS";

                localStorage.setItem('paincast_location', JSON.stringify({ lat, lon, manual: false, locationName }));
                fetchData(lat, lon, locationName);
            } catch (e) {
                const locationName = "Current Location";
                localStorage.setItem('paincast_location', JSON.stringify({ lat, lon, manual: false, locationName }));
                fetchData(lat, lon, locationName);
            }
        },
        error => {
            console.warn("Geolocation error", error);
            handleLocationError("Location access denied or unavailable. Using default or last known.");
        },
        { timeout: 10000 }
    );
}

function handleLocationError(msg) {
    const savedLoc = localStorage.getItem('paincast_location');
    if (savedLoc) {
        const { lat, lon, locationName } = JSON.parse(savedLoc);
        fetchData(lat, lon, locationName || "Saved Location");
    } else {
        fetchData(DEFAULT_LAT, DEFAULT_LON, "Nashville, TN (Default)");
    }
}

async function handleManualSubmit() {
    const query = dom.inputLocation.value.trim();
    if (!query) {
        alert("Please enter a city or zip code.");
        return;
    }

    try {
        dom.btnSubmitLocation.disabled = true;
        dom.btnSubmitLocation.textContent = "Searching...";

        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(geoUrl, {
            headers: { 'User-Agent': 'PainCastApp/1.0' }
        });
        const geoData = await res.json();

        if (!geoData || geoData.length === 0) {
            alert("Location not found. Please try again.");
            dom.btnSubmitLocation.disabled = false;
            dom.btnSubmitLocation.textContent = "Update";
            return;
        }

        const result = geoData[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);


        let locationName = result.name;
        if (result.display_name) {
            const parts = result.display_name.split(',').map(s => s.trim());
            if (parts.length > 2) {
                locationName = `${parts[0]}, ${parts[1]}`;
            } else {
                locationName = result.display_name;
            }
        }

        localStorage.setItem('paincast_location', JSON.stringify({ lat, lon, manual: true, locationName }));
        closeModal();
        fetchData(lat, lon, locationName);
    } catch (e) {
        console.error(e);
        alert("Failed to reach geocoding service.");
    } finally {
        dom.btnSubmitLocation.disabled = false;
        dom.btnSubmitLocation.textContent = "Update";
    }
}


// --- Logic ---
async function fetchData(lat, lon, locationName) {
    showLoading();
    dom.locationDisplay.textContent = locationName || `GPS Coord: ${lat.toFixed(2)}, ${lon.toFixed(2)}`;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,precipitation_probability&hourly=pressure_msl,temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit&timezone=auto`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather API Error");
        const data = await response.json();
        processWeatherData(data, locationName);
    } catch (err) {
        console.error(err);
        showError("Failed to fetch weather data. Please check your connection or coordinates.");
    }
}

// --- Algorithm ---
function calculatePainFactorScores(temp, humidity, pressure, prevPressure) {
    // 1. Temp score: colder than 59°F increases pain
    let temp_score = Math.max(0, (59 - temp) / 27);

    // 2. Humidity score: over 60% increases
    let hum_score = Math.max(0, (humidity - 60) / 40);

    // 3. Pressure Level score: higher than 1005 increases
    let bp_score = Math.max(0, (pressure - 1005) / 30);

    // 4. Pressure Change score
    let delta = 0;
    if (prevPressure !== null && prevPressure !== undefined) {
        delta = pressure - prevPressure;
    }
    let change_score = Math.min(2, Math.abs(delta) / 5);

    return { temp_score, hum_score, bp_score, change_score, delta };
}

function calculateFinalIndex(scores) {
    const raw = 0.4 * scores.temp_score +
        0.35 * scores.bp_score +
        0.15 * scores.hum_score +
        0.3 * scores.change_score;

    const pain_index = Math.round(1 + 9 * Math.min(1, raw / 1.5));
    return Math.max(1, Math.min(10, pain_index)); // ensure 1-10
}

function getStylesForIndex(index) {
    if (index <= 3) return { text: 'pain-low', bg: 'glow-low', label: 'Low Impact' };
    if (index <= 6) return { text: 'pain-med', bg: 'glow-med', label: 'Moderate Impact' };
    return { text: 'pain-high', bg: 'glow-high', label: 'High Impact' };
}

// --- Data Processing & UI ---
function processWeatherData(data, locationName) {
    const current = data.current;
    const hourly = data.hourly;

    // Find current hour index in hourly array to get previous pressure
    const currentUnix = new Date(current.time).getTime();
    let prevPressure = current.pressure_msl; // fallback
    let currentIndex = 0;

    for (let i = 0; i < hourly.time.length; i++) {
        const hTime = new Date(hourly.time[i]).getTime();
        if (hTime > currentUnix) {
            currentIndex = Math.max(0, i - 1);
            break;
        }
    }

    if (currentIndex > 0) {
        prevPressure = hourly.pressure_msl[currentIndex - 1];
    }

    // Process Current
    const currentScores = calculatePainFactorScores(
        current.temperature_2m,
        current.relative_humidity_2m,
        current.pressure_msl,
        prevPressure
    );

    const currentIndexVal = calculateFinalIndex(currentScores);
    updateDashboardUI(current, currentScores, currentIndexVal, locationName);

    // Process Forecast (Next 24 Hours)
    const forecastData = [];
    const labels = [];

    for (let i = currentIndex; i < currentIndex + 24 && i < hourly.time.length; i++) {
        const t = hourly.temperature_2m[i];
        const h = hourly.relative_humidity_2m[i];
        const p = hourly.pressure_msl[i];
        const prevP = i > 0 ? hourly.pressure_msl[i - 1] : p;

        const fScores = calculatePainFactorScores(t, h, p, prevP);
        const fIndex = calculateFinalIndex(fScores);

        forecastData.push(fIndex);

        const dateObj = new Date(hourly.time[i]);
        labels.push(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    renderChart(labels, forecastData);
    showDashboard();
}

function updateDashboardUI(current, scores, index, locationName) {
    if (locationName) {
        dom.painIndexTitle.textContent = `Pain Index for ${locationName}`;
    } else {
        dom.painIndexTitle.textContent = `Current Pain Index`;
    }

    // Current weather
    dom.valTemp.textContent = `${Math.round(current.temperature_2m)}°F`;
    dom.valHum.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    dom.valPres.textContent = `${Math.round(current.pressure_msl)} hPa`;
    dom.valWind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    // Scores (formatted out of 10 roughly for comparison, or just raw numbers)
    dom.factorTemp.textContent = (scores.temp_score).toFixed(2);
    dom.factorHum.textContent = (scores.hum_score).toFixed(2);
    dom.factorPres.textContent = (scores.bp_score).toFixed(2);

    const deltaPrefix = scores.delta > 0 ? '+' : '';
    dom.factorDelta.textContent = `${deltaPrefix}${scores.delta.toFixed(1)} hPa`;

    // Main Index
    dom.painValue.textContent = index;

    // Clear old classes
    dom.painValue.classList.remove('pain-low', 'pain-med', 'pain-high');
    dom.indexGlow.classList.remove('glow-low', 'glow-med', 'glow-high');

    const styles = getStylesForIndex(index);
    dom.painValue.classList.add(styles.text);
    dom.indexGlow.classList.add(styles.bg);
    dom.painLabel.textContent = styles.label;
    dom.painLabel.className = `text-xl font-medium relative z-10 transition-colors duration-500 ${styles.text}`;
}

// --- Chart.js ---
function renderChart(labels, data) {
    if (currentChart) {
        currentChart.destroy();
    }

    // Chart colors based on values
    const backgroundColors = data.map(val => {
        if (val <= 3) return '#22c55e80';
        if (val <= 6) return '#f59e0b80';
        return '#ef444480';
    });

    const borderColors = data.map(val => {
        if (val <= 3) return '#22c55e';
        if (val <= 6) return '#f59e0b';
        return '#ef4444';
    });

    const ctx = dom.chartCanvas.getContext('2d');

    Chart.defaults.color = '#475569'; // slate-600
    Chart.defaults.font.family = "'Inter', sans-serif";

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pain Index',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b',
                    bodyColor: '#1e293b',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return `Index: ${context.parsed.y} / 10`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                        color: '#33415550'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Boot
document.addEventListener('DOMContentLoaded', init);
