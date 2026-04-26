# DS Transformation Design — NIFTY/S&P 500 Financial Dashboard

**Date:** 2026-04-26  
**Status:** Approved  
**Approach:** Approach 2 — Content + DS panel structure

---

## Goal

Reshape the NIFTY/S&P 500 overlay app so a quant recruiter or data science screener sees rigorous DS thinking — not just a pretty chart. Every story becomes a DS case study (Problem → Data → Feature → Model → Result → Limitations). The stats machinery already exists (OLS, Granger, rolling Pearson, Wilson CI in `modules/stats.js`); the work is surfacing it clearly.

---

## Implementation Routing

- **Orchestration / quality judgment / prompt composition** → Sonnet (Claude)
- **All file reads, writes, code edits** → Codex via delegatecodex v2 bridge

---

## Architecture

No new files. All changes land in three existing files:

| File | Changes |
|------|---------|
| `app.js` | Story data rewrite, analysis panel, animation bug fix, macro view render, controls logic |
| `styles.css` | Light theme (parchment palette), DS stat card styles, story step relabeling |
| `index.html` | Controls restructure (expose date/mode by default), macro view explainer block |

Data flow is unchanged — no new fetches, no new modules. Stats are already computed in `state.study`; we surface them differently.

---

## Section 1: Story Data Rewrite

### Structure change

Each `SHOWCASE_STORIES` entry gains DS case-study fields:

```js
{
  id: "spx-follow-through",
  title: "S&P Follow-Through as a Directional Feature",
  hook: "...",
  level: "Introductory case",           // renamed from "Beginner"
  metric: "...",

  // NEW DS fields
  problem:    "Can prior S&P session direction predict next NIFTY session direction?",
  data:       "252 daily session pairs, close-to-close returns, 2023–2025",
  feature:    "X = S&P daily return (lagged 1 session, no look-ahead)",
  model:      "OLS: NIFTY_t = α + β·SPX_{t-1} | directional hit rate",
  result:     "β≈0.54, R²≈0.31, hit rate ~68% [95% CI via Wilson], n≈252",
  limitation: "Associative only. FX, oil, local flows, sector mix uncontrolled.",

  // phases map to: Feature → Model → Result (3 animated steps)
  phases: [
    ["Feature", "S&P daily return is the input signal — lagged one session so there is no look-ahead bias."],
    ["Model", "OLS regression + directional hit rate: does S&P direction predict NIFTY direction?"],
    ["Result & residual", "Where the model was right, and where the spread (error term) opened up."],
  ],
}
```

### Level vocabulary rename

| Old | New |
|-----|-----|
| Beginner | Introductory case |
| Core quant idea | Feature engineering |
| Macro clue | Confounding variable |
| Structural story | Regime analysis |
| Macro shock | Exogenous shock |
| Scenario thinking | Hypothesis / falsifiable scenario |
| Chart-reading layer | Technical overlay |
| Allocator lens | Portfolio horizon |

### All 10 stories get DS fields

Each story maps its `phases` to Feature / Model / Result. The `storyTakeawayMarkup()` renders the full 6-field DS card (problem → limitation) once the animation settles.

---

## Section 2: DS Stat Summary Card

Rendered at top of the right-side insight panel on the Analysis (detail) page. Lives above the existing insight cards.

```
┌────────────────────────────────────────────────┐
│  Model: OLS (1-session lag)                    │
│  β = 0.54   R² = 0.31   α = 0.001             │
│  Hit rate: 68%  [95% CI: 62–74%]   n = 252    │
│  Granger F = 4.2   p = 0.04  ✓ significant    │
└────────────────────────────────────────────────┘
```

All values are live from `state.study`. Renders via a new `renderDsStatCard()` function called from `renderInsights()`. Degrades gracefully (shows "--") while study is loading.

**Dependency:** The study computation pipeline (in `data.js` or `app.js`) must be extended to run `olsRegression()` and `grangerTest()` from `modules/stats.js` and store results on `state.study` as `{ ols: {alpha, beta, rSquared}, granger: {fStat, pValue, significant} }`. These functions already exist; they just aren't wired into the compute path yet.

---

## Section 3: Analysis Panel Story Steps Relabeled

The 3 animated steps in the story theatre rename from generic Phase labels to DS vocabulary:

- Step 1: **Feature** — "S&P return is the input. Think of it as X in your regression."
- Step 2: **Model response** — "NIFTY return is the output (Y). Did direction match?"
- Step 3: **Residual / spread** — "The spread is the model error. Large spread = something else was driving India."

Plain-English companion text stays beneath each step for non-finance viewers.

---

## Section 4: Animation Bug Fix

### Root cause

Two async fetches run in sequence: main data fetch → study fetch. Each resolves with a `renderInsights()` → `renderStoryTheatre()` call.

First call: `shouldAnimate = true` → starts `runStorySequence()`, sets `lastStoryAnimationKey`, clears `forceStoryAnimation`.

Second call (study arrives): `shouldAnimate = false` (key already set) → hits `else { finishStorySequence() }` → calls `stopStorySequence()` → kills the running animation and jumps to final state.

### Fix

Add `state.storySequenceRunning = false` to state object.

In `runStorySequence()`: set `state.storySequenceRunning = true` at start.  
In `finishStorySequence()`: set `state.storySequenceRunning = false`.  
In `renderStoryTheatre()` else-branch: only call `finishStorySequence()` if `!state.storySequenceRunning`.

```js
// renderStoryTheatre else-branch change:
} else if (!state.storySequenceRunning) {
  setStoryVisualMode("settled");
  finishStorySequence(phaseItems);
}
```

No other logic changes needed.

---

## Section 5: Macro View Explainer

### Page banner (top of macro page sections)

Add a full-width explainer block to `index.html` inside the macro page sections:

```
┌─────────────────────────────────────────────────────────────┐
│  What is this page?                                          │
│  The research methodology layer. Four questions answered:    │
│                                                              │
│  [Lag Analysis]      How strong is the signal?              │
│  [Divergence Board]  Where does the model break?            │
│  [Risk Cockpit]      Was the return worth the risk?         │
│  [Forward Scenarios] What would change our view?            │
└─────────────────────────────────────────────────────────────┘
```

### Narrated tour integration

Tour steps reference Macro sections by name. The tour CTA on home page ("Start narrated tour") navigates to macro and walks through each section in sequence.

### Copy thesis integration

`buildThesisSummary()` extended to include: best lag result, top divergence, Granger test result. Makes the copied thesis a complete quant summary.

---

## Section 6: Controls Restructure

### Default visible (always shown)
- Duration (range buttons)
- Chart type
- Chart view
- Mode (Session / Long range)
- Date picker + prev/next
- Time alignment
- Case study selector

### Hidden behind "Interval & granularity ↓" (renamed from "+ More options")
- Granularity select only

### Rationale
Date and case study are primary controls — hiding them confused users. Granularity is the only control most users never need.

---

## Section 7: Light Theme

### Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#fafaf7` | Page background (parchment) |
| `--surface` | `#ffffff` | Cards, panels |
| `--surface-alt` | `#f4f3ef` | Subtle alt surfaces |
| `--border` | `#e8e6df` | Card borders |
| `--text` | `#1a1a1a` | Primary text |
| `--text-muted` | `#6b6860` | Secondary text |
| `--accent-teal` | `#00a882` | NIFTY (darkened for light bg) |
| `--accent-coral` | `#e0533a` | S&P (darkened for light bg) |
| `--accent-gold` | `#c49a00` | Spreads / highlights |

Feels like a research note / quant paper. High contrast, readable, professional.

Nav and welcome overlay adapt to the light palette. Chart backgrounds stay white.

---

## Out of Scope

- No new data sources
- No new statistical methods (stats.js unchanged)
- No routing/URL changes
- No mobile-specific layout changes
- No backend changes

---

## Success Criteria

1. A quant screener opening the Analysis page sees β, R², hit rate with CI, Granger p-value — without hunting
2. Each story card shows a DS case study structure (problem/data/feature/model/result/limitation)
3. Animation plays all 3 phases without skipping when a story is clicked
4. Macro view has a clear "What is this?" explainer that a non-finance viewer can parse in 10 seconds
5. Date picker and mode are visible by default — no "More options" needed for basic use
6. Light theme renders cleanly in Chrome/Safari
