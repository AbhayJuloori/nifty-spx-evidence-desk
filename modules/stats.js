const EPSILON = 1e-12;
const SQRT_2_PI = 2.5066282746310002;

/**
 * Converts OHLC bars into one-session close-to-close returns.
 *
 * Invalid closes and zero previous closes are skipped. The returned `date`
 * is copied from the current bar's `time`.
 *
 * @param {Array<{time: string|number|Date, open: number, close: number}>} bars
 * @returns {Array<{date: string|number|Date, return: number}>}
 */
export function dailyReturns(bars) {
  if (!Array.isArray(bars)) {
    return [];
  }

  const returns = [];

  for (let i = 1; i < bars.length; i += 1) {
    const previousClose = toFiniteNumber(bars[i - 1]?.close);
    const close = toFiniteNumber(bars[i]?.close);

    if (previousClose === null || close === null || Math.abs(previousClose) < EPSILON) {
      continue;
    }

    returns.push({
      date: bars[i].time,
      return: (close - previousClose) / previousClose,
    });
  }

  return returns;
}

/**
 * Computes a rolling Pearson correlation over aligned return observations.
 *
 * Inputs are aligned by `date` when dates are present, otherwise by index.
 * Each result uses the trailing `window` observations and is dated with the
 * final observation in that window. Fisher intervals are one standard error
 * around z = atanh(r), transformed back to correlation space. Undefined
 * windows return `NaN` for `r`, `lower`, and `upper`.
 *
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} xReturns
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} yReturns
 * @param {number} [window=30]
 * @returns {Array<{date: string|number|Date|undefined, r: number, lower: number, upper: number}>}
 */
export function rollingPearson(xReturns, yReturns, window = 30) {
  const size = Math.floor(window);

  if (!Number.isFinite(size) || size < 2) {
    return [];
  }

  const pairs = alignReturns(xReturns, yReturns);

  if (pairs.length < size) {
    return [];
  }

  const results = [];

  for (let end = size - 1; end < pairs.length; end += 1) {
    const slice = pairs.slice(end - size + 1, end + 1);
    const r = pearson(slice.map((point) => point.x), slice.map((point) => point.y));
    const [lower, upper] = fisherOneSigmaInterval(r, size);

    results.push({
      date: pairs[end].date,
      r,
      lower,
      upper,
    });
  }

  return results;
}

/**
 * Computes the hit rate for whether the previous x-session sign matches the
 * current y-session sign, plus a Wilson 95% confidence interval.
 *
 * Inputs are aligned by `date` when dates are present, otherwise by index.
 * Zero returns are treated as their own sign via `Math.sign(0) === 0`.
 *
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} xReturns
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} yReturns
 * @returns {{rate: number, lower: number, upper: number, n: number}}
 */
export function hitRate(xReturns, yReturns) {
  const pairs = alignReturns(xReturns, yReturns);
  let hits = 0;
  let n = 0;

  for (let i = 1; i < pairs.length; i += 1) {
    if (Math.sign(pairs[i - 1].x) === Math.sign(pairs[i].y)) {
      hits += 1;
    }

    n += 1;
  }

  if (n === 0) {
    return { rate: NaN, lower: NaN, upper: NaN, n: 0 };
  }

  const rate = hits / n;
  const [lower, upper] = wilsonInterval(hits, n);

  return { rate, lower, upper, n };
}

/**
 * Fits an ordinary least squares regression y = alpha + beta * x.
 *
 * Inputs are aligned by `date` when dates are present, otherwise by index.
 * If x has zero variance, beta and rSquared are `NaN`.
 *
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} xReturns
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} yReturns
 * @returns {{alpha: number, beta: number, rSquared: number}}
 */
export function olsRegression(xReturns, yReturns) {
  const pairs = alignReturns(xReturns, yReturns);

  if (pairs.length === 0) {
    return { alpha: NaN, beta: NaN, rSquared: NaN };
  }

  const meanX = mean(pairs.map((point) => point.x));
  const meanY = mean(pairs.map((point) => point.y));
  let ssxx = 0;
  let ssxy = 0;
  let ssyy = 0;

  for (const point of pairs) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;

    ssxx += dx * dx;
    ssxy += dx * dy;
    ssyy += dy * dy;
  }

  if (ssxx < EPSILON) {
    return { alpha: meanY, beta: NaN, rSquared: NaN };
  }

  const beta = ssxy / ssxx;
  const alpha = meanY - beta * meanX;
  const rSquared = ssyy < EPSILON ? NaN : (ssxy * ssxy) / (ssxx * ssyy);

  return { alpha, beta, rSquared: clamp(rSquared, 0, 1) };
}

/**
 * Runs a simple Granger causality F-test for whether lagged x returns add
 * explanatory power for y returns beyond lagged y returns.
 *
 * The restricted model is y_t = c + y_{t-1..lag}. The unrestricted model adds
 * x_{t-1..lag}. Inputs are aligned by `date` when dates are present, otherwise
 * by index. `significant` uses p < 0.05.
 *
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} yReturns
 * @param {Array<{date?: string|number|Date, time?: string|number|Date, return: number}>} xReturns
 * @param {number} [lag=1]
 * @returns {{fStat: number, pValue: number, significant: boolean}}
 */
export function grangerTest(yReturns, xReturns, lag = 1) {
  const lagCount = Math.floor(lag);

  if (!Number.isFinite(lagCount) || lagCount < 1) {
    return { fStat: NaN, pValue: NaN, significant: false };
  }

  const pairs = alignReturns(xReturns, yReturns);
  const observations = pairs.length - lagCount;
  const unrestrictedTerms = 1 + 2 * lagCount;

  if (observations <= unrestrictedTerms) {
    return { fStat: NaN, pValue: NaN, significant: false };
  }

  const y = [];
  const restrictedX = [];
  const unrestrictedX = [];

  for (let i = lagCount; i < pairs.length; i += 1) {
    const restrictedRow = [1];
    const unrestrictedRow = [1];

    for (let l = 1; l <= lagCount; l += 1) {
      restrictedRow.push(pairs[i - l].y);
      unrestrictedRow.push(pairs[i - l].y);
    }

    for (let l = 1; l <= lagCount; l += 1) {
      unrestrictedRow.push(pairs[i - l].x);
    }

    y.push(pairs[i].y);
    restrictedX.push(restrictedRow);
    unrestrictedX.push(unrestrictedRow);
  }

  const restrictedFit = fitLeastSquares(restrictedX, y);
  const unrestrictedFit = fitLeastSquares(unrestrictedX, y);

  if (!restrictedFit || !unrestrictedFit || unrestrictedFit.df <= 0) {
    return { fStat: NaN, pValue: NaN, significant: false };
  }

  const numeratorDf = lagCount;
  const denominatorDf = unrestrictedFit.df;
  const rssImprovement = Math.max(0, restrictedFit.rss - unrestrictedFit.rss);
  const numerator = rssImprovement / numeratorDf;
  const denominator = unrestrictedFit.rss / denominatorDf;
  const fStat = denominator < EPSILON ? NaN : numerator / denominator;
  const pValue = Number.isFinite(fStat) ? fSurvival(fStat, numeratorDf, denominatorDf) : NaN;

  return {
    fStat,
    pValue,
    significant: Number.isFinite(pValue) && pValue < 0.05,
  };
}

function alignReturns(xReturns, yReturns) {
  if (!Array.isArray(xReturns) || !Array.isArray(yReturns)) {
    return [];
  }

  const xHasDates = xReturns.every((point) => getDate(point) !== undefined);
  const yHasDates = yReturns.every((point) => getDate(point) !== undefined);

  if (!xHasDates || !yHasDates) {
    return alignByIndex(xReturns, yReturns);
  }

  const yByDate = new Map();

  for (const point of yReturns) {
    const value = toFiniteNumber(point?.return);

    if (value !== null) {
      yByDate.set(dateKey(getDate(point)), value);
    }
  }

  const pairs = [];

  for (const point of xReturns) {
    const x = toFiniteNumber(point?.return);
    const date = getDate(point);
    const key = dateKey(date);

    if (x !== null && yByDate.has(key)) {
      pairs.push({ date, x, y: yByDate.get(key) });
    }
  }

  return pairs;
}

function alignByIndex(xReturns, yReturns) {
  const length = Math.min(xReturns.length, yReturns.length);
  const pairs = [];

  for (let i = 0; i < length; i += 1) {
    const x = toFiniteNumber(xReturns[i]?.return);
    const y = toFiniteNumber(yReturns[i]?.return);

    if (x !== null && y !== null) {
      pairs.push({ date: getDate(xReturns[i]) ?? getDate(yReturns[i]), x, y });
    }
  }

  return pairs;
}

function getDate(point) {
  return point?.date ?? point?.time;
}

function dateKey(date) {
  return date instanceof Date ? date.toISOString() : String(date);
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pearson(xs, ys) {
  const meanX = mean(xs);
  const meanY = mean(ys);
  let numerator = 0;
  let ssx = 0;
  let ssy = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;

    numerator += dx * dy;
    ssx += dx * dx;
    ssy += dy * dy;
  }

  const denominator = Math.sqrt(ssx * ssy);

  if (denominator < EPSILON) {
    return NaN;
  }

  return clamp(numerator / denominator, -1, 1);
}

function fisherOneSigmaInterval(r, n) {
  if (!Number.isFinite(r) || n <= 3) {
    return [NaN, NaN];
  }

  const boundedR = clamp(r, -1 + EPSILON, 1 - EPSILON);
  const z = Math.atanh(boundedR);
  const sigma = 1 / Math.sqrt(n - 3);

  return [Math.tanh(z - sigma), Math.tanh(z + sigma)];
}

function wilsonInterval(hits, n) {
  const z = 1.959963984540054;
  const p = hits / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);

  return [clamp(center - margin, 0, 1), clamp(center + margin, 0, 1)];
}

function fitLeastSquares(rows, y) {
  const n = rows.length;
  const p = rows[0]?.length ?? 0;

  if (n === 0 || p === 0 || n <= p) {
    return null;
  }

  const xtx = Array.from({ length: p }, () => Array(p).fill(0));
  const xty = Array(p).fill(0);

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < p; j += 1) {
      xty[j] += rows[i][j] * y[i];

      for (let k = 0; k < p; k += 1) {
        xtx[j][k] += rows[i][j] * rows[i][k];
      }
    }
  }

  const coefficients = solveLinearSystem(xtx, xty);

  if (!coefficients) {
    return null;
  }

  let rss = 0;

  for (let i = 0; i < n; i += 1) {
    let fitted = 0;

    for (let j = 0; j < p; j += 1) {
      fitted += rows[i][j] * coefficients[j];
    }

    const residual = y[i] - fitted;
    rss += residual * residual;
  }

  return { coefficients, rss, df: n - p };
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let column = 0; column < n; column += 1) {
    let pivot = column;

    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }

    if (Math.abs(augmented[pivot][column]) < EPSILON) {
      return null;
    }

    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const pivotValue = augmented[column][column];

    for (let cell = column; cell <= n; cell += 1) {
      augmented[column][cell] /= pivotValue;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];

      for (let cell = column; cell <= n; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function fSurvival(fStat, numeratorDf, denominatorDf) {
  if (fStat < 0 || numeratorDf <= 0 || denominatorDf <= 0) {
    return NaN;
  }

  const x = (numeratorDf * fStat) / (numeratorDf * fStat + denominatorDf);
  return clamp(1 - regularizedIncompleteBeta(x, numeratorDf / 2, denominatorDf / 2), 0, 1);
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) {
    return 0;
  }

  if (x >= 1) {
    return 1;
  }

  const logBt = logGamma(a + b) - logGamma(a) - logGamma(b)
    + a * Math.log(x) + b * Math.log1p(-x);
  const bt = Math.exp(logBt);

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }

  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function betaContinuedFraction(x, a, b) {
  const maxIterations = 200;
  const fpMin = Number.MIN_VALUE / EPSILON;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);

  if (Math.abs(d) < fpMin) {
    d = fpMin;
  }

  d = 1 / d;

  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));

    d = 1 + aa * d;
    c = 1 + aa / c;

    if (Math.abs(d) < fpMin) {
      d = fpMin;
    }

    if (Math.abs(c) < fpMin) {
      c = fpMin;
    }

    d = 1 / d;
    h *= d * c;

    aa = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    c = 1 + aa / c;

    if (Math.abs(d) < fpMin) {
      d = fpMin;
    }

    if (Math.abs(c) < fpMin) {
      c = fpMin;
    }

    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < 3e-7) {
      break;
    }
  }

  return h;
}

function logGamma(z) {
  const coefficients = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;

  tmp -= (x + 0.5) * Math.log(tmp);

  let series = 1.000000000190015;

  for (const coefficient of coefficients) {
    y += 1;
    series += coefficient / y;
  }

  return -tmp + Math.log(SQRT_2_PI * series / x);
}

function clamp(value, lower, upper) {
  if (!Number.isFinite(value)) {
    return value;
  }

  return Math.min(upper, Math.max(lower, value));
}
