# DS Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the NIFTY/S&P 500 dashboard to signal data-science rigour to a quant screener — DS case-study stories, live OLS/Granger stat card, animation bug fix, macro view explainer, controls cleanup, dark terminal theme refinement.

**Architecture:** All changes land in three existing files (`app.js`, `styles.css`, `index.html`). No new files. `modules/stats.js` is already imported dynamically in `loadLeadLagStudy()`; we extend that import to include `olsRegression` and `grangerTest`. All Codex tasks executed via **delegatecodex v2 bridge** (`codex exec --json --sandbox workspace-write`).

**Tech Stack:** Vanilla JS (ES modules), CSS custom properties, Lightweight Charts, modules/stats.js (OLS, Granger, Pearson, Wilson CI already implemented)

---

## File Map

| File | Line range | What changes |
|------|-----------|--------------|
| `app.js` | 323–359 | Add `storySequenceRunning: false` to state |
| `app.js` | 1743–1762 | `renderInsights()` — call `renderDsStatCard()` before insightPanel.innerHTML |
| `app.js` | 1855–1928 | `renderStoryTheatre()` — DOM rebuild guard + else-branch guard |
| `app.js` | 1998–2051 | `runStorySequence()` / `finishStorySequence()` — set running flag |
| `app.js` | 107–321 | `SHOWCASE_STORIES` — add DS fields to all 10 entries |
| `app.js` | 2061–2091 | `storyTakeawayMarkup()` — render DS case-study settled card |
| `app.js` | 2574–2714 | `loadLeadLagStudy()` — wire OLS + Granger into study pipeline |
| `app.js` | 3004–3024 | `buildThesisSummary()` — add OLS/Granger/lag to copy output |
| `index.html` | 106–199 | Controls: remove `advanced-toggleable` from most; keep only granularity |
| `index.html` | 340–415 | Macro page: add "What is this page?" explainer block |
| `styles.css` | throughout | DS stat card styles + dark terminal theme refinement |

---

## Task 1: Wire OLS + Granger into study pipeline

**Files:**
- Modify: `app.js` lines 2574–2714 (`loadLeadLagStudy`)

- [ ] **Step 1: Extend the stats import destructuring**

Find line 2575 in `app.js`:
```js
const { dailyReturns } = await statsModulePromise;
```
Replace with:
```js
const { dailyReturns, olsRegression, grangerTest } = await statsModulePromise;
```

- [ ] **Step 2: Compute OLS and Granger after `recentPairs` is built**

After line 2658 in `app.js` (`const strongPairs = recentPairs.filter(...)`), add:
```js
// Convert linked pairs to stats module input format
const spxOlsInput = recentPairs.map((p) => ({ date: p.spxDate, return: p.spx }));
const niftyOlsInput = recentPairs.map((p) => ({ date: p.niftyDate, return: p.nifty }));
const olsResult = olsRegression(spxOlsInput, niftyOlsInput);
// grangerTest(yReturns, xReturns, lag) — y=NIFTY, x=SPX
const grangerResult = grangerTest(niftyOlsInput, spxOlsInput, 1);
```

- [ ] **Step 3: Add `ols` and `granger` fields to `state.study`**

In the `state.study = { ... }` object at line 2686, add after `strong: summarizePairs(strongPairs),`:
```js
ols: { alpha: olsResult.alpha, beta: olsResult.beta, rSquared: olsResult.rSquared },
granger: { fStat: grangerResult.fStat, pValue: grangerResult.pValue, significant: grangerResult.significant },
```

- [ ] **Step 4: Verify in browser console**

Start server: `node server.js &`
Open browser console on `http://localhost:4173`, wait ~3s for study to load, then run:
```js
console.log(state.study.ols, state.study.granger)
```
Expected: objects with numeric `beta`, `rSquared`, `fStat`, `pValue` (not all NaN).

- [ ] **Step 5: Commit**
```bash
git add app.js && git commit -m "feat: wire olsRegression and grangerTest into study pipeline"
```

---

## Task 2: Animation bug fix

**Files:**
- Modify: `app.js` lines 323–359, 1855–1928, 1998–2051

- [ ] **Step 1: Add `storySequenceRunning` to state**

In the `const state = { ... }` object (around line 348), add after `storyTypeTimer: null,`:
```js
storySequenceRunning: false,
```

- [ ] **Step 2: Set flag in `runStorySequence`**

Find `function runStorySequence(phaseItems) {` (line ~1998). After `stopStorySequence();` add:
```js
state.storySequenceRunning = true;
```

- [ ] **Step 3: Clear flag in `finishStorySequence`**

Find `function finishStorySequence(phaseItems) {` (line ~2031). Add as first line of the function body:
```js
state.storySequenceRunning = false;
```

- [ ] **Step 4: Guard the else-branch in `renderStoryTheatre`**

Find this block in `renderStoryTheatre` (line ~1924):
```js
  } else {
    setStoryVisualMode("settled");
    finishStorySequence(phaseItems);
  }
```
Replace with:
```js
  } else if (!state.storySequenceRunning) {
    setStoryVisualMode("settled");
    finishStorySequence(phaseItems);
  }
```

- [ ] **Step 5: Guard DOM rebuilds during active sequence**

In `renderStoryTheatre`, find the `els.storySteps.innerHTML = phaseItems.map(...)` block (line ~1897). Wrap the `innerHTML` assignment and the `updateStoryPaths` call in a guard:

Find:
```js
  els.storySteps.innerHTML = phaseItems
    .map(
      (item, index) =>
```
Replace the block from `els.storySteps.innerHTML = ...` through to its closing `.join("")` with:
```js
  if (!state.storySequenceRunning) {
    els.storySteps.innerHTML = phaseItems
      .map(
        (item, index) =>
          `<div class="story-step" data-story-step="${index}">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <span>${escapeHTML(item.label)}</span>
            <strong>${escapeHTML(item.value)}</strong>
            <small>${escapeHTML(item.narration)}</small>
          </div>`,
      )
      .join("");
  }
```

Find the `updateStoryPaths(spxReturn, niftyReturn, spread);` call (line ~1914) and wrap it:
```js
  if (!state.storySequenceRunning) {
    updateStoryPaths(spxReturn, niftyReturn, spread);
  }
```

- [ ] **Step 6: Verify fix**

Start server if not running. Click a story card from the gallery. The 3-phase animation should play fully (each phase ~1.6s) without skipping to the last state. After animation completes the settled state should show all steps active.

- [ ] **Step 7: Commit**
```bash
git add app.js && git commit -m "fix: prevent study reload from interrupting story sequence animation"
```

---

## Task 3: DS Stat Card — render function + HTML slot + CSS

**Files:**
- Modify: `app.js` — add `renderDsStatCard()`, call from `renderInsights()`
- Modify: `index.html` — add `#dsStatCard` slot inside insight panel
- Modify: `styles.css` — DS card styles

- [ ] **Step 1: Add HTML slot in `index.html`**

Find in `index.html`:
```html
          <section id="insightPanel" class="insight-panel" aria-live="polite"></section>
```
Replace with:
```html
          <div id="dsStatCard" class="ds-stat-card" aria-label="Model summary"></div>
          <section id="insightPanel" class="insight-panel" aria-live="polite"></section>
```

- [ ] **Step 2: Add `els.dsStatCard` reference**

In `app.js` `els` object (line ~470), after `insightPanel: document.querySelector("#insightPanel"),` add:
```js
dsStatCard: document.querySelector("#dsStatCard"),
```

- [ ] **Step 3: Add `renderDsStatCard()` function**

Add this function to `app.js` immediately before `function renderInsights()` (line 1709):
```js
function renderDsStatCard() {
  if (!els.dsStatCard) return;
  const study = state.study;
  const ols = study?.ols;
  const granger = study?.granger;
  const recent = study?.recent;

  const fmt2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "--");
  const fmt4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : "--");
  const fmtPct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(0)}%` : "--");
  const n = recent?.sample ?? "--";
  const hitRate = fmtPct(recent?.hitRate);
  const hitCi = study ? (() => {
    const { lower, upper } = wilsonIntervalPublic(
      Math.round((recent?.hitRate ?? 0) * (recent?.sample ?? 0)),
      recent?.sample ?? 0,
    );
    return Number.isFinite(lower) ? `[${fmtPct(lower)}–${fmtPct(upper)}]` : "";
  })() : "";
  const grangerSig = granger?.significant ? "✓ significant" : (granger?.pValue != null && Number.isFinite(granger.pValue) ? "not significant" : "--");

  // safe: developer-controlled strings + escapeHTML on all dynamic values
  els.dsStatCard.innerHTML = `
    <div class="ds-card-primary">
      <div class="ds-card-row">
        <span class="ds-label">Model</span>
        <span class="ds-value">OLS — NIFTY<sub>t</sub> = α + β·SPX<sub>t-1</sub></span>
      </div>
      <div class="ds-card-row">
        <span class="ds-label">β</span><span class="ds-value ds-accent">${escapeHTML(fmt2(ols?.beta))}</span>
        <span class="ds-label">R²</span><span class="ds-value ds-accent">${escapeHTML(fmt2(ols?.rSquared))}</span>
        <span class="ds-label">α</span><span class="ds-value">${escapeHTML(fmt4(ols?.alpha))}</span>
      </div>
      <div class="ds-card-row">
        <span class="ds-label">Hit rate</span>
        <span class="ds-value ds-accent">${escapeHTML(hitRate)} ${escapeHTML(hitCi)}</span>
        <span class="ds-label">n</span><span class="ds-value">${escapeHTML(String(n))}</span>
      </div>
      <div class="ds-card-row">
        <span class="ds-label">Granger F</span>
        <span class="ds-value">${escapeHTML(fmt2(granger?.fStat))}</span>
        <span class="ds-label">p</span>
        <span class="ds-value ${granger?.significant ? "ds-sig" : ""}">${escapeHTML(fmt4(granger?.pValue))} ${escapeHTML(grangerSig)}</span>
      </div>
    </div>
    <details class="ds-card-secondary">
      <summary>Show methodology</summary>
      <div class="ds-card-row"><span class="ds-label">Data</span><span class="ds-value">Daily session pairs, close-to-close returns, 2Y window</span></div>
      <div class="ds-card-row"><span class="ds-label">Feature</span><span class="ds-value">X = S&amp;P return, lagged 1 session (no look-ahead)</span></div>
      <div class="ds-card-row"><span class="ds-label">Limitation</span><span class="ds-value">Associative only. FX, oil, local flows, sector mix uncontrolled.</span></div>
    </details>`;
}
```

- [ ] **Step 4: Add `wilsonIntervalPublic` helper**

The Wilson CI calculation in `modules/stats.js` is not exported, so we need a local version. Add this function near `standardDeviation` in `app.js` (line ~1347):
```js
function wilsonIntervalPublic(hits, n) {
  if (!n || !Number.isFinite(hits) || !Number.isFinite(n)) return { lower: NaN, upper: NaN };
  const z = 1.959963984540054;
  const p = hits / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}
```

- [ ] **Step 5: Call `renderDsStatCard()` from `renderInsights()`**

In `function renderInsights()` (line 1709), as the very first line of the function body add:
```js
  renderDsStatCard();
```

- [ ] **Step 6: Add CSS for DS stat card**

Add to `styles.css`:
```css
/* DS Stat Card */
.ds-stat-card {
  border-left: 3px solid var(--accent-teal, #00d6a3);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0 8px 8px 0;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 0.82rem;
  line-height: 1.5;
}

.ds-card-primary { display: flex; flex-direction: column; gap: 6px; }

.ds-card-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.ds-label {
  color: var(--text-muted, #8a8a8a);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.ds-value {
  color: var(--text, #e8e6e0);
  font-variant-numeric: tabular-nums;
}

.ds-value.ds-accent {
  color: var(--accent-teal, #00d6a3);
  font-weight: 600;
}

.ds-value.ds-sig {
  color: #7ecb7e;
}

.ds-card-secondary {
  margin-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 10px;
}

.ds-card-secondary summary {
  cursor: pointer;
  color: var(--text-muted, #8a8a8a);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  user-select: none;
}

.ds-card-secondary[open] summary { margin-bottom: 8px; }
```

- [ ] **Step 7: Verify card renders**

Open `http://localhost:4173`, navigate to Analysis page. Right panel should show the DS stat card above the insight cards. While study is loading, all values show "--". After load, β, R², hit rate, Granger F and p should show real numbers.

- [ ] **Step 8: Commit**
```bash
git add app.js index.html styles.css && git commit -m "feat: add DS stat summary card to analysis panel"
```

---

## Task 4: Story data rewrite (DS case-study fields)

**Files:**
- Modify: `app.js` lines 170–321 (`SHOWCASE_STORIES` array)

Each story gets 6 new fields: `problem`, `data`, `feature`, `model`, `result`, `limitation`. All conceptual — no hardcoded stat numbers. `phases` maps to Feature / Model / Result & residual.

- [ ] **Step 1: Rewrite all 10 SHOWCASE_STORIES entries**

Replace the entire `const SHOWCASE_STORIES = [...]` block (lines 170–321) with:

```js
const SHOWCASE_STORIES = [
  {
    id: "spx-follow-through",
    caseId: "risk-on-follow",
    title: "S&P Follow-Through as a Directional Feature",
    hook: "Treat the prior S&P session as X. How often does it predict NIFTY direction?",
    level: "Introductory case",
    metric: "Directional hit rate (OLS + Wilson CI)",
    detail:
      "The cleanest version of the thesis: prior S&P return as a single feature in a lag-1 OLS model. Hit rate and R² tell us how much predictive signal survives to the India open.",
    problem: "Can the sign of the prior S&P session predict the sign of the next NIFTY session?",
    data: "Daily session pairs, close-to-close returns, 2-year window",
    feature: "X = S&P daily return, lagged 1 session — no look-ahead bias",
    model: "OLS: NIFTY_t = α + β·SPX_{t-1} | evaluated by directional hit rate",
    result: "Live from model — β, R², hit rate with 95% Wilson CI (see stat card above)",
    limitation: "Single-feature model. FX regime, oil, sector composition, local flows uncontrolled.",
    phases: [
      ["Feature", "S&P daily return is the input signal — lagged one session so there is no look-ahead bias."],
      ["Model", "OLS regression maps the S&P feature to NIFTY. Directional hit rate measures how often sign matches."],
      ["Result & residual", "Where sign matched (model correct) and where the spread opened (model error term)."],
    ],
  },
  {
    id: "divergence-miss",
    caseId: "model-miss",
    title: "When the Single-Feature Model Breaks",
    hook: "Model misses are more informative than agreements — they expose omitted variables.",
    level: "Feature engineering",
    metric: "NIFTY minus S&P spread (residual size)",
    detail:
      "A divergence is a large residual. When S&P is positive but NIFTY is negative, the single-feature OLS model is wrong. That is the prompt for investigating FX, oil, flows, and sector mix as additional features.",
    problem: "Why does the lag-1 S&P feature fail on certain sessions, and what omitted variables explain the miss?",
    data: "Daily session pairs with FX, Brent, and tech-spread covariates as candidate features",
    feature: "X₁ = S&P return (lagged), X₂ = USD/INR move (candidate), X₃ = Brent move (candidate)",
    model: "Residual analysis: large |NIFTY − fitted| → investigate candidate confounders",
    result: "Live — largest spread in selected window shown in Divergence Radar panel",
    limitation: "Exploratory, not causal. Confounder checks are correlation screens, not structural models.",
    phases: [
      ["Feature", "S&P is positive — the single feature says NIFTY should follow. It does not."],
      ["Model", "The spread (residual) opens. The model's miss is the data point of interest."],
      ["Result & residual", "Size of the miss prompts feature investigation: FX, oil, and tech breadth as candidate confounders."],
    ],
  },
  {
    id: "inr-depreciation",
    caseId: "model-miss",
    title: "INR Depreciation as a Confounder",
    hook: "A weakening rupee changes how dollar-denominated investors read India returns.",
    level: "Confounding variable",
    metric: "USD/INR move vs NIFTY-minus-S&P spread",
    detail:
      "If USD/INR rises (rupee weakens), foreign investors in Indian equities lose on FX translation even if local prices are flat. This creates a second explanatory variable that can flip the observed spread.",
    problem: "Does USD/INR move add explanatory power to NIFTY spread beyond the S&P feature alone?",
    data: "Daily pairs with USD/INR return aligned to the NIFTY response date",
    feature: "X₂ = USD/INR daily return (rupee depreciation = positive X₂)",
    model: "Correlation of X₂ with spread residual | FX panel shows directional association",
    result: "Live — FX vs spread correlation from state.study.fx (see FX Stress window)",
    limitation: "Correlation only. FX can be endogenous — market stress may cause both INR weakness and equity selloff.",
    phases: [
      ["Feature", "USD/INR move on the NIFTY response date is a candidate second feature."],
      ["Model", "Check whether rupee depreciation correlates with the S&P-NIFTY spread residual."],
      ["Result & residual", "FX correlation tells whether adding this feature would improve the model — not whether it is causal."],
    ],
  },
  {
    id: "india-catch-up",
    caseId: "nifty-outperformance",
    title: "India Catch-Up as a Regime Shift",
    hook: "If domestic momentum dominates global beta, the residual should be persistently positive.",
    level: "Regime analysis",
    metric: "Weekly and monthly return vs volatility (risk-adjusted spread)",
    detail:
      "Structural outperformance should show up at weekly and monthly horizons, not just on one noisy day. A regime shift in the intercept α is a falsifiable claim: if India is de-coupling, rolling α should trend upward.",
    problem: "Is NIFTY outperformance a persistent structural shift or daily noise?",
    data: "Weekly and monthly session pairs, 2-year window",
    feature: "Horizon selection: daily vs weekly vs monthly aggregation as a hyperparameter",
    model: "Rolling OLS with α monitored over time | Sharpe and max-drawdown as risk-adjusted filters",
    result: "Live — weekly/monthly correlation and return/vol metrics in Risk Cockpit",
    limitation: "Short sample (2Y). Survivorship and selection bias not controlled. Not investment advice.",
    phases: [
      ["Feature", "Aggregating to weekly or monthly reduces noise and exposes the persistent relationship better."],
      ["Model", "OLS intercept α — if India is structurally outperforming, α should be positive and stable over time."],
      ["Result & residual", "Risk-adjusted metrics (Sharpe, drawdown) tell whether the outperformance was efficient or just volatility."],
    ],
  },
  {
    id: "ai-boom",
    caseId: "risk-on-follow",
    title: "AI Concentration Makes S&P a Noisy Feature",
    hook: "When Nasdaq 100 beats the S&P by a wide margin, the S&P return is largely tech-sector signal, not broad global risk.",
    level: "Feature engineering",
    metric: "Nasdaq 100 minus S&P 500 spread as feature quality proxy",
    detail:
      "Feature quality degrades when the feature conflates multiple regimes. If S&P gains are driven by 5 mega-cap AI names, the feature is measuring narrow US tech leadership — not the broad global risk appetite that should transmit to NIFTY.",
    problem: "Does tech concentration reduce the predictive validity of the S&P feature for NIFTY?",
    data: "Daily pairs with Nasdaq 100 return as concentration proxy",
    feature: "Feature quality proxy: NDX-minus-SPX spread (high = mega-cap heavy day)",
    model: "Stratified hit rate: compare model accuracy on high-concentration vs low-concentration days",
    result: "Live — tech spread for selected case shown in US Factor Lens window",
    limitation: "NDX-SPX is a rough breadth proxy. Sector-level decomposition would be more precise.",
    phases: [
      ["Feature", "On days where Nasdaq beats S&P widely, the S&P return is dominated by a few AI names."],
      ["Model", "Stratify sessions by NDX-SPX spread. Does hit rate fall on high-concentration days?"],
      ["Result & residual", "Tech breadth is a feature-quality signal — it tells us when to trust the main feature less."],
    ],
  },
  {
    id: "tech-boom",
    caseId: "risk-on-follow",
    title: "Sector Composition Mismatch",
    hook: "S&P sector weights and NIFTY sector weights differ — a tech-heavy US rally may not translate.",
    level: "Feature engineering",
    metric: "Tech spread (NDX-SPX) as sector mismatch signal",
    detail:
      "The S&P is not a pure global-risk instrument. When technology and communication services dominate the move, the feature carries sector-specific signal that does not map to India's sector composition.",
    problem: "Does sector composition of the S&P move affect how well it predicts NIFTY?",
    data: "Daily pairs with Nasdaq 100 as tech-weight proxy",
    feature: "X = S&P return, conditioned on whether the move was broad or tech-concentrated",
    model: "Conditional hit rate: split on |NDX-SPX| threshold, compare directional accuracy in each regime",
    result: "Live — tech spread shown in US Factor Lens window",
    limitation: "NDX is a proxy. True sector decomposition requires factor model data not used here.",
    phases: [
      ["Feature", "Same S&P return feature, but now we flag whether the move was broad-market or sector-concentrated."],
      ["Model", "Conditional accuracy: does hit rate differ between broad-rally days and tech-concentration days?"],
      ["Result & residual", "Sector mismatch is a feature interaction effect — the S&P feature's predictive value depends on what drove it."],
    ],
  },
  {
    id: "oil-shock",
    caseId: "risk-off-follow",
    title: "Brent Crude as an Exogenous Confounder",
    hook: "India imports ~85% of its crude. An oil shock is a cost-push inflation event that affects India differently than the US.",
    level: "Exogenous shock",
    metric: "Brent return vs NIFTY-minus-S&P spread",
    detail:
      "An oil spike can widen the spread even when the S&P signal is neutral or positive. Brent is a candidate feature for improving model performance on sessions where the current account and inflation channel dominate global beta.",
    problem: "Does Brent crude return add explanatory power for the NIFTY spread residual on shock sessions?",
    data: "Daily pairs with Brent crude return aligned to NIFTY response date",
    feature: "X₃ = Brent daily return (positive = oil spike = India cost-push pressure)",
    model: "Correlation of Brent return with spread residual | shown in oil shock panel",
    result: "Live — Brent vs spread correlation from state.study.oil",
    limitation: "Crude affects India through current account and inflation lag — daily correlation understates the true transmission.",
    phases: [
      ["Feature", "Brent daily return on the NIFTY response date — a candidate additional feature."],
      ["Model", "Does Brent return correlate with the spread residual? If yes, the model is missing an energy variable."],
      ["Result & residual", "Oil correlation is a feature importance signal — it tells us whether energy deserves its own term."],
    ],
  },
  {
    id: "dedollarization",
    caseId: "model-miss",
    title: "De-Dollarization as a Regime Hypothesis",
    hook: "This is a falsifiable scenario, not a chart pattern. If the FX regime shifts, it should show up in persistent USD/INR behaviour.",
    level: "Hypothesis / falsifiable scenario",
    metric: "Monthly FX regime (rolling USD/INR correlation)",
    detail:
      "A regime shift in the dollar-India relationship would manifest as structural change in the FX correlation coefficient over time. Rolling OLS with USD/INR as a covariate is the testable version of the de-dollarization narrative.",
    problem: "Is there evidence of a structural shift in the USD/INR-to-NIFTY-spread relationship that would indicate a currency regime change?",
    data: "Monthly returns with rolling 12-month USD/INR correlation tracked over time",
    feature: "X = USD/INR return, tested across rolling 12-month windows for structural break",
    model: "Rolling correlation of FX feature with spread residual | stationarity as falsifier",
    result: "Live — FX correlation from state.study.fx; rolling behaviour visible in long-range chart",
    limitation: "2-year sample is too short to detect a true regime shift. This is a monitoring hypothesis, not a conclusion.",
    phases: [
      ["Feature", "USD/INR return as a rolling-window feature — watching for structural change over time."],
      ["Model", "If the de-dollarization regime is real, rolling FX correlation with the spread should trend upward."],
      ["Result & residual", "Absence of a trend is the falsifier — the hypothesis remains unconfirmed until the rolling coefficient moves."],
    ],
  },
  {
    id: "support-resistance",
    caseId: "nifty-outperformance",
    title: "Technical Levels as a Discrete Feature",
    hook: "Prior highs and lows can be modelled as threshold features — price reactions near them are non-linear.",
    level: "Technical overlay",
    metric: "Normalized spread at prior level zones",
    detail:
      "Support and resistance are places where prior market participants reacted. In a feature engineering context, proximity to a prior level is a discrete indicator that can be interacted with the main S&P feature.",
    problem: "Do spread dynamics change when normalised prices approach prior high or low zones?",
    data: "Session pairs with normalised price levels and prior-session high/low markers",
    feature: "Indicator: IS_NEAR_LEVEL (binary, proximity threshold)",
    model: "Interaction term: β₁·SPX + β₂·(SPX × IS_NEAR_LEVEL) — does level proximity alter the S&P transmission?",
    result: "Qualitative — observe whether spread stalls or reverses at prior normalised levels",
    limitation: "Level selection is subjective. Confirmation bias risk: levels are easy to find in hindsight.",
    phases: [
      ["Feature", "Mark where a prior normalised move stalled — this becomes a discrete indicator feature."],
      ["Model", "Interaction term: does the S&P transmission coefficient change when price is near a prior level?"],
      ["Result & residual", "If the spread stalls at a known level, that is evidence the feature adds information — otherwise it is noise."],
    ],
  },
  {
    id: "weekly-monthly",
    caseId: "risk-on-follow",
    title: "Horizon as a Hyperparameter",
    hook: "Aggregation horizon is a modelling choice — daily, weekly, monthly are different feature spaces.",
    level: "Portfolio horizon",
    metric: "Weekly and monthly correlation vs daily correlation",
    detail:
      "A portfolio manager cares about weekly or monthly predictability, not one-session noise. Treating aggregation horizon as a hyperparameter — and comparing model performance across horizons — is a standard DS validation technique.",
    problem: "At which aggregation horizon (daily/weekly/monthly) does the S&P feature have the strongest predictive signal for NIFTY?",
    data: "Daily, weekly, and monthly session pairs over 2-year window",
    feature: "Horizon-aggregated returns: same X (S&P lagged) and Y (NIFTY), different time bucket",
    model: "OLS + hit rate evaluated at each horizon | weekly and monthly correlation as evaluation metrics",
    result: "Live — weekly and monthly correlations from state.study.weekly and state.study.monthly",
    limitation: "Longer horizons have fewer observations — estimate variance is higher and CI is wider.",
    phases: [
      ["Feature", "Aggregate returns from daily to weekly or monthly — this is a feature engineering choice that affects signal-to-noise ratio."],
      ["Model", "Same OLS model, different time bucket. Which horizon maximises hit rate and correlation?"],
      ["Result & residual", "The best horizon is a hyperparameter finding — it tells a portfolio manager which frequency the signal is most reliable at."],
    ],
  },
];
```

- [ ] **Step 2: Verify gallery renders correctly**

Open `http://localhost:4173`, navigate to Stories page. All 10 cards should render with updated titles and level labels (e.g., "Introductory case", "Feature engineering", "Regime analysis", etc.).

- [ ] **Step 3: Commit**
```bash
git add app.js && git commit -m "feat: rewrite SHOWCASE_STORIES with DS case-study structure"
```

---

## Task 5: Story takeaway card and step label updates

**Files:**
- Modify: `app.js` — `storyTakeawayMarkup()` (line ~2061), story step labels in `renderStoryTheatre()` and `runStorySequence()`

- [ ] **Step 1: Update `storyTakeawayMarkup()` to render DS settled card**

Replace the entire `function storyTakeawayMarkup(story, selected, spread)` (lines ~2061–2081) with:

```js
function storyTakeawayMarkup(story, selected, spread) {
  const spreadText =
    Number.isFinite(spread) && Math.abs(spread) >= 0.01
      ? spread > 0
        ? `NIFTY outran the S&P feature by ${formatPercent(spread)} — positive residual.`
        : `NIFTY lagged the S&P feature by ${formatPercent(Math.abs(spread))} — negative residual.`
      : "NIFTY and S&P finished nearly even — residual close to zero.";
  const observation = selected
    ? `${formatDateLabel(selected.spxDate)} → ${formatDateLabel(selected.niftyDate)}`
    : "Use any completed US session";

  if (!story) {
    return `<div class="takeaway-block">
      <span>Observation</span>
      <strong>${escapeHTML(observation)}</strong>
      <small>${escapeHTML(spreadText)}</small>
    </div>`;
  }

  return `
    <div class="takeaway-block">
      <span>Observation</span>
      <strong>${escapeHTML(observation)}</strong>
      <small>${escapeHTML(spreadText)}</small>
    </div>
    <div class="ds-case-card">
      <div class="ds-case-row"><span class="ds-case-label">Problem</span><span class="ds-case-body">${escapeHTML(story.problem || "")}</span></div>
      <div class="ds-case-row"><span class="ds-case-label">Model</span><span class="ds-case-body">${escapeHTML(story.model || "")}</span></div>
      <div class="ds-case-row ds-case-result"><span class="ds-case-label">Result</span><span class="ds-case-body">${escapeHTML(story.result || "")}</span></div>
      <details class="ds-case-more">
        <summary>Data · Feature · Limitation</summary>
        <div class="ds-case-row"><span class="ds-case-label">Data</span><span class="ds-case-body">${escapeHTML(story.data || "")}</span></div>
        <div class="ds-case-row"><span class="ds-case-label">Feature</span><span class="ds-case-body">${escapeHTML(story.feature || "")}</span></div>
        <div class="ds-case-row ds-case-limitation"><span class="ds-case-label">Limitation</span><span class="ds-case-body">${escapeHTML(story.limitation || "")}</span></div>
      </details>
    </div>`;
}
```

- [ ] **Step 2: Add CSS for DS case card**

Add to `styles.css`:
```css
/* DS Case Card (story settled state) */
.ds-case-card {
  margin-top: 14px;
  border-left: 3px solid var(--accent-teal, #00d6a3);
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0 8px 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.8rem;
}

.ds-case-row {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.ds-case-label {
  color: var(--text-muted, #8a8a8a);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  min-width: 68px;
}

.ds-case-body {
  color: var(--text, #e8e6e0);
  line-height: 1.45;
}

.ds-case-result .ds-case-body { color: var(--accent-teal, #00d6a3); }
.ds-case-limitation .ds-case-body { color: var(--text-muted, #8a8a8a); font-style: italic; }

.ds-case-more {
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-top: 8px;
  margin-top: 2px;
}

.ds-case-more summary {
  cursor: pointer;
  color: var(--text-muted, #8a8a8a);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.ds-case-more[open] summary { margin-bottom: 8px; }
```

- [ ] **Step 3: Update step labels in `runStorySequence`**

In `runStorySequence`, find:
```js
els.storyPhase.textContent = `Phase 0${index + 1}: ${item.label}`;
```
Replace with:
```js
els.storyPhase.textContent = `Step ${index + 1}: ${item.label}`;
```

- [ ] **Step 4: Verify settled card**

Navigate to Analysis page, click any story from the gallery, wait for animation to complete. The settled state should show the DS case card with Problem / Model / Result rows, and a "Data · Feature · Limitation" collapsible below.

- [ ] **Step 5: Commit**
```bash
git add app.js styles.css && git commit -m "feat: DS case-study settled card in story takeaway"
```

---

## Task 6: Macro view "What is this page?" explainer

**Files:**
- Modify: `index.html` — add explainer block inside macro page sections
- Modify: `styles.css` — explainer styles
- Modify: `app.js` — `buildThesisSummary()` extended with OLS/Granger

- [ ] **Step 1: Add explainer HTML block**

In `index.html`, find:
```html
      <section class="macro-cover reveal" data-page-section="macro" aria-label="Macro notebook intro">
```
Immediately before that line add:
```html
      <section class="macro-explainer reveal" data-page-section="macro" aria-label="Macro page explainer">
        <div class="macro-explainer-copy">
          <p class="eyebrow">Research methodology layer</p>
          <h2>What is this page?</h2>
          <p>Four questions, each with its own section — read top to bottom or jump to any card.</p>
        </div>
        <div class="macro-explainer-cards">
          <div class="macro-ex-card">
            <strong>Lag Analysis</strong>
            <span>How strong is the signal, and at which horizon (daily / weekly / monthly)?</span>
          </div>
          <div class="macro-ex-card">
            <strong>Divergence Board</strong>
            <span>Where does the single-feature model break, and which confounders (FX, oil, tech) explain it?</span>
          </div>
          <div class="macro-ex-card">
            <strong>Risk Cockpit</strong>
            <span>Was the return efficient? Sharpe ratio, max drawdown, and volatility for both indices.</span>
          </div>
          <div class="macro-ex-card">
            <strong>Forward Scenarios</strong>
            <span>Falsifiable if-then hypotheses — what conditions would change the model's validity?</span>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Add CSS for explainer**

Add to `styles.css`:
```css
/* Macro explainer */
.macro-explainer {
  padding: 48px 32px 32px;
  max-width: 1100px;
  margin: 0 auto;
}

.macro-explainer-copy { margin-bottom: 28px; }
.macro-explainer-copy h2 { margin: 4px 0 8px; }

.macro-explainer-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.macro-ex-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-top: 3px solid var(--accent-teal, #00d6a3);
  border-radius: 0 0 8px 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.macro-ex-card strong {
  color: var(--text, #e8e6e0);
  font-size: 0.85rem;
}

.macro-ex-card span {
  color: var(--text-muted, #8a8a8a);
  font-size: 0.78rem;
  line-height: 1.45;
}
```

- [ ] **Step 3: Extend `buildThesisSummary()` in `app.js`**

Replace the entire `function buildThesisSummary()` (lines ~3004–3024) with:
```js
function buildThesisSummary() {
  const study = state.study;
  const selected = activeCase();
  const bestLag = study?.lagSweep?.reduce((best, row) => (!best || row.hitRate > best.hitRate ? row : best), null);
  const topMiss = study?.contextRows?.[0];
  const ols = study?.ols;
  const granger = study?.granger;
  const fmt2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "--");
  const fmt4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : "--");
  return [
    "NIFTY / S&P Evidence Desk — DS Model Summary",
    "",
    "MODEL",
    `OLS: NIFTY_t = α + β·SPX_{t-1}`,
    `β = ${fmt2(ols?.beta)}  |  R² = ${fmt2(ols?.rSquared)}  |  α = ${fmt4(ols?.alpha)}`,
    `Hit rate: ${study?.recent ? `${Math.round(study.recent.hitRate * 100)}%` : "--"}  |  n = ${study?.recent?.sample ?? "--"} pairs`,
    `Granger causality: F = ${fmt2(granger?.fStat)}, p = ${fmt4(granger?.pValue)}${granger?.significant ? " (significant at 5%)" : ""}`,
    "",
    "SELECTED CASE",
    selected ? `${selected.title} (${selected.spxDate} S&P ${formatPercent(selected.spxReturn)} → ${selected.niftyDate} NIFTY ${formatPercent(selected.niftyReturn)})` : `Custom session: ${state.sessionDate}.`,
    "",
    "SIGNAL STRENGTH",
    bestLag
      ? `Best lag: ${bestLag.label} — ${Math.round(bestLag.hitRate * 100)}% same direction, ${formatCorrelation(bestLag.correlation)} correlation (n=${bestLag.sample})`
      : "Lag sweep loading.",
    study?.strong?.sample
      ? `Strong S&P sessions (|SPX| ≥ 1%): ${Math.round(study.strong.hitRate * 100)}% directional accuracy (n=${study.strong.sample})`
      : "Strong-move sample loading.",
    "",
    "LARGEST RECENT MISS",
    topMiss
      ? `${topMiss.niftyDate}: spread ${formatPercent(topMiss.spread)} | FX ${formatPercent(topMiss.fx)} | Brent ${formatPercent(topMiss.oil)} | tech spread ${formatPercent(topMiss.techSpread)}`
      : "Divergence board loading.",
    "",
    "FORWARD SCENARIOS",
    "AI breadth, dollar/rupee pressure, de-dollarization, oil shocks, India catch-up — framed as falsifiable if/then hypotheses.",
    "",
    "LIMITATIONS",
    "Associative model only. No causal claim. FX, oil, local flows, sector mix are candidate confounders, not controls.",
  ].join("\n");
}
```

- [ ] **Step 4: Verify explainer renders**

Navigate to Macro page. The "What is this page?" section should appear above the macro notebook intro with 4 cards explaining each section.

- [ ] **Step 5: Verify copy thesis**

On home page, click "Copy thesis" and paste into a text editor. Output should include MODEL section with β, R², Granger results.

- [ ] **Step 6: Commit**
```bash
git add app.js index.html styles.css && git commit -m "feat: macro view explainer + extended copy thesis with OLS/Granger"
```

---

## Task 7: Controls restructure

**Files:**
- Modify: `index.html` — remove `advanced-toggleable` from most controls
- Modify: `app.js` — rename button text, simplify toggle logic

- [ ] **Step 1: Remove `advanced-toggleable` from case, mode, date, align in `index.html`**

Find line 112 (case select group):
```html
        <div class="control-group case-wide advanced-control advanced-toggleable">
```
Replace with:
```html
        <div class="control-group case-wide advanced-control">
```

Find line 119 (mode select):
```html
        <div class="control-group advanced-control advanced-toggleable">
```
Replace with:
```html
        <div class="control-group advanced-control">
```

Find line 132 (date group — already `session-only`, just remove `advanced-toggleable`):
```html
        <div class="control-group session-only advanced-control advanced-toggleable" id="dateGroup">
```
Replace with:
```html
        <div class="control-group session-only advanced-control" id="dateGroup">
```

Find line 141 (align group — already `session-only`):
```html
        <div class="control-group session-only advanced-control advanced-toggleable" id="alignGroup">
```
Replace with:
```html
        <div class="control-group session-only advanced-control" id="alignGroup">
```

Line 167 (granularity) **stays unchanged** — it keeps `advanced-toggleable`.

- [ ] **Step 2: Rename the toggle button**

In `index.html`, find:
```html
          <button type="button" id="advancedToggle" class="advanced-toggle-btn" aria-expanded="false">+ More options</button>
```
Replace with:
```html
          <button type="button" id="advancedToggle" class="advanced-toggle-btn" aria-expanded="false">Interval &amp; granularity ↓</button>
```

- [ ] **Step 3: Update toggle button text in `app.js`**

Find in `app.js` (line ~3154):
```js
    advancedToggle.textContent = expanded ? "+ More options" : "− Less options";
```
Replace with:
```js
    advancedToggle.textContent = expanded ? "Interval & granularity ↓" : "Interval & granularity ↑";
```

- [ ] **Step 4: Verify controls**

Open `http://localhost:4173`. On the home page, the control bar should show: duration buttons, mode select, chart type, chart view — all visible by default. In session mode, date picker and time alignment should appear automatically. "Interval & granularity ↓" button should only toggle the granularity select.

- [ ] **Step 5: Commit**
```bash
git add app.js index.html && git commit -m "fix: expose key controls by default, tuck only granularity behind toggle"
```

---

## Task 8: Dark terminal theme refinement

**Files:**
- Modify: `styles.css` — CSS variable overrides and readability improvements

- [ ] **Step 1: Update root CSS variables**

Find the `:root` block in `styles.css` (near the top). Update or add these variables:
```css
:root {
  /* Terminal theme — research console */
  --bg: #111110;
  --bg-alt: #161614;
  --surface: #1c1b18;
  --surface-alt: #232220;
  --border: rgba(255, 255, 255, 0.09);
  --border-warm: rgba(255, 245, 220, 0.07);
  --text: #e8e6e0;
  --text-muted: #8a8780;
  --text-dim: #5a5855;
  --accent-teal: #00d6a3;
  --accent-coral: #ff654d;
  --accent-gold: #ffd166;
  --accent-blue: #8fb7ff;
  --accent-purple: #d07cff;
}
```

- [ ] **Step 2: Reduce neon glow on static text**

Find any `text-shadow` rules applied to non-interactive elements (headings, paragraph text, stat values in a resting state) and reduce them. Find rules like:
```css
text-shadow: 0 0 20px ...
```
For static text (not hover/focus/active states), replace strong glows with:
```css
text-shadow: none;
```
Keep glow effects on: `.market-pill:hover`, `.stage-link.active`, `.nav-brand`, button hover/focus states, `.ds-accent` values in the stat card.

- [ ] **Step 3: Warm up card glass**

Find glassmorphism card backgrounds. Where they use:
```css
background: rgba(255, 255, 255, 0.04);
```
Add warm tint:
```css
background: rgba(255, 245, 230, 0.04);
```
Apply to: `.insight-card`, `.terminal-window`, `.live-stat-card`, `.story-card-list` items.

- [ ] **Step 4: Bump body text colour**

Find the base `body` or main text colour rule. Ensure `color` uses `var(--text)` which is now `#e8e6e0` (near-white warm) instead of any dimmer value.

- [ ] **Step 5: Verify theme**

Open `http://localhost:4173`. The app should look darker and warmer — like a Bloomberg terminal rather than a cinema poster. Text should be clearly readable. DS stat card should have a clear teal left border. Glow effects should be present on interactive elements only.

- [ ] **Step 6: Commit**
```bash
git add styles.css && git commit -m "style: refine dark terminal theme — warmer surfaces, improved readability"
```

---

## Self-Review Checklist

After all tasks complete:

- [ ] Spec section 1 (Story data rewrite) → Task 4 covers all 10 stories ✓
- [ ] Spec section 2 (DS Stat Card) → Task 3 covers HTML slot, render function, CSS, and OLS/Granger dependency ✓
- [ ] Spec section 3 (Analysis panel step labels) → Task 5 covers relabeling and settled card ✓
- [ ] Spec section 4 (Animation bug) → Task 2 covers both running guard and DOM rebuild guard ✓
- [ ] Spec section 5 (Macro view) → Task 6 covers explainer, tour, and copy thesis ✓
- [ ] Spec section 6 (Controls) → Task 7 covers all control visibility changes ✓
- [ ] Spec section 7 (Theme) → Task 8 covers all palette and readability changes ✓
- [ ] OLS/Granger wired into study pipeline (not a second stats path) → Task 1 ✓
- [ ] Story result fields are conceptual, not hardcoded numbers → Task 4 — all `result:` fields say "Live from..." ✓
- [ ] `wilsonIntervalPublic` defined before `renderDsStatCard` uses it → Task 3 Step 4 adds it at line ~1347, Task 3 Step 3 adds `renderDsStatCard` at line 1709 ✓
- [ ] DS case card only shown in settled state (not during animation) → `storyTakeawayMarkup` is only rendered in `renderStoryTheatre`'s settled path via `els.storyTakeaway.innerHTML` ✓
