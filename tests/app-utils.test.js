const test = require('node:test');
const assert = require('node:assert');
const { createSafeStorage, parseNominatimResult, validateWeatherPayload } = require('../app-utils');

test('App Utils Tests', async (t) => {

    await t.test('safeStorage Tests', async (st) => {
        const createFakeStorage = (failRead = false, failWrite = false, failRemove = false) => {
            const store = new Map();
            return {
                getItem(key) {
                    if (failRead) throw new Error("SecurityError");
                    return store.get(key) || null;
                },
                setItem(key, value) {
                    if (failWrite) throw new Error("QuotaExceededError");
                    store.set(key, String(value));
                },
                removeItem(key) {
                    if (failRemove) throw new Error("RemoveError");
                    store.delete(key);
                },
                _store: store
            };
        };

        await st.test('Successful string read and write', () => {
            const storage = createSafeStorage(createFakeStorage());
            storage.setItem('test_key', 'test_value');
            assert.strictEqual(storage.getItem('test_key'), 'test_value');
        });

        await st.test('Initialization failure returns no-op storage', () => {
            const throwingImpl = {
                getItem: () => { throw new Error("SecurityError on init"); }
            };
            const storage = createSafeStorage(throwingImpl);
            assert.strictEqual(storage.getItem('key'), null);
            assert.doesNotThrow(() => storage.setItem('key', 'val'));
        });

        await st.test('Successful JSON read and write', () => {
            const storage = createSafeStorage(createFakeStorage());
            const obj = { foo: 'bar' };
            storage.setJSON('test_json', obj);
            assert.deepStrictEqual(storage.getJSON('test_json'), obj);
        });

        await st.test('Missing key returns null', () => {
            const storage = createSafeStorage(createFakeStorage());
            assert.strictEqual(storage.getItem('missing'), null);
            assert.strictEqual(storage.getJSON('missing'), null);
        });

        await st.test('Malformed JSON returns null without throwing', () => {
            const fake = createFakeStorage();
            const storage = createSafeStorage(fake);
            fake.setItem('bad_json', '{bad: "json"}');
            assert.strictEqual(storage.getJSON('bad_json'), null);
        });

        await st.test('Exceptions do not escape wrapper', () => {
            const storageFailRead = createSafeStorage(createFakeStorage(true, false, false));
            assert.doesNotThrow(() => storageFailRead.getItem('key'));
            assert.strictEqual(storageFailRead.getItem('key'), null);

            const storageFailWrite = createSafeStorage(createFakeStorage(false, true, false));
            assert.doesNotThrow(() => storageFailWrite.setItem('key', 'val'));

            const storageFailRemove = createSafeStorage(createFakeStorage(false, false, true));
            assert.doesNotThrow(() => storageFailRemove.removeItem('key'));
        });

        await st.test('JSON serialization failure does not crash', () => {
            const storage = createSafeStorage(createFakeStorage());
            const circular = {};
            circular.self = circular;
            assert.doesNotThrow(() => storage.setJSON('circ', circular));
        });
    });

    await t.test('parseNominatimResult Tests', async (st) => {
        await st.test('Valid lat/lon strings, normal display_name', () => {
            const data = [{
                lat: "36.1627", lon: "-86.7816",
                name: "Nashville",
                display_name: "Nashville, Davidson County, Tennessee, USA"
            }];
            const res = parseNominatimResult(data);
            assert.strictEqual(res.lat, 36.1627);
            assert.strictEqual(res.lon, -86.7816);
            assert.strictEqual(res.locationName, "Nashville, Davidson County");
        });

        await st.test('Short display_name', () => {
            const data = [{
                lat: "36.1", lon: "-86.7",
                name: "Nashville",
                display_name: "Nashville, TN"
            }];
            const res = parseNominatimResult(data);
            assert.strictEqual(res.locationName, "Nashville, TN");
        });

        await st.test('Empty result collection or invalid inputs', () => {
            assert.strictEqual(parseNominatimResult([]), null);
            assert.strictEqual(parseNominatimResult(null), null);
            assert.strictEqual(parseNominatimResult(undefined), null);
            assert.strictEqual(parseNominatimResult({}), null);
            assert.strictEqual(parseNominatimResult("not an array"), null);
        });

        await st.test('Missing/Non-numeric coordinates', () => {
            assert.throws(() => parseNominatimResult([{ name: "Loc" }]), /Invalid coordinates/);
            assert.throws(() => parseNominatimResult([{ lat: "abc", lon: "def" }]), /Invalid coordinates/);
        });

        await st.test('Missing name with usable display_name', () => {
            const data = [{ lat: "1", lon: "1", display_name: "Somewhere, Region, Country" }];
            const res = parseNominatimResult(data);
            assert.strictEqual(res.locationName, "Somewhere, Region");
        });

        await st.test('Fallback behavior when display_name is missing or empty', () => {
            const dataWithNameOnly = [{ lat: "36.16", lon: "-86.78", name: "Nashville" }];
            const res1 = parseNominatimResult(dataWithNameOnly);
            assert.strictEqual(res1.locationName, "Nashville");

            const dataNoNameNoDisplay = [{ lat: "36.1627", lon: "-86.7816" }];
            const res2 = parseNominatimResult(dataNoNameNoDisplay);
            assert.strictEqual(res2.locationName, "GPS Coord: 36.16, -86.78");
        });

        await st.test('International location formats', () => {
            const data = [{ lat: "48.85", lon: "2.35", name: "Paris", display_name: "Paris, Île-de-France, France" }];
            const res = parseNominatimResult(data);
            assert.strictEqual(res.locationName, "Paris, Île-de-France");
        });
    });

    await t.test('validateWeatherPayload Tests', async (st) => {
        const createValidPayload = () => {
            const len = 24;
            const hrTime = [];
            for (let i = 0; i < len; i++) {
                const hour = (12 + i) % 24;
                const day = 1 + Math.floor((12 + i) / 24);
                hrTime.push(`2024-01-0${day}T${String(hour).padStart(2, '0')}:00`);
            }
            return {
                current: {
                    temperature_2m: 70, relative_humidity_2m: 50,
                    pressure_msl: 1010, wind_speed_10m: 10,
                    time: "2024-01-01T12:00"
                },
                hourly: {
                    time: hrTime,
                    temperature_2m: Array(len).fill(70),
                    relative_humidity_2m: Array(len).fill(50),
                    pressure_msl: Array(len).fill(1010)
                }
            };
        };

        const assertValidationError = (payload) => {
            assert.throws(() => validateWeatherPayload(payload), /ValidationError/);
        };

        await st.test('Complete valid payload succeeds', () => {
            assert.doesNotThrow(() => validateWeatherPayload(createValidPayload()));
        });

        await st.test('Missing current or hourly or null payload', () => {
            assertValidationError(null);
            assertValidationError(undefined);
            assertValidationError({});
            assertValidationError("not an object");

            let p1 = createValidPayload(); delete p1.current;
            assertValidationError(p1);
            let p2 = createValidPayload(); delete p2.hourly;
            assertValidationError(p2);
        });

        await st.test('Missing or invalid current metrics', () => {
            let p = createValidPayload();
            delete p.current.temperature_2m;
            assertValidationError(p);
            
            p = createValidPayload();
            p.current.pressure_msl = NaN;
            assertValidationError(p);

            p = createValidPayload();
            p.current.wind_speed_10m = null;
            assertValidationError(p);

            p = createValidPayload();
            p.current.relative_humidity_2m = null;
            assertValidationError(p);
        });

        await st.test('Invalid current timestamp', () => {
            let p = createValidPayload();
            p.current.time = "not a date";
            assertValidationError(p);
            
            p.current.time = "";
            assertValidationError(p);

            p.current.time = null;
            assertValidationError(p);
        });

        await st.test('Missing hourly arrays', () => {
            let p = createValidPayload();
            delete p.hourly.temperature_2m;
            assertValidationError(p);
        });

        await st.test('Mismatched hourly-array lengths', () => {
            let p = createValidPayload();
            p.hourly.temperature_2m.pop();
            assertValidationError(p);
        });

        await st.test('Fewer than 24 usable hourly entries', () => {
            let p = createValidPayload();
            p.hourly.time = Array(23).fill("2024-01-01T12:00");
            p.hourly.temperature_2m = Array(23).fill(70);
            p.hourly.relative_humidity_2m = Array(23).fill(50);
            p.hourly.pressure_msl = Array(23).fill(1010);
            assertValidationError(p);
        });

        await st.test('NaN, null, or non-numeric values in numerical arrays', () => {
            let p1 = createValidPayload();
            p1.hourly.temperature_2m[5] = NaN;
            assertValidationError(p1);

            let p2 = createValidPayload();
            p2.hourly.pressure_msl[10] = "1015";
            assertValidationError(p2);

            let p3 = createValidPayload();
            p3.hourly.relative_humidity_2m[3] = null;
            assertValidationError(p3);
        });

        await st.test('Missing or malformed hourly timestamps', () => {
            let p = createValidPayload();
            p.hourly.time[2] = "bad date";
            assertValidationError(p);
            
            p.hourly.time[3] = "2024-01-0"; // Length < 10
            assertValidationError(p);
        });

        await st.test('Hourly timestamps not strictly ordered', () => {
            let p = createValidPayload();
            p.hourly.time[5] = "2023-12-31T12:00"; // Unordered
            assertValidationError(p);
        });

        await st.test('Insufficient 24-hour horizon from current time', () => {
            let p = createValidPayload();
            // Start index will be based on current hour. If we set current time to index 5, 
            // there are only 19 elements remaining (from index 5 to 23).
            p.current.time = p.hourly.time[5];
            assertValidationError(p);
        });
    });
});
