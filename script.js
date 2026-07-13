
const DEFAULT_LAT = 36.1627;
const DEFAULT_LON = -86.7816;
const THEME_STORAGE_KEY = 'paincast_theme';
const THEME_ORDER = ['light', 'dark', 'retro', 'contrast'];

let currentChart = null;
let chartState = null;
let modalOpener = null;

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat([], { weekday: 'short' });
const DAY_DATE_FORMATTER = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' });

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

    chartCanvas: document.getElementById('forecast-chart'),
    weeklyOutlook: document.getElementById('weekly-outlook'),
    locationUnavailableState: document.getElementById('location-unavailable-state'),
    inputNoLocation: document.getElementById('input-no-location'),
    btnSubmitNoLocation: document.getElementById('btn-submit-no-location'),
    btnUseDemoLocation: document.getElementById('btn-use-demo-location')
};

function isLocationValid(loc) {
    if (!loc) return false;
    const lat = Number(loc.lat);
    const lon = Number(loc.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function init() {
    setupEventListeners();
    initTheme();
    initAudio();

    let savedLoc = null;
    try {
        const item = localStorage.getItem('paincast_location');
        if (item) {
            savedLoc = JSON.parse(item);
        }
    } catch (e) {
        console.warn("Malformed local storage data", e);
        localStorage.removeItem('paincast_location');
    }

    if (savedLoc && isLocationValid(savedLoc)) {
        fetchData(savedLoc.lat, savedLoc.lon, savedLoc.locationName);
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
    dom.btnThemeToggle.addEventListener('click', toggleThemeDropdown);
    if (dom.btnAudioToggle) dom.btnAudioToggle.addEventListener('click', toggleAudio);

    dom.inputLocation.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleManualSubmit();
        }
    });

    dom.btnSubmitNoLocation.addEventListener('click', handleNoLocationSubmit);
    dom.btnUseDemoLocation.addEventListener('click', handleUseDemoLocation);
    dom.inputNoLocation.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNoLocationSubmit();
        }
    });

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);

    dom.themeOptions.forEach(option => {
        option.addEventListener('click', handleThemeSelect);
    });
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
        if (!dom.modalLocation.classList.contains('d-none')) {
            closeModal();
        }
    }

    if (!dom.modalLocation.classList.contains('d-none') && event.key === 'Tab') {
        const focusableElements = dom.modalLocation.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        }
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
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
    closeThemeDropdown();

    if (chartState) {
        renderChart(chartState.labels, chartState.data);
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
    let savedLoc = null;
    try {
        const item = localStorage.getItem('paincast_location');
        if (item) {
            savedLoc = JSON.parse(item);
        }
    } catch (e) {
        console.warn("Malformed local storage data", e);
        localStorage.removeItem('paincast_location');
    }

    if (savedLoc && isLocationValid(savedLoc)) {
        fetchData(savedLoc.lat, savedLoc.lon, savedLoc.locationName);
    } else {
        showLocationUnavailable("No saved location to refresh.");
    }
}

function showLoading() {
    dom.loadingState.classList.remove('d-none');
    dom.dashboard.classList.add('d-none');
    dom.errorState.classList.add('d-none');
    dom.locationUnavailableState.classList.add('d-none');
    dom.locationContainer.classList.add('d-none');
}

function showError(msg) {
    dom.errorMessage.textContent = msg;
    dom.errorState.classList.remove('d-none');
    dom.loadingState.classList.add('d-none');
    dom.dashboard.classList.add('d-none');
    dom.locationUnavailableState.classList.add('d-none');
    dom.locationContainer.classList.add('d-none');
}

function showDashboard() {
    dom.dashboard.classList.remove('d-none');
    dom.loadingState.classList.add('d-none');
    dom.errorState.classList.add('d-none');
    dom.locationUnavailableState.classList.add('d-none');
    dom.locationContainer.classList.remove('d-none');
}

function openModal() {
    modalOpener = document.activeElement;
    dom.modalLocation.classList.remove('d-none');
    dom.locationContainer.classList.add('d-none');
    dom.btnManualLocation.setAttribute('aria-expanded', 'true');

    const savedLoc = localStorage.getItem('paincast_location');
    if (savedLoc) {
        const { locationName } = JSON.parse(savedLoc);
        dom.inputLocation.value = locationName || '';
    }
    
    setTimeout(() => {
        dom.inputLocation.focus();
    }, 10);
}

function closeModal() {
    dom.modalLocation.classList.add('d-none');
    dom.locationContainer.classList.remove('d-none');
    dom.btnManualLocation.setAttribute('aria-expanded', 'false');
    if (modalOpener) {
        modalOpener.focus();
    }
}

function getGeolocation() {
    showLoading();
    dom.locationDisplay.textContent = "Acquiring location...";

    if (!navigator.geolocation) {
        handleLocationUnavailable("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                handleLocationUnavailable("Invalid GPS coordinates returned.");
                return;
            }

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
            let reason = "Location access denied or unavailable.";
            if (error.code === error.PERMISSION_DENIED) {
                reason = "Location access was denied.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                reason = "Location service is currently unavailable.";
            } else if (error.code === error.TIMEOUT) {
                reason = "Location discovery timed out.";
            }
            handleLocationUnavailable(reason);
        },
        { timeout: 10000 }
    );
}

function handleLocationUnavailable(reason) {
    let savedLoc = null;
    try {
        const item = localStorage.getItem('paincast_location');
        if (item) {
            savedLoc = JSON.parse(item);
        }
    } catch (e) {
        console.warn("Malformed local storage data in fallback", e);
        localStorage.removeItem('paincast_location');
    }

    if (savedLoc && isLocationValid(savedLoc)) {
        fetchData(savedLoc.lat, savedLoc.lon, savedLoc.locationName);
    } else {
        showLocationUnavailable(reason);
    }
}

function showLocationUnavailable(reason) {
    dom.loadingState.classList.add('d-none');
    dom.dashboard.classList.add('d-none');
    dom.errorState.classList.add('d-none');
    dom.locationContainer.classList.add('d-none');
    dom.modalLocation.classList.add('d-none');
    dom.locationUnavailableState.classList.remove('d-none');
    
    setTimeout(() => {
        dom.inputNoLocation.focus();
    }, 10);
}

async function handleNoLocationSubmit() {
    const query = dom.inputNoLocation.value.trim();
    if (!query) {
        alert("Please enter a city or zip code.");
        return;
    }

    try {
        dom.btnSubmitNoLocation.disabled = true;
        dom.btnSubmitNoLocation.textContent = "Searching...";

        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(geoUrl, {
            headers: { 'User-Agent': 'PainCastApp/1.0' }
        });
        const geoData = await res.json();

        if (!geoData || geoData.length === 0) {
            alert("Location not found. Please try again.");
            return;
        }

        const result = geoData[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            alert("Invalid coordinates returned from search.");
            return;
        }

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
        fetchData(lat, lon, locationName);
    } catch (e) {
        console.error(e);
        alert("Failed to reach geocoding service.");
    } finally {
        dom.btnSubmitNoLocation.disabled = false;
        dom.btnSubmitNoLocation.textContent = "Search";
    }
}

function handleUseDemoLocation() {
    const lat = DEFAULT_LAT;
    const lon = DEFAULT_LON;
    const locationName = "Nashville, TN (Demo)";
    localStorage.setItem('paincast_location', JSON.stringify({ lat, lon, manual: true, locationName }));
    fetchData(lat, lon, locationName);
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

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            alert("Invalid coordinates returned from search.");
            dom.btnSubmitLocation.disabled = false;
            dom.btnSubmitLocation.textContent = "Update";
            return;
        }

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
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        showError("Invalid coordinates provided to weather request.");
        return;
    }
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
// Calculation logic extracted to pain-model.js

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
                pressure: []
            };
            dayBuckets.push(bucket);
        }

        bucket.temps.push(hourly.temperature_2m[i]);
        bucket.humidity.push(hourly.relative_humidity_2m[i]);
        bucket.pressure.push(hourly.pressure_msl[i]);

        if (dayBuckets.length === 7 && i < hourly.time.length - 1) {
            const nextDay = hourly.time[i + 1].split('T')[0];
            if (nextDay !== dayKey) {
                break;
            }
        }
    }

    return dayBuckets.slice(0, 7).map((bucket, index, buckets) => {
        const avgTemp = average(bucket.temps);
        const avgHumidity = average(bucket.humidity);
        const avgPressure = average(bucket.pressure);
        const prevAvgPressure = index > 0 ? average(buckets[index - 1].pressure) : avgPressure;
        const scores = calculatePainFactorScores(avgTemp, avgHumidity, avgPressure, prevAvgPressure);
        const painIndex = calculateFinalIndex(scores);
        const styles = getStylesForIndex(painIndex);

        return {
            dayLabel: DAY_LABEL_FORMATTER.format(bucket.date),
            dateLabel: DAY_DATE_FORMATTER.format(bucket.date),
            painIndex,
            label: styles.label,
            tempLow: Math.round(Math.min(...bucket.temps)),
            tempHigh: Math.round(Math.max(...bucket.temps)),
            avgHumidity: Math.round(avgHumidity)
        };
    });
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
    dom.painLabel.classList.remove('pain-low', 'pain-med', 'pain-high');

    const styles = getStylesForIndex(index);
    dom.painValue.classList.add(styles.text);
    dom.indexGlow.classList.add(styles.bg);
    dom.painLabel.textContent = styles.label;
    dom.painLabel.classList.add(styles.text);
}

function renderWeeklyOutlook(days) {
    dom.weeklyOutlook.innerHTML = days.map(day => {
        const toneClass = day.painIndex <= 3 ? 'weekly-card-low' : day.painIndex <= 6 ? 'weekly-card-med' : 'weekly-card-high';

        return `
            <article class="weekly-card ${toneClass}">
                <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
                    <div>
                        <p class="weekly-card-day mb-1">${day.dayLabel}</p>
                        <p class="weekly-card-date mb-0">${day.dateLabel}</p>
                    </div>
                    <div class="weekly-card-index-wrap text-end">
                        <p class="weekly-card-index mb-0">${day.painIndex}<span>/10</span></p>
                        <p class="weekly-card-label mb-0">${day.label}</p>
                    </div>
                </div>
                <div class="weekly-card-meta">
                    <span>${day.tempLow}° to ${day.tempHigh}°F</span>
                    <span>${day.avgHumidity}% humidity</span>
                </div>
            </article>
        `;
    }).join('');
}

// --- Chart.js ---
function renderChart(labels, data) {
    chartState = {
        labels: [...labels],
        data: [...data]
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
        ? { low: '#6de4d6cc', mid: '#ffd36ecc', high: '#ff8c8ccc' }
        : { low: '#22c55e80', mid: '#f59e0b80', high: '#ef444480' };
    const barBorders = isRetroTheme
        ? { low: '#6de4d6', mid: '#ffd36e', high: '#ff8c8c' }
        : { low: '#22c55e', mid: '#f59e0b', high: '#ef4444' };

    const ctx = dom.chartCanvas.getContext('2d');

    Chart.defaults.color = chartTextColor;
    Chart.defaults.font.family = isRetroTheme ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif";

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pain Index',
                data: data,
                backgroundColor: data.map(val => {
                    if (val <= 3) return barColors.low;
                    if (val <= 6) return barColors.mid;
                    return barColors.high;
                }),
                borderColor: data.map(val => {
                    if (val <= 3) return barBorders.low;
                    if (val <= 6) return barBorders.mid;
                    return barBorders.high;
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
                        color: chartGridColor
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
