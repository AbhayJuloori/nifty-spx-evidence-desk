# NIFTY 50 vs S&P 500 Overlay

Interactive percent-growth research desk for NIFTY 50 and the S&P 500.

## Run

```bash
node server.js
```

Open `http://localhost:4173`.

The local server is required: it serves the app, the bundled chart library, and the Yahoo Finance proxy. It proxies chart data for `^NSEI`, `^GSPC`, `INR=X`, `BZ=F`, and `^NDX`, then the browser normalizes the market series to percent growth.

Use `Session date` mode to compare a single trading date from each market open. `Session aligned` starts both indices at the same point on the x-axis; `Exact time` keeps their real clock timestamps so the India/US session gap is visible.

The showcase view adds:

- a page-based flow: Live Overlay, Story Deck, Deep Dive, and Macro Notebook
- a local stock-market hero image with first-load motion
- narrated, data-driven replay stories
- ten beginner-friendly market story cards
- prior-S&P to next-NIFTY lead-lag testing
- lag sweep across same-day, prior-close, and two-session-back samples
- weekly/monthly horizon evidence
- risk, volatility, return/vol, and drawdown cockpit
- USD/INR, Brent, and Nasdaq-vs-S&P context lenses
- recent divergence cards and a forward scenario notebook
- data provenance plus a copyable thesis summary

The main framing is intentionally modest: association only, not a forecast. Macro cards are clues for investigation, not causal proof.
