import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyReturns,
  grangerTest,
  hitRate,
  olsRegression,
  rollingPearson,
} from './stats.js';

const TOLERANCE = 1e-12;

function assertNear(actual, expected, tolerance = TOLERANCE) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function datedReturns(values) {
  return values.map((value, index) => ({
    date: `2024-01-${String(index + 1).padStart(2, '0')}`,
    return: value,
  }));
}

describe('dailyReturns', () => {
  test('computes known close-to-close returns from OHLC bars', () => {
    const bars = [
      { time: '2024-01-01', open: 98, close: 100 },
      { time: '2024-01-02', open: 101, close: 110 },
      { time: '2024-01-03', open: 108, close: 99 },
      { time: '2024-01-04', open: 100, close: 108.9 },
    ];

    const result = dailyReturns(bars);

    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((point) => point.date),
      ['2024-01-02', '2024-01-03', '2024-01-04'],
    );
    assertNear(result[0].return, 0.1);
    assertNear(result[1].return, -0.1);
    assertNear(result[2].return, 0.1);
  });
});

describe('rollingPearson', () => {
  test('returns r near 1.0 for two perfectly correlated series', () => {
    const xReturns = datedReturns([-0.03, -0.01, 0.02, 0.04, 0.01, 0.05, -0.02]);
    const yReturns = datedReturns([-0.06, -0.02, 0.04, 0.08, 0.02, 0.1, -0.04]).reverse();

    const result = rollingPearson(xReturns, yReturns, 4);

    assert.equal(result.length, 4);
    assert.equal(result[0].date, '2024-01-04');
    for (const point of result) {
      assertNear(point.r, 1.0, 1e-12);
      assert.equal(typeof point.lower, 'number');
      assert.equal(typeof point.upper, 'number');
    }
  });
});

describe('hitRate', () => {
  test('returns rate near 1.0 for aligned positive return series', () => {
    const xReturns = datedReturns([0.01, 0.015, 0.02, 0.005, 0.03]);
    const yReturns = datedReturns([0.012, 0.011, 0.018, 0.007, 0.025]);

    const result = hitRate(xReturns, yReturns);

    assert.equal(result.n, 4);
    assertNear(result.rate, 1.0);
    assert.equal(typeof result.lower, 'number');
    assert.equal(typeof result.upper, 'number');
  });
});

describe('olsRegression', () => {
  test('fits beta=2.0 and rSquared=1.0 for y = 2 * x', () => {
    const xReturns = datedReturns([1, 2, 3, 4, 5]);
    const yReturns = datedReturns([2, 4, 6, 8, 10]);

    const result = olsRegression(xReturns, yReturns);

    assertNear(result.alpha, 0);
    assertNear(result.beta, 2.0);
    assertNear(result.rSquared, 1.0);
  });
});

describe('grangerTest', () => {
  test('returns fStat, pValue, and significant with the correct types', () => {
    const xValues = [0.03, -0.01, 0.02, 0.04, -0.02, 0.05, 0.01, -0.03, 0.04, 0.02, -0.01, 0.03, 0, 0.05];
    const yValues = [
      0.01,
      0.025999999999999995,
      -0.0002000000000000014,
      0.016939999999999997,
      0.03108199999999999,
      -0.0036754000000000014,
      0.03589738,
      0.014769214,
      -0.015569235799999998,
      0.022329229259999996,
      0.022698768778,
      -0.0021903693665999997,
      0.02134288919002,
      0.009402866757005999,
    ];

    const result = grangerTest(datedReturns(yValues), datedReturns(xValues), 1);

    assert.equal(typeof result.fStat, 'number');
    assert.equal(typeof result.pValue, 'number');
    assert.equal(typeof result.significant, 'boolean');
    assert.ok(Number.isFinite(result.fStat));
    assert.ok(Number.isFinite(result.pValue));
  });
});
