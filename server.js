const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const execFileAsync = promisify(execFile);

const SYMBOLS = {
  nifty: "^NSEI",
  spx: "^GSPC",
  usdinr: "INR=X",
  brent: "BZ=F",
  ndx: "^NDX",
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

function isSafeRange(value) {
  return /^(1d|5d|1mo|3mo|6mo|ytd|1y|2y|3y|5y|10y|max)$/.test(value);
}

function isSafeInterval(value) {
  return /^(1m|2m|5m|15m|30m|60m|90m|1h|1d|5d|1wk|1mo|3mo)$/.test(value);
}

function isSafePeriod(value) {
  return /^\d{9,11}$/.test(value);
}

async function proxyChart(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const symbolKey = requestUrl.searchParams.get("symbol");
  const range = requestUrl.searchParams.get("range") || "1y";
  const interval = requestUrl.searchParams.get("interval") || "1d";
  const period1 = requestUrl.searchParams.get("period1");
  const period2 = requestUrl.searchParams.get("period2");
  const hasPeriod = period1 !== null || period2 !== null;
  const symbol = SYMBOLS[symbolKey];

  if (!symbol || !isSafeInterval(interval)) {
    send(res, 400, JSON.stringify({ error: "Invalid chart request" }), "application/json; charset=utf-8");
    return;
  }

  if (hasPeriod) {
    const from = Number(period1);
    const to = Number(period2);
    const maxSpanSeconds = 60 * 60 * 24 * 370 * 20;
    if (!isSafePeriod(period1 || "") || !isSafePeriod(period2 || "") || to <= from || to - from > maxSpanSeconds) {
      send(res, 400, JSON.stringify({ error: "Invalid chart period" }), "application/json; charset=utf-8");
      return;
    }
  } else if (!isSafeRange(range)) {
    send(res, 400, JSON.stringify({ error: "Invalid chart range" }), "application/json; charset=utf-8");
    return;
  }

  const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  if (hasPeriod) {
    yahooUrl.searchParams.set("period1", period1);
    yahooUrl.searchParams.set("period2", period2);
  } else {
    yahooUrl.searchParams.set("range", range);
  }
  yahooUrl.searchParams.set("interval", interval);

  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-sL",
        "--max-time",
        "12",
        "-A",
        "Mozilla/5.0",
        "-H",
        "accept: application/json",
        "-w",
        "\n__HTTP_STATUS__:%{http_code}",
        yahooUrl.toString(),
      ],
      { maxBuffer: 12 * 1024 * 1024 },
    );

    const marker = "\n__HTTP_STATUS__:";
    const markerIndex = stdout.lastIndexOf(marker);
    const body = markerIndex >= 0 ? stdout.slice(0, markerIndex) : stdout;
    const status = markerIndex >= 0 ? Number(stdout.slice(markerIndex + marker.length)) : 200;
    send(res, status >= 200 && status < 600 ? status : 502, body, "application/json; charset=utf-8");
  } catch (error) {
    send(
      res,
      502,
      JSON.stringify({ error: "Unable to reach chart provider", details: error.message }),
      "application/json; charset=utf-8",
    );
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(ROOT, decodedPath));
  const relativePath = path.relative(ROOT, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    send(res, 200, file, MIME_TYPES[path.extname(filePath)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found");
  }
}

http
  .createServer((req, res) => {
    if (req.url.startsWith("/api/chart")) {
      proxyChart(req, res);
      return;
    }

    serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`NIFTY/SPX chart running at http://localhost:${PORT}`);
  });
