const test = require('node:test');
const assert = require('node:assert');
const { calculatePainFactorScores, calculateFinalIndex, average } = require('../pain-model');

test('Pain Model Tests', async (t) => {
    
    await t.test('Thresholds and bounds', async (st) => {
        await st.test('Exact thresholds (59°F, 60%, 1005 hPa) return index 1', () => {
            const scores = calculatePainFactorScores(59, 60, 1005, 1005);
            assert.strictEqual(calculateFinalIndex(scores), 1);
        });

        await st.test('Immediately above/below thresholds increase scores correctly', () => {
            const tempScores = calculatePainFactorScores(58, 60, 1005, 1005);
            assert.ok(tempScores.temp_score > 0, 'Temp score should be > 0 at 58°F');

            const humScores = calculatePainFactorScores(59, 61, 1005, 1005);
            assert.ok(humScores.hum_score > 0, 'Hum score should be > 0 at 61%');

            const bpScores = calculatePainFactorScores(59, 60, 1006, 1005);
            assert.ok(bpScores.bp_score > 0, 'BP score should be > 0 at 1006 hPa');
        });
        
        await st.test('Extreme inputs cap at index 10', () => {
            const scores = calculatePainFactorScores(-50, 100, 1100, 900);
            assert.strictEqual(calculateFinalIndex(scores), 10);
        });
    });

    await t.test('Pressure changes', async (st) => {
        await st.test('Positive and negative changes of equal magnitude have equal scores', () => {
            const pos = calculatePainFactorScores(59, 60, 1015, 1005);
            const neg = calculatePainFactorScores(59, 60, 995, 1005);
            assert.strictEqual(pos.change_score, neg.change_score);
            assert.ok(pos.change_score > 0);
        });

        await st.test('Pressure-change score caps at 2', () => {
            const scores = calculatePainFactorScores(59, 60, 1055, 1005);
            assert.strictEqual(scores.change_score, 2);
        });
        
        await st.test('Missing previous pressure is handled safely', () => {
            const scoresNull = calculatePainFactorScores(59, 60, 1005, null);
            assert.strictEqual(scoresNull.delta, 0);
            assert.strictEqual(scoresNull.change_score, 0);
            
            const scoresUndef = calculatePainFactorScores(59, 60, 1005, undefined);
            assert.strictEqual(scoresUndef.delta, 0);
            assert.strictEqual(scoresUndef.change_score, 0);
        });
    });

    await t.test('Average function', async (st) => {
        await st.test('Empty arrays return 0 safely', () => {
            assert.strictEqual(average([]), 0);
            assert.strictEqual(average(), 0);
        });
        
        await st.test('Computes decimals and negatives correctly', () => {
            assert.strictEqual(average([2.5, 4.5, 6.5]), 4.5);
            assert.strictEqual(average([-10, 10]), 0);
            assert.strictEqual(average([-5, -15]), -10);
        });
    });
    
    await t.test('Input Validation (TypeError)', async (st) => {
        await st.test('calculatePainFactorScores rejects invalid inputs', () => {
            assert.throws(() => calculatePainFactorScores(NaN, 60, 1005, 1005), TypeError);
            assert.throws(() => calculatePainFactorScores(59, undefined, 1005, 1005), TypeError);
            assert.throws(() => calculatePainFactorScores(59, 60, null, 1005), TypeError);
            assert.throws(() => calculatePainFactorScores('59', 60, 1005, 1005), TypeError);
            assert.throws(() => calculatePainFactorScores(59, 60, 1005, '1005'), TypeError);
        });

        await st.test('calculateFinalIndex rejects invalid inputs', () => {
            assert.throws(() => calculateFinalIndex(null), TypeError);
            assert.throws(() => calculateFinalIndex({ temp_score: NaN, bp_score: 0, hum_score: 0, change_score: 0 }), TypeError);
            assert.throws(() => calculateFinalIndex({ temp_score: 1, bp_score: '0', hum_score: 0, change_score: 0 }), TypeError);
        });
        
        await st.test('average rejects arrays with non-numeric values', () => {
            assert.throws(() => average([1, 2, '3']), TypeError);
            assert.throws(() => average([1, NaN, 3]), TypeError);
        });
    });
});
