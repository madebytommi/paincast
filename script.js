
const DEFAULT_LAT = 36.1627;
const DEFAULT_LON = -86.7816;
const THEME_STORAGE_KEY = 'vaporcast_theme';
const LEGACY_THEME_STORAGE_KEY = 'retrocast_theme';
const LOCATION_STORAGE_KEY = 'vaporcast_location';
const LEGACY_LOCATION_STORAGE_KEY = 'retrocast_location';
const FORECAST_VIEW_STORAGE_KEY = 'vaporcast_forecast_view';
const LEGACY_FORECAST_VIEW_STORAGE_KEY = 'retrocast_forecast_view';
const THEME_ORDER = ['light', 'dark', 'retro', 'contrast'];
const SUPPORTED_FORECAST_VIEWS = ['today', 'hourly', 'seven-day', 'insights', 'air-quality'];

let currentChart = null;
let chartState = null;
let activeForecastView = 'today';

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat([], { weekday: 'short' });
const DAY_DATE_FORMATTER = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' });
const WEATHER_CODE_MAP = {
    0: { label: 'Clear Skies', icon: 'fa-sun' },
    1: { label: 'Mostly Clear', icon: 'fa-sun' },
    2: { label: 'Partly Cloudy', icon: 'fa-cloud-sun' },
    3: { label: 'Overcast', icon: 'fa-cloud' },
    45: { label: 'Foggy', icon: 'fa-smog' },
    48: { label: 'Rime Fog', icon: 'fa-smog' },
    51: { label: 'Light Drizzle', icon: 'fa-cloud-rain' },
    53: { label: 'Drizzle', icon: 'fa-cloud-rain' },
    55: { label: 'Dense Drizzle', icon: 'fa-cloud-rain' },
    56: { label: 'Freezing Drizzle', icon: 'fa-cloud-meatball' },
    57: { label: 'Heavy Freezing Drizzle', icon: 'fa-cloud-meatball' },
    61: { label: 'Light Rain', icon: 'fa-cloud-rain' },
    63: { label: 'Rain', icon: 'fa-cloud-showers-heavy' },
    65: { label: 'Heavy Rain', icon: 'fa-cloud-showers-heavy' },
    66: { label: 'Light Freezing Rain', icon: 'fa-cloud-meatball' },
    67: { label: 'Freezing Rain', icon: 'fa-cloud-meatball' },
    71: { label: 'Light Snow', icon: 'fa-snowflake' },
    73: { label: 'Snow', icon: 'fa-snowflake' },
    75: { label: 'Heavy Snow', icon: 'fa-snowflake' },
    77: { label: 'Snow Grains', icon: 'fa-snowflake' },
    80: { label: 'Rain Showers', icon: 'fa-cloud-sun-rain' },
    81: { label: 'Strong Showers', icon: 'fa-cloud-showers-heavy' },
    82: { label: 'Violent Showers', icon: 'fa-cloud-showers-heavy' },
    85: { label: 'Snow Showers', icon: 'fa-cloud-snow' },
    86: { label: 'Heavy Snow Showers', icon: 'fa-cloud-snow' },
    95: { label: 'Thunderstorm', icon: 'fa-cloud-bolt' },
    96: { label: 'Thunderstorm with Hail', icon: 'fa-cloud-bolt' },
    99: { label: 'Severe Thunderstorm', icon: 'fa-cloud-bolt' }
};

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
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeDropdownMenu: document.getElementById('theme-dropdown-menu'),
    themeToggleIcon: document.getElementById('theme-toggle-icon'),
    themeToggleLabel: document.getElementById('theme-toggle-label'),
    themeOptions: document.querySelectorAll('.theme-option'),
    btnAudioToggle: document.getElementById('btn-audio-toggle'),
    audioToggleIcon: document.getElementById('audio-toggle-icon'),
    audioToggleLabel: document.getElementById('audio-toggle-label'),
    retroAudio: document.getElementById('retro-audio'),
    viewButtons: document.querySelectorAll('.forecast-view-btn'),
    todaySection: document.getElementById('today-section'),
    hourlySection: document.getElementById('hourly-section'),
    sevenDaySection: document.getElementById('seven-day-section'),
    insightsSection: document.getElementById('insights-section'),
    airQualitySection: document.getElementById('air-quality-section'),

    currentConditionsTitle: document.getElementById('current-conditions-title'),
    currentWeatherIcon: document.getElementById('current-weather-icon'),
    currentTempValue: document.getElementById('current-temp-value'),
    currentConditionLabel: document.getElementById('current-condition-label'),
    currentFeelsLike: document.getElementById('current-feels-like'),
    indexGlow: document.getElementById('index-glow'),

    valTemp: document.getElementById('val-temp'),
    valHum: document.getElementById('val-hum'),
    valPres: document.getElementById('val-pres'),
    valWind: document.getElementById('val-wind'),

    insightUv: document.getElementById('insight-uv'),
    insightAir: document.getElementById('insight-air'),
    insightDew: document.getElementById('insight-dew'),
    insightSun: document.getElementById('insight-sun'),

    chartCanvas: document.getElementById('forecast-chart'),
    weeklyOutlook: document.getElementById('weekly-outlook')
};

function init() {
    setupEventListeners();
    const savedForecastView = getStoredValue(FORECAST_VIEW_STORAGE_KEY, LEGACY_FORECAST_VIEW_STORAGE_KEY);
    if (savedForecastView && SUPPORTED_FORECAST_VIEWS.includes(savedForecastView)) {
        activeForecastView = savedForecastView;
    }
    setForecastView(activeForecastView);
    initTheme();
    initAudio();

    const savedLoc = localStorage.getItem(LOCATION_STORAGE_KEY);
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

function getStoredValue(primaryKey, legacyKey) {
    const storedValue = localStorage.getItem(primaryKey) ?? localStorage.getItem(legacyKey);
    if (storedValue !== null && storedValue !== undefined && localStorage.getItem(primaryKey) === null) {
        localStorage.setItem(primaryKey, storedValue);
    }
    return storedValue;
}

function setupEventListeners() {
    dom.btnManualLocation.addEventListener('click', openModal);
    dom.btnCloseModal.addEventListener('click', closeModal);
    dom.btnSubmitLocation.addEventListener('click', handleManualSubmit);
    dom.btnRefresh.addEventListener('click', refreshData);
    dom.btnRetry.addEventListener('click', refreshData);
    dom.btnThemeToggle.addEventListener('click', toggleThemeDropdown);
    if (dom.btnAudioToggle) dom.btnAudioToggle.addEventListener('click', toggleAudio);

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);

    dom.themeOptions.forEach(option => {
        option.addEventListener('click', handleThemeSelect);
    });

    dom.viewButtons.forEach(button => {
        button.addEventListener('click', handleViewSwitch);
    });
}

function handleViewSwitch(event) {
    event.preventDefault();
    const nextView = event.currentTarget.dataset.viewTarget;
    setForecastView(nextView);
}

function setForecastView(view) {
    const normalizedView = SUPPORTED_FORECAST_VIEWS.includes(view) ? view : 'today';
    activeForecastView = normalizedView;
    localStorage.setItem(FORECAST_VIEW_STORAGE_KEY, normalizedView);
    localStorage.removeItem(LEGACY_FORECAST_VIEW_STORAGE_KEY);

    dom.viewButtons.forEach(button => {
        const isActive = button.dataset.viewTarget === normalizedView;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    if (dom.todaySection) {
        dom.todaySection.classList.toggle('d-none', normalizedView !== 'today');
    }

    if (dom.hourlySection) {
        dom.hourlySection.classList.toggle('d-none', normalizedView !== 'hourly');
    }

    if (dom.sevenDaySection) {
        dom.sevenDaySection.classList.toggle('d-none', normalizedView !== 'seven-day');
    }

    if (dom.insightsSection) {
        dom.insightsSection.classList.toggle('d-none', normalizedView !== 'insights');
    }

    if (dom.airQualitySection) {
        dom.airQualitySection.classList.toggle('d-none', normalizedView !== 'air-quality');
    }
}

function toggleAudio() {
    if (!dom.retroAudio) return;
    const audio = dom.retroAudio;
    if (audio.paused) {
        audio.play().then(() => {
            updateAudioUI(false);
        }).catch(err => {
            console.warn('Audio play failed', err);
        });
    } else {
        audio.pause();
        updateAudioUI(true);
    }
}

function updateAudioUI(paused) {
    if (!dom.btnAudioToggle) return;
    if (paused) {
        if (dom.audioToggleIcon) dom.audioToggleIcon.className = 'fa-solid fa-play me-1';
        if (dom.audioToggleLabel) dom.audioToggleLabel.textContent = 'Music';
        dom.btnAudioToggle.setAttribute('aria-pressed', 'false');
    } else {
        if (dom.audioToggleIcon) dom.audioToggleIcon.className = 'fa-solid fa-pause me-1';
        if (dom.audioToggleLabel) dom.audioToggleLabel.textContent = 'Stop';
        dom.btnAudioToggle.setAttribute('aria-pressed', 'true');
    }
}

function initAudio() {
    if (!dom.retroAudio || !dom.btnAudioToggle) return;
    updateAudioUI(dom.retroAudio.paused);
    dom.retroAudio.addEventListener('play', () => updateAudioUI(false));
    dom.retroAudio.addEventListener('pause', () => updateAudioUI(true));
    dom.retroAudio.addEventListener('ended', () => updateAudioUI(true));
}

function toggleThemeDropdown(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!dom.themeDropdownMenu) {
        return;
    }

    const isOpen = dom.themeDropdownMenu.classList.toggle('show');
    dom.btnThemeToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeThemeDropdown() {
    if (!dom.themeDropdownMenu) {
        return;
    }

    dom.themeDropdownMenu.classList.remove('show');
    dom.btnThemeToggle.setAttribute('aria-expanded', 'false');
}

function handleDocumentClick(event) {
    if (!dom.themeDropdownMenu || !dom.btnThemeToggle) {
        return;
    }

    const clickedInsideMenu = dom.themeDropdownMenu.contains(event.target);
    const clickedToggle = dom.btnThemeToggle.contains(event.target);

    if (!clickedInsideMenu && !clickedToggle) {
        closeThemeDropdown();
    }
}

function handleDocumentKeydown(event) {
    if (event.key === 'Escape') {
        closeThemeDropdown();
    }
}

function initTheme() {
    const savedTheme = getStoredValue(THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEY);
    // Default to 'retro' when no user preference is saved.
    const theme = THEME_ORDER.includes(savedTheme) ? savedTheme : 'retro';

    applyTheme(theme);
}

function handleThemeSelect(event) {
    const selectedTheme = event.currentTarget.dataset.themeValue;
    if (!THEME_ORDER.includes(selectedTheme)) {
        return;
    }

    applyTheme(selectedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    closeThemeDropdown();

    if (chartState) {
        renderChart(chartState.labels, chartState.data, chartState.conditionCodes || []);
    }
}

function applyTheme(theme) {
    const activeTheme = THEME_ORDER.includes(theme) ? theme : 'light';
    const toggleMap = {
        light: { label: 'Theme: Light', icon: 'fa-sun' },
        dark: { label: 'Theme: Dark', icon: 'fa-moon' },
        retro: { label: 'Theme: Retro', icon: 'fa-tv' },
        contrast: { label: 'Theme: High Contrast', icon: 'fa-circle-half-stroke' }
    };

    document.body.dataset.theme = activeTheme;
    document.documentElement.setAttribute('data-bs-theme', activeTheme === 'light' ? 'light' : 'dark');

    if (dom.themeToggleLabel) {
        dom.themeToggleLabel.textContent = toggleMap[activeTheme].label;
    }

    if (dom.themeToggleIcon) {
        dom.themeToggleIcon.className = `fa-solid ${toggleMap[activeTheme].icon} me-1`;
    }

    dom.themeOptions.forEach(option => {
        const isActive = option.dataset.themeValue === activeTheme;
        option.classList.toggle('active', isActive);
        option.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
}

function refreshData() {
    const savedLoc = getStoredValue(LOCATION_STORAGE_KEY, LEGACY_LOCATION_STORAGE_KEY);
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

    const savedLoc = getStoredValue(LOCATION_STORAGE_KEY, LEGACY_LOCATION_STORAGE_KEY);
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

                localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lon, manual: false, locationName }));
                localStorage.removeItem(LEGACY_LOCATION_STORAGE_KEY);
                fetchData(lat, lon, locationName);
            } catch (e) {
                const locationName = "Current Location";
                localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lon, manual: false, locationName }));
                localStorage.removeItem(LEGACY_LOCATION_STORAGE_KEY);
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
    const savedLoc = getStoredValue(LOCATION_STORAGE_KEY, LEGACY_LOCATION_STORAGE_KEY);
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
            headers: { 'User-Agent': 'VaporCastApp/1.0' }
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

        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lon, manual: true, locationName }));
        localStorage.removeItem(LEGACY_LOCATION_STORAGE_KEY);
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

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,precipitation_probability,weather_code,uv_index,dew_point_2m&hourly=pressure_msl,temperature_2m,relative_humidity_2m,weather_code&daily=sunrise,sunset&temperature_unit=fahrenheit&timezone=auto`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;

    try {
        const [weatherResponse, airResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(airUrl)
        ]);

        if (!weatherResponse.ok) throw new Error('Weather API Error');

        const weatherData = await weatherResponse.json();
        const airData = airResponse.ok ? await airResponse.json() : null;

        processWeatherData(weatherData, locationName, airData);
    } catch (err) {
        console.error(err);
        showError("Failed to fetch weather data. Please check your connection or coordinates.");
    }
}

// --- Weather Scoring Algorithm ---
function calculateWeatherImpactScores(temp, humidity, pressure, prevPressure) {
    // 1. Temp score: colder than 59°F increases weather impact
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

function calculateImpactIndex(scores) {
    const raw = 0.4 * scores.temp_score +
        0.35 * scores.bp_score +
        0.15 * scores.hum_score +
        0.3 * scores.change_score;

    const impactIndex = Math.round(1 + 9 * Math.min(1, raw / 1.5));
    return Math.max(1, Math.min(10, impactIndex)); // ensure 1-10
}

function getStylesForIndex(index) {
    if (index <= 3) return { text: 'impact-low', bg: 'glow-low', label: 'Low Impact' };
    if (index <= 6) return { text: 'impact-med', bg: 'glow-med', label: 'Moderate Impact' };
    return { text: 'impact-high', bg: 'glow-high', label: 'High Impact' };
}

// --- Data Processing & UI ---
function processWeatherData(data, locationName, airData) {
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
    const currentScores = calculateWeatherImpactScores(
        current.temperature_2m,
        current.relative_humidity_2m,
        current.pressure_msl,
        prevPressure
    );

    const currentIndexVal = calculateImpactIndex(currentScores);
    updateDashboardUI(current, currentScores, currentIndexVal, locationName, data.daily, airData);

    // Process Forecast (Next 24 Hours)
    const forecastTemps = [];
    const forecastCodes = [];
    const labels = [];

    for (let i = currentIndex; i < currentIndex + 24 && i < hourly.time.length; i++) {
        forecastTemps.push(Math.round(hourly.temperature_2m[i]));
        forecastCodes.push(hourly.weather_code[i]);

        const dateObj = new Date(hourly.time[i]);
        labels.push(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    renderChart(labels, forecastTemps, forecastCodes);
    renderWeeklyOutlook(buildWeeklyOutlook(hourly, currentIndex));
    showDashboard();
}

function buildWeeklyOutlook(hourly, startIndex) {
    const dayBuckets = [];

    for (let i = startIndex; i < hourly.time.length; i++) {
        const date = new Date(hourly.time[i]);
        const dayKey = hourly.time[i].split('T')[0];
        let bucket = dayBuckets[dayBuckets.length - 1];

        if (!bucket || bucket.dayKey !== dayKey) {
            bucket = {
                dayKey,
                date,
                temps: [],
                humidity: [],
                pressure: [],
                weatherCodes: []
            };
            dayBuckets.push(bucket);
        }

        bucket.temps.push(hourly.temperature_2m[i]);
        bucket.humidity.push(hourly.relative_humidity_2m[i]);
        bucket.pressure.push(hourly.pressure_msl[i]);
        bucket.weatherCodes.push(hourly.weather_code[i]);

        if (dayBuckets.length === 7 && i < hourly.time.length - 1) {
            const nextDay = hourly.time[i + 1].split('T')[0];
            if (nextDay !== dayKey) {
                break;
            }
        }
    }

    return dayBuckets.slice(0, 7).map(bucket => {
        const avgHumidity = average(bucket.humidity);
        const dominantCode = getDominantWeatherCode(bucket.weatherCodes);
        const weather = getWeatherPresentation(dominantCode);

        return {
            dayLabel: DAY_LABEL_FORMATTER.format(bucket.date),
            dateLabel: DAY_DATE_FORMATTER.format(bucket.date),
            conditionLabel: weather.label,
            weatherIcon: weather.icon,
            tempLow: Math.round(Math.min(...bucket.temps)),
            tempHigh: Math.round(Math.max(...bucket.temps)),
            avgHumidity: Math.round(avgHumidity)
        };
    });
}

function average(values) {
    if (!values.length) {
        return 0;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
}

function getDominantWeatherCode(codes) {
    if (!codes || !codes.length) {
        return 2;
    }

    const counts = new Map();
    for (const code of codes) {
        counts.set(code, (counts.get(code) || 0) + 1);
    }

    let topCode = codes[0];
    let topCount = 0;
    for (const [code, count] of counts.entries()) {
        if (count > topCount) {
            topCode = code;
            topCount = count;
        }
    }

    return topCode;
}

function getWeatherPresentation(weatherCode) {
    const fallback = { label: 'Current Conditions', icon: 'fa-cloud-sun' };
    return WEATHER_CODE_MAP[weatherCode] || fallback;
}

function getAqiLabel(aqiValue) {
    if (aqiValue <= 50) return 'Good';
    if (aqiValue <= 100) return 'Moderate';
    if (aqiValue <= 150) return 'Unhealthy SG';
    if (aqiValue <= 200) return 'Unhealthy';
    if (aqiValue <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

function formatLocalTime(isoValue) {
    if (!isoValue) return '--';
    const date = new Date(isoValue);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function updateDashboardUI(current, scores, index, locationName, daily, airData) {
    if (locationName) {
        dom.currentConditionsTitle.textContent = `Current Conditions in ${locationName}`;
    } else {
        dom.currentConditionsTitle.textContent = 'Current Conditions';
    }

    // Current weather
    dom.valTemp.textContent = `${Math.round(current.temperature_2m)}°F`;
    dom.valHum.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    dom.valPres.textContent = `${Math.round(current.pressure_msl)} hPa`;
    dom.valWind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    const weatherPresentation = getWeatherPresentation(current.weather_code);
    dom.currentWeatherIcon.className = `fa-solid ${weatherPresentation.icon} fs-1 mb-2 position-relative text-primary-light`;
    dom.currentTempValue.textContent = Math.round(current.temperature_2m);
    dom.currentConditionLabel.textContent = weatherPresentation.label;
    dom.currentFeelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°F`;

    // Weather Insights
    dom.insightUv.textContent = current.uv_index !== undefined && current.uv_index !== null
        ? Number(current.uv_index).toFixed(1)
        : '--';

    dom.insightDew.textContent = current.dew_point_2m !== undefined && current.dew_point_2m !== null
        ? `${Math.round(current.dew_point_2m)}°F`
        : '--';

    const sunrise = daily && daily.sunrise && daily.sunrise.length ? daily.sunrise[0] : null;
    const sunset = daily && daily.sunset && daily.sunset.length ? daily.sunset[0] : null;
    dom.insightSun.textContent = `${formatLocalTime(sunrise)} / ${formatLocalTime(sunset)}`;

    const aqi = airData && airData.current ? airData.current.us_aqi : null;
    dom.insightAir.textContent = aqi !== null && aqi !== undefined
        ? `${Math.round(aqi)} (${getAqiLabel(aqi)})`
        : 'Unavailable';

    // Keep glow behavior tied to weather volatility score tiers.
    dom.indexGlow.classList.remove('glow-low', 'glow-med', 'glow-high');
    const styles = getStylesForIndex(index);
    dom.indexGlow.classList.add(styles.bg);
}

function renderWeeklyOutlook(days) {
    dom.weeklyOutlook.innerHTML = days.map(day => {
        const avgTemp = (day.tempHigh + day.tempLow) / 2;
        const toneClass = avgTemp <= 50 ? 'weekly-card-low' : avgTemp <= 75 ? 'weekly-card-med' : 'weekly-card-high';

        return `
            <article class="weekly-card ${toneClass}">
                <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
                    <div>
                        <p class="weekly-card-day mb-1">${day.dayLabel}</p>
                        <p class="weekly-card-date mb-0">${day.dateLabel}</p>
                    </div>
                    <div class="weekly-card-index-wrap text-end">
                        <i class="fa-solid ${day.weatherIcon} fs-3 text-primary-light"></i>
                    </div>
                </div>
                <div class="weekly-card-meta">
                    <span>High ${day.tempHigh}°F / Low ${day.tempLow}°F</span>
                    <span class="weekly-card-label">${day.conditionLabel}</span>
                </div>
            </article>
        `;
    }).join('');
}

// --- Chart.js ---
function renderChart(labels, data, conditionCodes = []) {
    chartState = {
        labels: [...labels],
        data: [...data],
        conditionCodes: [...conditionCodes]
    };

    if (currentChart) {
        currentChart.destroy();
    }

    // Chart colors based on values
    const activeTheme = document.body.dataset.theme || 'light';
    const isRetroTheme = activeTheme === 'retro';
    const isDarkLikeTheme = activeTheme === 'dark' || activeTheme === 'contrast';
    const isContrastTheme = activeTheme === 'contrast';
    const chartTextColor = isContrastTheme ? '#ffffff' : isRetroTheme ? '#f7f1d8' : isDarkLikeTheme ? '#b8c6d4' : '#475569';
    const chartGridColor = isContrastTheme ? '#ffffff66' : isRetroTheme ? '#b8c5ff55' : isDarkLikeTheme ? '#5872864d' : '#33415550';
    const tooltipBg = isRetroTheme
        ? 'rgba(44, 58, 109, 0.98)'
        : isContrastTheme
        ? 'rgba(0, 0, 0, 1)'
        : isDarkLikeTheme
            ? 'rgba(14, 24, 31, 0.96)'
            : 'rgba(255, 255, 255, 0.9)';
    const tooltipText = isRetroTheme ? '#fff7d4' : isContrastTheme ? '#ffffff' : isDarkLikeTheme ? '#dbe9f6' : '#1e293b';
    const tooltipBorder = isRetroTheme ? '#ffe48a' : isContrastTheme ? '#ffffff' : isDarkLikeTheme ? '#385061' : '#cbd5e1';
    const barColors = isRetroTheme
        ? { cool: '#6de4d6cc', mild: '#ffd36ecc', warm: '#ff8c8ccc' }
        : { cool: '#22c55e80', mild: '#f59e0b80', warm: '#ef444480' };
    const barBorders = isRetroTheme
        ? { cool: '#6de4d6', mild: '#ffd36e', warm: '#ff8c8c' }
        : { cool: '#22c55e', mild: '#f59e0b', warm: '#ef4444' };

    const ctx = dom.chartCanvas.getContext('2d');

    Chart.defaults.color = chartTextColor;
    Chart.defaults.font.family = isRetroTheme ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif";

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature',
                data: data,
                backgroundColor: data.map(val => {
                    if (val <= 50) return barColors.cool;
                    if (val <= 75) return barColors.mild;
                    return barColors.warm;
                }),
                borderColor: data.map(val => {
                    if (val <= 50) return barBorders.cool;
                    if (val <= 75) return barBorders.mild;
                    return barBorders.warm;
                }),
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
                    backgroundColor: tooltipBg,
                    titleColor: tooltipText,
                    bodyColor: tooltipText,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return `Temp: ${context.parsed.y}°F`;
                        },
                        afterLabel: function (context) {
                            const weather = getWeatherPresentation(conditionCodes[context.dataIndex]);
                            return `Condition: ${weather.label}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: chartGridColor
                    },
                    ticks: {
                        callback: function (value) {
                            return `${value}°`;
                        }
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
