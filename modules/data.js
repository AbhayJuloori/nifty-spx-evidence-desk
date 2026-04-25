export const RANGE_CONFIG = {
  "1D": { fetchRange: "1d", autoInterval: "5m" },
  "5D": { fetchRange: "5d", autoInterval: "15m" },
  "1W": { fetchRange: "5d", autoInterval: "15m" },
  "1M": { fetchRange: "1mo", autoInterval: "1d" },
  "3M": { fetchRange: "3mo", autoInterval: "1d" },
  "6M": { fetchRange: "6mo", autoInterval: "1d" },
  YTD: { fetchRange: "1y", autoInterval: "1d", filter: "ytd" },
  "1Y": { fetchRange: "1y", autoInterval: "1d" },
  "2Y": { fetchRange: "2y", autoInterval: "1wk" },
  "3Y": { fetchRange: "3y", autoInterval: "1wk" },
  "5Y": { fetchRange: "5y", autoInterval: "1wk" },
  MAX: { fetchRange: "max", autoInterval: "1mo" },
};

export const SYMBOLS = {
  nifty: {
    label: "NIFTY 50",
    color: "#00d6a3",
    soft: "rgba(0, 214, 163, 0.18)",
    up: "#00d6a3",
    down: "#ff654d",
    timeZone: "Asia/Kolkata",
    open: "09:15",
    close: "15:30",
  },
  spx: {
    label: "S&P 500",
    color: "#ff654d",
    soft: "rgba(255, 101, 77, 0.18)",
    up: "#8fb7ff",
    down: "#d07cff",
    timeZone: "America/New_York",
    open: "09:30",
    close: "16:00",
  },
  usdinr: {
    label: "USD/INR",
    color: "#8fb7ff",
    soft: "rgba(143, 183, 255, 0.16)",
    up: "#8fb7ff",
    down: "#d07cff",
    timeZone: "Asia/Kolkata",
    open: "09:00",
    close: "17:00",
  },
  brent: {
    label: "Brent",
    color: "#ffd166",
    soft: "rgba(255, 209, 102, 0.16)",
    up: "#ffd166",
    down: "#ff8273",
    timeZone: "America/New_York",
    open: "09:00",
    close: "17:00",
  },
  ndx: {
    label: "Nasdaq 100",
    color: "#d07cff",
    soft: "rgba(208, 124, 255, 0.16)",
    up: "#d07cff",
    down: "#ff8273",
    timeZone: "America/New_York",
    open: "09:30",
    close: "16:00",
  },
};

export function parseYahooBars(payload, symbolKey, interval) {
  const result = payload?.chart?.result?.[0];
  const error = payload?.chart?.error;
  if (!result || error) {
    throw new Error(error?.description || `No data returned for ${SYMBOLS[symbolKey].label}`);
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const gmtoffset = result.meta?.gmtoffset || 0;
  const intraday = ["5m", "15m", "60m"].includes(interval);

  return timestamps
    .map((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      if (![open, high, low, close].every(Number.isFinite)) return null;

      let time = timestamp;
      if (!intraday) {
        const exchangeDate = new Date((timestamp + gmtoffset) * 1000).toISOString().slice(0, 10);
        time = Date.parse(`${exchangeDate}T00:00:00Z`) / 1000;
      }

      return { time, open, high, low, close };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

export function filterBarsForRange(bars, range) {
  if (RANGE_CONFIG[range].filter !== "ytd") return bars;
  const now = new Date();
  const from = Date.UTC(now.getUTCFullYear(), 0, 1) / 1000;
  return bars.filter((bar) => bar.time >= from);
}

export function filterSessionBars(symbolKey, bars, dateISO, interval) {
  const symbol = SYMBOLS[symbolKey];
  const { open, close } = sessionWindow(symbolKey, dateISO);
  return bars.filter((bar) => {
    const sameLocalDate = localDateForTimestamp(bar.time, symbol.timeZone) === dateISO;
    if (interval === "1d") return sameLocalDate;
    return sameLocalDate && bar.time >= open - 60 && bar.time <= close + 60;
  });
}

export async function fetchSymbol(symbolKey, params) {
  const query = new URLSearchParams({ symbol: symbolKey, interval: params.interval });
  if (params.period1 && params.period2) {
    query.set("period1", Math.floor(params.period1));
    query.set("period2", Math.floor(params.period2));
  } else {
    query.set("range", params.range);
  }

  const response = await fetch(`/api/chart?${query.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Unable to load ${SYMBOLS[symbolKey].label}`);
  }
  return parseYahooBars(payload, symbolKey, params.interval);
}

function getZonedParts(timestampMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));

  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function zonedDateTimeToUtcSeconds(dateISO, timeHHMM, timeZone) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = timeHHMM.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0) / 1000;
  let guess = targetAsUtc;

  for (let index = 0; index < 3; index += 1) {
    const parts = getZonedParts(guess * 1000, timeZone);
    const renderedAsUtc =
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0) / 1000;
    guess += targetAsUtc - renderedAsUtc;
  }

  return guess;
}

function localDateForTimestamp(timestamp, timeZone) {
  const parts = getZonedParts(timestamp * 1000, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function sessionWindow(symbolKey, dateISO) {
  const symbol = SYMBOLS[symbolKey];
  const open = zonedDateTimeToUtcSeconds(dateISO, symbol.open, symbol.timeZone);
  const close = zonedDateTimeToUtcSeconds(dateISO, symbol.close, symbol.timeZone);
  return {
    open,
    close,
    period1: open - 60 * 60 * 8,
    period2: close + 60 * 60 * 8,
  };
}
