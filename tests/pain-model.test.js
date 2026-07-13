const test = require('node:test');
const assert = require('node:assert');
const { calculatePainFactorScores, calculateFinalIndex, average } = require('../pain-model');

test('Pain Model Tests', async (t) => {
    
    await t.test('Mild conditions return minimum valid index', () => {
        // Ideal conditions: 59°F, 60% humidity, 1005 hPa, no change
        const scores = calculatePainFactorScores(59, 60, 1005, 1005);
        const index = calculateFinalIndex(scores);
        assert.strictEqual(index, 1);
    });

    await t.test('Very cold temperatures increase index', () => {
        // Very cold: 5°F
        const scores = calculatePainFactorScores(5, 60, 1005, 1005);
        const index = calculateFinalIndex(scores);
        assert.ok(index > 1, 'Index should be greater than 1');
    });

    await t.test('High humidity increases index', () => {
        // High humidity: 100%
        const scores = calculatePainFactorScores(59, 100, 1005, 1005);
        const index = calculateFinalIndex(scores);
        assert.ok(index > 1, 'Index should be greater than 1');
    });

    await t.test('High atmospheric pressure increases index', () => {
        // High pressure: 1035 hPa
        const scores = calculatePainFactorScores(59, 60, 1035, 1035);
        const index = calculateFinalIndex(scores);
        assert.ok(index > 1, 'Index should be greater than 1');
    });

    await t.test('Rising pressure increases index', () => {
        // Prev: 1005, Current: 1015 (Rising)
        const scores = calculatePainFactorScores(59, 60, 1015, 1005);
        const index = calculateFinalIndex(scores);
        assert.ok(index > 1, 'Index should be greater than 1');
    });

    await t.test('Falling pressure increases index', () => {
        // Prev: 1005, Current: 995 (Falling)
        const scores = calculatePainFactorScores(59, 60, 995, 1005);
        const index = calculateFinalIndex(scores);
        assert.ok(index > 1, 'Index should be greater than 1');
    });

    await t.test('Large pressure changes are capped correctly', () => {
        // A huge change, e.g., 50 hPa
        const scoresLarge = calculatePainFactorScores(59, 60, 1055, 1005);
        // The max change score is 2. Let's verify it caps.
        assert.strictEqual(scoresLarge.change_score, 2);
    });

    await t.test('Missing previous pressure is handled safely', () => {
        // Missing previous pressure
        const scores = calculatePainFactorScores(59, 60, 1005, null);
        assert.strictEqual(scores.delta, 0);
        assert.strictEqual(scores.change_score, 0);
        
        const scoresUndef = calculatePainFactorScores(59, 60, 1005, undefined);
        assert.strictEqual(scoresUndef.delta, 0);
        assert.strictEqual(scoresUndef.change_score, 0);
    });

    await t.test('Empty arrays passed to the average function return 0', () => {
        assert.strictEqual(average([]), 0);
        assert.strictEqual(average(), 0);
    });
    
    await t.test('average function computes correctly', () => {
        assert.strictEqual(average([2, 4, 6]), 4);
        assert.strictEqual(average([-10, 10]), 0);
    });
});
