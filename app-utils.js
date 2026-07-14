const createSafeStorage = (storageImpl) => {
    let impl = null;
    try {
        impl = storageImpl !== undefined ? storageImpl : globalThis.localStorage;
        if (impl) impl.getItem('test_init');
    } catch (e) {
        console.warn('Storage init failed', e);
        impl = null;
    }

    return {
        getItem(key) {
            if (!impl) return null;
            try { return impl.getItem(key); }
            catch (e) { console.warn('Storage read failed', e); return null; }
        },
        setItem(key, value) {
            if (!impl) return;
            try { impl.setItem(key, value); }
            catch (e) { console.warn('Storage write failed', e); }
        },
        removeItem(key) {
            if (!impl) return;
            try { impl.removeItem(key); }
            catch (e) { console.warn('Storage remove failed', e); }
        },
        getJSON(key) {
            const val = this.getItem(key);
            if (!val) return null;
            try { return JSON.parse(val); }
            catch (e) { console.warn('Storage JSON parse failed', e); return null; }
        },
        setJSON(key, value) {
            try { this.setItem(key, JSON.stringify(value)); }
            catch (e) { console.warn('Storage JSON stringify failed', e); }
        }
    };
};

function parseNominatimResult(geoData) {
    if (!geoData || !Array.isArray(geoData) || geoData.length === 0) {
        return null; // Not found
    }

    const result = geoData[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("Invalid coordinates returned from search.");
    }

    let locationName = result.name;
    if (result.display_name) {
        const parts = result.display_name.split(',').map(s => s.trim());
        if (parts.length > 2) {
            locationName = `${parts[0]}, ${parts[1]}`;
        } else {
            locationName = result.display_name;
        }
    } else if (!locationName) {
        locationName = `GPS Coord: ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }

    return { lat, lon, locationName };
}

function validateWeatherPayload(data) {
    if (!data || !data.current || !data.hourly) {
        throw new Error("ValidationError: Missing 'current' or 'hourly' objects in weather data.");
    }
    
    const curr = data.current;
    if (!Number.isFinite(curr.temperature_2m) ||
        !Number.isFinite(curr.relative_humidity_2m) ||
        !Number.isFinite(curr.pressure_msl) ||
        !Number.isFinite(curr.wind_speed_10m)) {
        throw new Error("ValidationError: Invalid or missing current weather metrics.");
    }
    
    if (typeof curr.time !== 'string' || curr.time.length < 13 || Number.isNaN(Date.parse(curr.time))) {
        throw new Error("ValidationError: current.time is not a usable timestamp.");
    }
    
    const hr = data.hourly;
    if (!Array.isArray(hr.time) || !Array.isArray(hr.temperature_2m) || 
        !Array.isArray(hr.relative_humidity_2m) || !Array.isArray(hr.pressure_msl)) {
        throw new Error("ValidationError: Hourly metrics are not arrays.");
    }
    
    const len = hr.time.length;
    if (hr.temperature_2m.length !== len || 
        hr.relative_humidity_2m.length !== len || 
        hr.pressure_msl.length !== len) {
        throw new Error("ValidationError: Hourly array lengths do not match.");
    }
    
    let prevTime = 0;
    for (let i = 0; i < len; i++) {
        if (!Number.isFinite(hr.temperature_2m[i]) || 
            !Number.isFinite(hr.relative_humidity_2m[i]) || 
            !Number.isFinite(hr.pressure_msl[i])) {
            throw new Error(`ValidationError: Invalid hourly metric encountered at index ${i}.`);
        }
        const timeStr = hr.time[i];
        if (typeof timeStr !== 'string' || timeStr.length < 10) {
            throw new Error(`ValidationError: Invalid hourly timestamp encountered at index ${i}.`);
        }
        const parsed = Date.parse(timeStr);
        if (Number.isNaN(parsed)) {
            throw new Error(`ValidationError: Invalid hourly timestamp encountered at index ${i}.`);
        }
        if (parsed < prevTime) {
            throw new Error(`ValidationError: Hourly timestamps are not strictly ordered at index ${i}.`);
        }
        prevTime = parsed;
    }
    
    const currentHourStr = curr.time.substring(0, 13) + ":00";
    let startIndex = hr.time.findIndex(t => t.startsWith(currentHourStr.substring(0, 13)));
    
    if (startIndex === -1) {
        const now = new Date();
        startIndex = hr.time.findIndex(t => new Date(t) > now);
        if (startIndex === -1) startIndex = 0;
    }
    
    if (len - startIndex < 24) {
        throw new Error("ValidationError: Insufficient hourly data returned (less than 24 hours).");
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createSafeStorage,
        parseNominatimResult,
        validateWeatherPayload
    };
}
