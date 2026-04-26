# DS Transformation Design — NIFTY/S&P 500 Financial Dashboard

**Date:** 2026-04-26  
**Status:** Approved (v2 — post-review)  
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
| `app.js` | Story data rewrite, analysis panel, animation bug fix, macro view render, controls logic, study pipeline extension |
| `styles.css` | Theme refinement, DS stat card styles, story step relabeling |
| `index.html` | Controls restructure, macro view explainer block |

**Note on modules:** No new files are created. `modules/stats.js` already exists and is already partially used (e.g. `olsRegression()` appears in the study compute path). The implementation extends that existing import pattern — `olsRegression()` and `grangerTest()` get wired into the study pipeline output. No second independent stats flow is introduced.

---

## Section 1: Story Data Rewrite

### Structure change

Each `SHOWCASE_STORIES` entry gains DS case-study fields. **All numbers are conceptual descriptions only — no hardcoded statistical results.** Actual computed values (β, R², hit rate, CI) come from `state.study` and are rendered dynamically in the settled DS card.

```js
{
  id: "spx-follow-through",
  title: "S&P Follow-Through as a Directional Feature",
  hook: "...",
  level: "Introductory case",  // renamed from "Beginner"
  metric: "...",

  // DS case-study metadata (conceptual, not hardcoded results)
  problem:    "Can prior S&P session direction predict next NIFTY session direction?",
  data:       "Daily session pairs, close-to-close returns, 2023–2025",
  feature:    "X = S&P daily return, lagged 1 session (no look-ahead bias)",
  model:      "OLS: NIFTY_t = α + β·SPX_{t-1} evaluated by directional hit rate",
  result:     "Live from state.study — β, R², hit rate with Wilson CI, n pairs",
  limitation: "Associative only. FX, oil, local flows, sector mix uncontrolled.",

  // phases map to: Feature → Model → Result (3 animated steps)
  phases: [
    ["Feature", "S&P daily return is the input signal — lagged one session, no look-ahead."],
    ["Model", "OLS + directional hit rate: does the feature predict NIFTY direction?"],
    ["Result & residual", "Where the model was right, and where the spread (error term) opened."],
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

Each story maps its `phases` to Feature / Model / Result. The settled DS card renders live values from `state.study` — not story metadata. Story metadata is conceptual framing only.

---

## Section 2: DS Stat Summary Card

Rendered at the top of the right-side insight panel on the Analysis (detail) page. All values live from `state.study`. Degrades gracefully ("--") while loading.

**Dependency:** The study pipeline must be extended to run `olsRegression()` and `grangerTest()` (both already exported from `modules/stats.js`) and store results on `state.study`:
```js
state.study.ols = { alpha, beta, rSquared }   // from olsRegression()
state.study.granger = { fStat, pValue, significant }  // from grangerTest()
```
This reuses the existing `modules/stats.js` import pattern already in place — no second stats flow.

### Visual layout — progressive disclosure

The settled DS card shows **3 primary fields first**, compact:
```
Problem   Can prior S&P direction predict next NIFTY direction?
Model     OLS (1-lag) | β = 0.54  R² = 0.31  n = 252
Result    Hit rate 68% [95% CI: 62–74%]  Granger p = 0.04 ✓
```

**Secondary fields** (Data, Feature, Limitation) appear in a second row — either always visible in a subdued style, or behind a "Show methodology ↓" toggle. Decision deferred to Codex implementation; primary 3 fields are non-negotiable.

Rendered via a new `renderDsStatCard()` function called from `renderInsights()`.

---

## Section 3: Analysis Panel Story Steps Relabeled

The 3 animated steps in the story theatre rename to DS vocabulary:

- Step 1: **Feature** — "S&P return is the input. Think of it as X in your regression."
- Step 2: **Model response** — "NIFTY return is the output (Y). Did direction match?"
- Step 3: **Residual / spread** — "The spread is the model error. Large spread = something else drove India."

Plain-English companion text stays for non-finance viewers. The settled DS card appears below the visual after the sequence finishes — it does not display during animation (avoids wall-of-text during the story).

---

## Section 4: Animation Bug Fix

### Root cause

Two async fetches run in sequence: main data fetch → study fetch. Each resolves with `renderInsights()` → `renderStoryTheatre()`.

First call: `shouldAnimate = true` → starts `runStorySequence()`, sets `lastStoryAnimationKey`, clears `forceStoryAnimation`.

Second call (study arrives): `shouldAnimate = false` (key already set) → hits `else { finishStorySequence() }` → calls `stopStorySequence()` → kills the running animation and jumps to final state.

### Fix — sequence running guard

Add `state.storySequenceRunning = false` to state object.

- `runStorySequence()` → set `state.storySequenceRunning = true` at start
- `finishStorySequence()` → set `state.storySequenceRunning = false`
- `renderStoryTheatre()` else-branch → only call `finishStorySequence()` if `!state.storySequenceRunning`

```js
// renderStoryTheatre else-branch:
} else if (!state.storySequenceRunning) {
  setStoryVisualMode("settled");
  finishStorySequence(phaseItems);
}
```

### Additional guard — avoid DOM rebuilds during active sequence

Any `renderStoryTheatre()` call while a sequence is running must not rebuild the `storySteps` DOM, as this causes visual resets even without the full skip. Guard: if `state.storySequenceRunning`, skip the `els.storySteps.innerHTML = ...` assignment and the `updateStoryPaths()` call. Only update text fields (title, summary, narration) that don't interfere with the running animation.

---

## Section 5: Macro View Explainer

### Page banner (top of macro sections)

Add a full-width explainer block in `index.html` at the top of the macro page content:

```
What is this page?
The research methodology layer. Four questions, each with its own section:

  Lag Analysis        How strong is the signal, and at which horizon?
  Divergence Board    Where does the model break, and what clues explain it?
  Risk Cockpit        Was the return efficient? Sharpe, drawdown, vol.
  Forward Scenarios   What conditions would change the view?
```

### Narrated tour integration

Tour steps reference Macro sections by name. "Start narrated tour" navigates to macro and walks through each section in sequence, explaining what each one is before showing it.

### Copy thesis integration

`buildThesisSummary()` extended to include: best lag result, top divergence case, Granger test result. Thesis output becomes a complete quant summary.

---

## Section 6: Controls Restructure

### Default visible (always shown)
- Duration (range buttons)
- Mode (Session / Long range)
- Date picker + prev/next *(shown only in Session mode — already contextual)*
- Case study selector
- Chart view
- Chart type

### Contextual (shown only in Session mode)
- Time alignment *(already gated — keep as-is)*

### Hidden behind "Interval & granularity ↓" (renamed from "+ More options")
- Granularity select only

**Rationale:** This exposes the controls that matter for basic exploration without re-cluttering the hero. Time alignment stays contextual since it only makes sense in session mode. Granularity is the only control that advanced users need and casual viewers can ignore.

---

## Section 7: Theme

### Decision: stay dark, refine the terminal

The current product is cinematic and premium. Switching to parchment/light would be a brand repositioning, not a polish pass — and would conflict with the existing visual identity. Instead: refine the dark palette toward a **research terminal** aesthetic (think Bloomberg/quant console), not a cinema poster.

### Changes
- Increase readability: bump body text from current muted to near-white `#e8e6e0`
- Cards: slightly warmer dark surface `#1c1b18` to distinguish from page background `#121210`
- Accent teal `#00d6a3` and coral `#ff654d` stay — they're already strong brand colors
- Reduce glow/neon effects on static text (keep on interactive elements only)
- DS stat card gets a subtle `border-left: 3px solid var(--accent-teal)` to signal "data output"
- Glassmorphism on cards gets a slight warm tint (`rgba(255,245,230,0.04)`) instead of pure cool glass

This reads as "serious quant tool" without the full identity change a light theme would require.

---

## Out of Scope

- No new data sources
- No new statistical methods beyond wiring existing `olsRegression()` and `grangerTest()` into the study pipeline
- No routing/URL changes
- No mobile-specific layout changes
- No backend changes
- No light theme (deliberate decision — brand stays dark terminal)

---

## Success Criteria

1. A quant screener opening the Analysis page sees β, R², hit rate with CI, Granger p-value — without hunting
2. Each story card shows a DS case study structure; stats in the settled card are live from `state.study`, not hardcoded
3. Animation plays all 3 phases without skipping when a story is clicked from the gallery
4. Macro view has a clear "What is this?" explainer that a non-finance viewer can parse in 10 seconds
5. Date picker and case study selector are visible by default; only granularity is tucked away
6. No visual resets or DOM rebuilds interrupt a running story sequence
7. OLS and Granger results flow through the existing `modules/stats.js` import — no second stats path introduced
