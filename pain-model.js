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

function average(values) {
    if (!values || !values.length) {
        return 0;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
}

// Export for Node.js testing while keeping browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePainFactorScores,
        calculateFinalIndex,
        average
    };
}
