const SYMBOLS = { nifty: '^NSEI', spx: '^GSPC', usdinr: 'INR=X', brent: 'BZ=F', ndx: '^NDX' };

const isSafeRange = v => /^(1d|5d|1mo|3mo|6mo|ytd|1y|2y|3y|5y|10y|max)$/.test(v);
const isSafeInterval = v => /^(1m|2m|5m|15m|30m|60m|90m|1h|1d|5d|1wk|1mo|3mo)$/.test(v);
const isSafePeriod = v => /^\d{9,11}$/.test(v);
const YAHOO_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const symbolKey = url.searchParams.get('symbol');
  const range = url.searchParams.get('range') || '1y';
  const interval = url.searchParams.get('interval') || '1d';
  const period1 = url.searchParams.get('period1');
  const period2 = url.searchParams.get('period2');
  const hasPeriod = period1 !== null || period2 !== null;
  const symbol = SYMBOLS[symbolKey];

  if (!symbol || !isSafeInterval(interval)) {
    res.status(400).json({ error: 'Invalid chart request' });
    return;
  }

  if (hasPeriod) {
    const from = Number(period1);
    const to = Number(period2);
    if (!isSafePeriod(period1 || '') || !isSafePeriod(period2 || '') || to <= from || to - from > 60 * 60 * 24 * 370 * 20) {
      res.status(400).json({ error: 'Invalid chart period' });
      return;
    }
  } else if (!isSafeRange(range)) {
    res.status(400).json({ error: 'Invalid chart range' });
    return;
  }

  const buildYahooUrl = host => {
    const yahooUrl = new URL('https://' + host + '/v8/finance/chart/' + encodeURIComponent(symbol));
    if (hasPeriod) {
      yahooUrl.searchParams.set('period1', period1);
      yahooUrl.searchParams.set('period2', period2);
    } else {
      yahooUrl.searchParams.set('range', range);
    }
    yahooUrl.searchParams.set('interval', interval);
    return yahooUrl;
  };

  try {
    let upstream;
    let body = '';
    let lastError;

    for (const host of YAHOO_HOSTS) {
      try {
        upstream = await fetch(buildYahooUrl(host).toString(), {
          headers: YAHOO_HEADERS,
          signal: AbortSignal.timeout(12000),
        });
        body = await upstream.text();
        if (upstream.ok || host === YAHOO_HOSTS.at(-1)) break;
      } catch (error) {
        lastError = error;
        if (host === YAHOO_HOSTS.at(-1)) throw error;
      }
    }

    if (!upstream) throw lastError || new Error('No upstream response');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.status(upstream.status >= 200 && upstream.status < 600 ? upstream.status : 502).end(body);
  } catch (err) {
    res.status(502).json({ error: 'Unable to reach chart provider', details: err.message });
  }
};
