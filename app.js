const RANGE_CONFIG = {
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

function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SYMBOLS = {
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

const SESSION_BASE = Date.UTC(2000, 0, 3, 0, 0, 0) / 1000;

const CASE_STUDIES = [
  {
    id: "risk-on-follow",
    title: "Risk-on follow-through",
    label: "2026-03-31 S&P surge -> NIFTY bid",
    spxDate: "2026-03-31",
    niftyDate: "2026-04-01",
    spxReturn: 2.91,
    niftyReturn: 1.56,
    stage: "Recent replay",
    thesis:
      "A large positive US session was followed by a strong NIFTY session. This is a clean example of observed same-direction movement across the India-US sequence.",
    tags: ["follow-through", "risk-on", "large S&P move"],
    hook: "When US risk appetite was loud, India opened with a bid.",
    mechanics: ["Prior S&P session was strongly positive", "NIFTY followed next session", "Spread shows NIFTY participated but did not fully match S&P"],
  },
  {
    id: "risk-off-follow",
    title: "Risk-off transmission",
    label: "2026-03-20 S&P down -> NIFTY down",
    spxDate: "2026-03-20",
    niftyDate: "2026-03-23",
    spxReturn: -1.51,
    niftyReturn: -2.6,
    stage: "Recent replay",
    thesis:
      "A negative US session was followed by a sharper NIFTY drawdown after the weekend gap. The case is useful for discussing cross-market risk association without treating it as a forecast.",
    tags: ["follow-through", "risk-off", "weekend gap"],
    hook: "A risk-off US close rolled into India after the weekend.",
    mechanics: ["Negative S&P session", "Next NIFTY session sold off harder", "Useful for talking about global risk transmission and gap risk"],
  },
  {
    id: "model-miss",
    title: "Model miss",
    label: "2026-04-08 S&P up, next NIFTY down",
    spxDate: "2026-04-08",
    niftyDate: "2026-04-09",
    spxReturn: 2.51,
    niftyReturn: -0.93,
    stage: "Recent replay",
    thesis:
      "The previous US session was strongly positive, but NIFTY declined next. This is the honest counterexample: a simple prior-US-session rule misses meaningful local variation.",
    tags: ["divergence", "model miss", "local driver"],
    hook: "The simple model broke: US up, India down.",
    mechanics: ["S&P was positive", "NIFTY moved the other way", "This invites local-flow, FX, oil, and policy context"],
  },
  {
    id: "nifty-outperformance",
    title: "NIFTY outperformance",
    label: "2026-03-23 S&P up, NIFTY stronger",
    spxDate: "2026-03-23",
    niftyDate: "2026-03-24",
    spxReturn: 1.15,
    niftyReturn: 1.78,
    stage: "Recent replay",
    thesis:
      "Both markets moved up, but NIFTY outperformed the prior US move. This case is useful for showing spread and relative-strength diagnostics.",
    tags: ["follow-through", "relative strength", "spread"],
    hook: "Same direction, but India carried more relative strength.",
    mechanics: ["Both sessions positive", "NIFTY move exceeded prior S&P move", "Spread lens highlights relative outperformance"],
  },
];

const SHOWCASE_STORIES = [
  {
    id: 'spx-follow-through',
    caseId: 'risk-on-follow',
    title: 'S&P Follow-Through as a Directional Feature',
    hook: 'Treat the prior S&P session as X. How often does it predict NIFTY direction?',
    level: 'Introductory case',
    metric: 'Directional hit rate (OLS + Wilson CI)',
    detail: 'The cleanest version of the thesis: prior S&P return as a single feature in a lag-1 OLS model. Hit rate and R² tell us how much predictive signal survives to the India open.',
    problem: 'Can the sign of the prior S&P session predict the sign of the next NIFTY session?',
    data: 'Daily session pairs, close-to-close returns, 2-year window',
    feature: 'X = S&P daily return, lagged 1 session — no look-ahead bias',
    model: 'OLS: NIFTY_t = α + β·SPX_{t-1} | evaluated by directional hit rate',
    result: 'Live from model — β, R², hit rate with 95% Wilson CI (see stat card)',
    limitation: 'Single-feature model. FX regime, oil, sector composition, local flows uncontrolled.',
    phases: [
      ['Feature', 'S&P daily return is the input signal — lagged one session so there is no look-ahead bias.'],
      ['Model', 'OLS regression maps the S&P feature to NIFTY. Directional hit rate measures how often sign matches.'],
      ['Result & residual', 'Where sign matched (model correct) and where the spread opened (model error term).'],
    ],
  },
  {
    id: 'divergence-miss',
    caseId: 'model-miss',
    title: 'When the Single-Feature Model Breaks',
    hook: 'Model misses are more informative than agreements — they expose omitted variables.',
    level: 'Feature engineering',
    metric: 'NIFTY minus S&P spread (residual size)',
    detail: 'A divergence is a large residual. When S&P is positive but NIFTY is negative, the model is wrong. That is the prompt for investigating FX, oil, flows, and sector mix as additional features.',
    problem: 'Why does the lag-1 S&P feature fail on certain sessions, and what omitted variables explain the miss?',
    data: 'Daily session pairs with FX, Brent, and tech-spread covariates as candidate features',
    feature: 'X₁ = S&P return (lagged), X₂ = USD/INR move (candidate), X₃ = Brent move (candidate)',
    model: 'Residual analysis: large |NIFTY − fitted| → investigate candidate confounders',
    result: 'Live — largest spread in selected window shown in Divergence Radar panel',
    limitation: 'Exploratory, not causal. Confounder checks are correlation screens, not structural models.',
    phases: [
      ['Feature', 'S&P is positive — the single feature says NIFTY should follow. It does not.'],
      ['Model', 'The spread (residual) opens. The model miss is the data point of interest.'],
      ['Result & residual', 'Size of the miss prompts feature investigation: FX, oil, and tech breadth as candidate confounders.'],
    ],
  },
  {
    id: 'inr-depreciation',
    caseId: 'model-miss',
    title: 'INR Depreciation as a Confounder',
    hook: 'A weakening rupee changes how dollar-denominated investors read India returns.',
    level: 'Confounding variable',
    metric: 'USD/INR move vs NIFTY-minus-S&P spread',
    detail: 'If USD/INR rises (rupee weakens), foreign investors lose on FX translation even if local prices are flat. This creates a second explanatory variable that can flip the observed spread.',
    problem: 'Does USD/INR move add explanatory power to NIFTY spread beyond the S&P feature alone?',
    data: 'Daily pairs with USD/INR return aligned to the NIFTY response date',
    feature: 'X₂ = USD/INR daily return (rupee depreciation = positive X₂)',
    model: 'Correlation of X₂ with spread residual | FX panel shows directional association',
    result: 'Live — FX vs spread correlation from state.study.fx (see FX Stress window)',
    limitation: 'Correlation only. FX can be endogenous — market stress may cause both INR weakness and equity selloff.',
    phases: [
      ['Feature', 'USD/INR move on the NIFTY response date is a candidate second feature.'],
      ['Model', 'Check whether rupee depreciation correlates with the S&P-NIFTY spread residual.'],
      ['Result & residual', 'FX correlation tells whether adding this feature would improve the model — not whether it is causal.'],
    ],
  },
  {
    id: 'india-catch-up',
    caseId: 'nifty-outperformance',
    title: 'India Catch-Up as a Regime Shift',
    hook: 'If domestic momentum dominates global beta, the residual should be persistently positive.',
    level: 'Regime analysis',
    metric: 'Weekly and monthly return vs volatility (risk-adjusted spread)',
    detail: 'Structural outperformance should show up at weekly and monthly horizons, not just on one noisy day. A regime shift in intercept α is falsifiable: if India is de-coupling, rolling α should trend upward.',
    problem: 'Is NIFTY outperformance a persistent structural shift or daily noise?',
    data: 'Weekly and monthly session pairs, 2-year window',
    feature: 'Horizon selection: daily vs weekly vs monthly aggregation as a hyperparameter',
    model: 'Rolling OLS with α monitored over time | Sharpe and max-drawdown as risk-adjusted filters',
    result: 'Live — weekly/monthly correlation and return/vol metrics in Risk Cockpit',
    limitation: 'Short sample (2Y). Survivorship and selection bias not controlled.',
    phases: [
      ['Feature', 'Aggregating to weekly or monthly reduces noise and exposes the persistent relationship better.'],
      ['Model', 'OLS intercept α — if India is structurally outperforming, α should be positive and stable over time.'],
      ['Result & residual', 'Risk-adjusted metrics (Sharpe, drawdown) tell whether the outperformance was efficient or just volatility.'],
    ],
  },
  {
    id: 'ai-boom',
    caseId: 'risk-on-follow',
    title: 'AI Concentration Makes S&P a Noisy Feature',
    hook: 'When Nasdaq 100 beats S&P by a wide margin, the S&P return is largely tech-sector signal.',
    level: 'Feature engineering',
    metric: 'Nasdaq 100 minus S&P 500 spread as feature quality proxy',
    detail: 'Feature quality degrades when the feature conflates multiple regimes. If S&P gains are driven by 5 mega-cap AI names, the feature is measuring narrow US tech leadership — not broad global risk appetite.',
    problem: 'Does tech concentration reduce the predictive validity of the S&P feature for NIFTY?',
    data: 'Daily pairs with Nasdaq 100 return as concentration proxy',
    feature: 'Feature quality proxy: NDX-minus-SPX spread (high = mega-cap heavy day)',
    model: 'Stratified hit rate: compare model accuracy on high-concentration vs low-concentration days',
    result: 'Live — tech spread for selected case shown in US Factor Lens window',
    limitation: 'NDX-SPX is a rough breadth proxy. Sector-level decomposition would be more precise.',
    phases: [
      ['Feature', 'On days where Nasdaq beats S&P widely, the S&P return is dominated by a few AI names.'],
      ['Model', 'Stratify sessions by NDX-SPX spread. Does hit rate fall on high-concentration days?'],
      ['Result & residual', 'Tech breadth is a feature-quality signal — it tells us when to trust the main feature less.'],
    ],
  },
  {
    id: 'tech-boom',
    caseId: 'risk-on-follow',
    title: 'Sector Composition Mismatch',
    hook: 'S&P sector weights and NIFTY sector weights differ — a tech-heavy US rally may not translate.',
    level: 'Feature engineering',
    metric: 'Tech spread (NDX-SPX) as sector mismatch signal',
    detail: 'When technology and communication services dominate the move, the feature carries sector-specific signal that does not map to India sector composition.',
    problem: 'Does sector composition of the S&P move affect how well it predicts NIFTY?',
    data: 'Daily pairs with Nasdaq 100 as tech-weight proxy',
    feature: 'X = S&P return, conditioned on whether the move was broad or tech-concentrated',
    model: 'Conditional hit rate: split on |NDX-SPX| threshold, compare directional accuracy in each regime',
    result: 'Live — tech spread shown in US Factor Lens window',
    limitation: 'NDX is a proxy. True sector decomposition requires factor model data not used here.',
    phases: [
      ['Feature', 'Same S&P return feature, but now we flag whether the move was broad-market or sector-concentrated.'],
      ['Model', 'Conditional accuracy: does hit rate differ between broad-rally days and tech-concentration days?'],
      ['Result & residual', 'Sector mismatch is a feature interaction effect — the S&P feature predictive value depends on what drove it.'],
    ],
  },
  {
    id: 'oil-shock',
    caseId: 'risk-off-follow',
    title: 'Brent Crude as an Exogenous Confounder',
    hook: 'India imports ~85% of its crude. An oil shock is a cost-push inflation event that affects India differently.',
    level: 'Exogenous shock',
    metric: 'Brent return vs NIFTY-minus-S&P spread',
    detail: 'An oil spike can widen the spread even when the S&P signal is neutral or positive. Brent is a candidate feature for improving model performance on sessions where current-account and inflation channels dominate global beta.',
    problem: 'Does Brent crude return add explanatory power for the NIFTY spread residual on shock sessions?',
    data: 'Daily pairs with Brent crude return aligned to NIFTY response date',
    feature: 'X₃ = Brent daily return (positive = oil spike = India cost-push pressure)',
    model: 'Correlation of Brent return with spread residual | shown in oil shock panel',
    result: 'Live — Brent vs spread correlation from state.study.oil',
    limitation: 'Crude affects India through current account and inflation lag — daily correlation understates true transmission.',
    phases: [
      ['Feature', 'Brent daily return on the NIFTY response date — a candidate additional feature.'],
      ['Model', 'Does Brent return correlate with the spread residual? If yes, the model is missing an energy variable.'],
      ['Result & residual', 'Oil correlation is a feature importance signal — it tells us whether energy deserves its own term.'],
    ],
  },
  {
    id: 'dedollarization',
    caseId: 'model-miss',
    title: 'De-Dollarization as a Regime Hypothesis',
    hook: 'This is a falsifiable scenario, not a chart pattern. A FX regime shift should show up in persistent USD/INR behaviour.',
    level: 'Hypothesis / falsifiable scenario',
    metric: 'Monthly FX regime (rolling USD/INR correlation)',
    detail: 'A regime shift in the dollar-India relationship would manifest as structural change in the FX correlation coefficient over time. Rolling OLS with USD/INR as a covariate is the testable version of the de-dollarization narrative.',
    problem: 'Is there evidence of a structural shift in the USD/INR-to-NIFTY-spread relationship indicating a currency regime change?',
    data: 'Monthly returns with rolling 12-month USD/INR correlation tracked over time',
    feature: 'X = USD/INR return, tested across rolling 12-month windows for structural break',
    model: 'Rolling correlation of FX feature with spread residual | stationarity as falsifier',
    result: 'Live — FX correlation from state.study.fx; rolling behaviour visible in long-range chart',
    limitation: '2-year sample is too short to detect a true regime shift. This is a monitoring hypothesis, not a conclusion.',
    phases: [
      ['Feature', 'USD/INR return as a rolling-window feature — watching for structural change over time.'],
      ['Model', 'If the de-dollarization regime is real, rolling FX correlation with the spread should trend upward.'],
      ['Result & residual', 'Absence of a trend is the falsifier — the hypothesis remains unconfirmed until the rolling coefficient moves.'],
    ],
  },
  {
    id: 'support-resistance',
    caseId: 'nifty-outperformance',
    title: 'Technical Levels as a Discrete Feature',
    hook: 'Prior highs and lows can be modelled as threshold features — price reactions near them are non-linear.',
    level: 'Technical overlay',
    metric: 'Normalized spread at prior level zones',
    detail: 'Support and resistance are places where prior market participants reacted. In a feature engineering context, proximity to a prior level is a discrete indicator that can be interacted with the main S&P feature.',
    problem: 'Do spread dynamics change when normalised prices approach prior high or low zones?',
    data: 'Session pairs with normalised price levels and prior-session high/low markers',
    feature: 'Indicator: IS_NEAR_LEVEL (binary, proximity threshold)',
    model: 'Interaction term: β₁·SPX + β₂·(SPX × IS_NEAR_LEVEL) — does level proximity alter S&P transmission?',
    result: 'Qualitative — observe whether spread stalls or reverses at prior normalised levels',
    limitation: 'Level selection is subjective. Confirmation bias risk: levels are easy to find in hindsight.',
    phases: [
      ['Feature', 'Mark where a prior normalised move stalled — this becomes a discrete indicator feature.'],
      ['Model', 'Interaction term: does the S&P transmission coefficient change when price is near a prior level?'],
      ['Result & residual', 'If the spread stalls at a known level, that is evidence the feature adds information — otherwise it is noise.'],
    ],
  },
  {
    id: 'weekly-monthly',
    caseId: 'risk-on-follow',
    title: 'Horizon as a Hyperparameter',
    hook: 'Aggregation horizon is a modelling choice — daily, weekly, monthly are different feature spaces.',
    level: 'Portfolio horizon',
    metric: 'Weekly and monthly correlation vs daily correlation',
    detail: 'A portfolio manager cares about weekly or monthly predictability, not one-session noise. Treating aggregation horizon as a hyperparameter — and comparing model performance across horizons — is a standard DS validation technique.',
    problem: 'At which aggregation horizon does the S&P feature have the strongest predictive signal for NIFTY?',
    data: 'Daily, weekly, and monthly session pairs over 2-year window',
    feature: 'Horizon-aggregated returns: same X (S&P lagged) and Y (NIFTY), different time bucket',
    model: 'OLS + hit rate evaluated at each horizon | weekly and monthly correlation as evaluation metrics',
    result: 'Live — weekly and monthly correlations from state.study.weekly and state.study.monthly',
    limitation: 'Longer horizons have fewer observations — estimate variance is higher and CI is wider.',
    phases: [
      ['Feature', 'Aggregate returns from daily to weekly or monthly — a feature engineering choice that affects signal-to-noise ratio.'],
      ['Model', 'Same OLS model, different time bucket. Which horizon maximises hit rate and correlation?'],
      ['Result & residual', 'The best horizon is a hyperparameter finding — it tells a portfolio manager which frequency the signal is most reliable at.'],
    ],
  },
];

const state = {
  mode: "range",
  range: "1Y",
  sessionDate: defaultSessionDate(),
  caseId: "custom",
  storyId: "spx-follow-through",
  alignMode: "session",
  chartType: "line",
  chartView: "overlay",
  interval: "auto",
  rebaseVisible: false,
  ma20: false,
  ma50: false,
  data: {},
  study: null,
  studyError: null,
  charts: [],
  activeSeries: [],
  primarySeries: {},
  visibleFrom: null,
  replayIndex: 0,
  replayTimer: null,
  replayPlaying: false,
  dataRequestId: 0,
  studyRequestId: 0,
  isLoading: false,
  tourTimer: null,
  tourReplayTimeout: null,
  storyTimeouts: [],
  storyTypeTimer: null,
  storySequenceToken: 0,
  storySequenceRunning: false,
  pageEntranceTimer: null,
  animation: { booted: false, rafs: [] },
};

const STORY_VISUALS = {
  "spx-follow-through": {
    image: "./assets/market-desk.jpg",
    accent: "#00d6a3",
    tone: "rgba(0, 214, 163, 0.24)",
    eyebrow: "Lead-lag",
    focus: "center 38%",
  },
  "divergence-miss": {
    image: "./assets/analyst-office.jpg",
    accent: "#8fb7ff",
    tone: "rgba(143, 183, 255, 0.22)",
    eyebrow: "Divergence",
    focus: "center 44%",
  },
  "inr-depreciation": {
    image: "./assets/city-macro.jpg",
    accent: "#ffd166",
    tone: "rgba(255, 209, 102, 0.2)",
    eyebrow: "FX lens",
    focus: "center 36%",
  },
  "india-catch-up": {
    image: "./assets/chart-tablet.jpg",
    accent: "#00d6a3",
    tone: "rgba(0, 214, 163, 0.2)",
    eyebrow: "Structural",
    focus: "center 45%",
  },
  "ai-boom": {
    image: "./assets/chart-tablet.jpg",
    accent: "#d07cff",
    tone: "rgba(208, 124, 255, 0.22)",
    eyebrow: "Mega-cap",
    focus: "center 52%",
  },
  "tech-boom": {
    image: "./assets/market-desk.jpg",
    accent: "#8fb7ff",
    tone: "rgba(143, 183, 255, 0.2)",
    eyebrow: "Sector mix",
    focus: "center 22%",
  },
  "oil-shock": {
    image: "./assets/city-macro.jpg",
    accent: "#ff654d",
    tone: "rgba(255, 101, 77, 0.2)",
    eyebrow: "Energy",
    focus: "center 30%",
  },
  dedollarization: {
    image: "./assets/analyst-office.jpg",
    accent: "#ffd166",
    tone: "rgba(255, 209, 102, 0.18)",
    eyebrow: "Scenario",
    focus: "center 60%",
  },
  "support-resistance": {
    image: "./assets/market-desk.jpg",
    accent: "#8fb7ff",
    tone: "rgba(143, 183, 255, 0.22)",
    eyebrow: "Chart read",
    focus: "center 18%",
  },
  "weekly-monthly": {
    image: "./assets/chart-tablet.jpg",
    accent: "#00d6a3",
    tone: "rgba(0, 214, 163, 0.18)",
    eyebrow: "Allocator",
    focus: "center 28%",
  },
};

const els = {
  caseSelect: document.querySelector("#caseSelect"),
  stageLinks: document.querySelectorAll("[data-go-page]"),
  mode: document.querySelector("#modeSelect"),
  rangeGroup: document.querySelector("#rangeGroup"),
  rangeButtons: document.querySelector("#rangeButtons"),
  dateGroup: document.querySelector("#dateGroup"),
  sessionDate: document.querySelector("#sessionDate"),
  previousDate: document.querySelector("#previousDate"),
  nextDate: document.querySelector("#nextDate"),
  alignGroup: document.querySelector("#alignGroup"),
  alignMode: document.querySelector("#alignMode"),
  chartType: document.querySelector("#chartType"),
  chartView: document.querySelector("#chartView"),
  interval: document.querySelector("#intervalSelect"),
  rebaseVisible: document.querySelector("#rebaseVisible"),
  ma20: document.querySelector("#ma20"),
  ma50: document.querySelector("#ma50"),
  refresh: document.querySelector("#refreshButton"),
  fit: document.querySelector("#fitButton"),
  tourButton: document.querySelector("#tourButton"),
  copySummaryButton: document.querySelector("#copySummaryButton"),
  printButton: document.querySelector("#printButton"),
  chartArea: document.querySelector("#chartArea"),
  workspaceLabel: document.querySelector("#workspaceLabel"),
  status: document.querySelector("#status"),
  legend: document.querySelector("#legend"),
  liveCorrelationStat: document.querySelector("#liveCorrelationStat"),
  liveHitRateStat: document.querySelector("#liveHitRateStat"),
  liveBetaStat: document.querySelector("#liveBetaStat"),
  liveRSquaredStat: document.querySelector("#liveRSquaredStat"),
  dsStatCard: document.querySelector("#dsStatCard"),
  insightPanel: document.querySelector("#insightPanel"),
  thesisPanel: document.querySelector("#thesisPanel"),
  evidenceTable: document.querySelector("#evidenceTable"),
  replayControls: document.querySelector("#replayControls"),
  playReplay: document.querySelector("#playReplay"),
  stepBack: document.querySelector("#stepBack"),
  stepForward: document.querySelector("#stepForward"),
  replaySlider: document.querySelector("#replaySlider"),
  replayReadout: document.querySelector("#replayReadout"),
  niftyReturn: document.querySelector("#niftyReturn"),
  spxReturn: document.querySelector("#spxReturn"),
  spreadReturn: document.querySelector("#spreadReturn"),
  corrMetric: document.querySelector("#corrMetric"),
  sameDirMetric: document.querySelector("#sameDirMetric"),
  coachWindow: document.querySelector("#coachWindow"),
  leadWindow: document.querySelector("#leadWindow"),
  divergenceWindow: document.querySelector("#divergenceWindow"),
  fxWindow: document.querySelector("#fxWindow"),
  factorWindow: document.querySelector("#factorWindow"),
  caseGallery: document.querySelector("#caseGallery"),
  storyTitle: document.querySelector("#storyTitle"),
  storySummary: document.querySelector("#storySummary"),
  storyNarration: document.querySelector("#storyNarration"),
  storyTakeaway: document.querySelector("#storyTakeaway"),
  storySteps: document.querySelector("#storySteps"),
  storyPhase: document.querySelector("#storyPhase"),
  storyMetric: document.querySelector("#storyMetric"),
  storyVisual: document.querySelector(".story-visual"),
  storySpxLine: document.querySelector("#storySpxLine"),
  storyNiftyLine: document.querySelector("#storyNiftyLine"),
  storySpreadBand: document.querySelector("#storySpreadBand"),
  recentInsightDeck: document.querySelector("#recentInsightDeck"),
  globalInsightDeck: document.querySelector("#globalInsightDeck"),
  lagSweep: document.querySelector("#lagSweep"),
  riskCockpit: document.querySelector("#riskCockpit"),
  contextStories: document.querySelector("#contextStories"),
  futureScenarios: document.querySelector("#futureScenarios"),
  sourceLedger: document.querySelector("#sourceLedger"),
};

function formatPercent(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDateLabel(dateISO) {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function showChartLoading(message) {
  clearCharts();
  els.chartArea.classList.add("is-loading");
  els.chartArea.innerHTML = `<div class="chart-loading" aria-live="polite"><span class="chart-spinner" aria-hidden="true"></span><span>${escapeHTML(message)}</span></div>`;
}

function defaultSessionDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function addDaysISO(dateISO, days) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function addTradingDays(dateISO, days) {
  let next = dateISO;
  const step = Math.sign(days);
  let remaining = Math.abs(days);

  while (remaining > 0) {
    next = addDaysISO(next, step);
    const day = new Date(`${next}T00:00:00Z`).getUTCDay();
    if (![0, 6].includes(day)) remaining -= 1;
  }

  return next;
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

function rangeKeys() {
  return Object.keys(RANGE_CONFIG);
}

function activeCase() {
  return CASE_STUDIES.find((item) => item.id === state.caseId) || null;
}

function activeStory() {
  return SHOWCASE_STORIES.find((item) => item.id === state.storyId) || SHOWCASE_STORIES[0];
}

function setupCaseSelect() {
  els.caseSelect.innerHTML = [
    `<option value="custom">Custom analysis</option>`,
    ...CASE_STUDIES.map((item) => `<option value="${item.id}">${item.label}</option>`),
  ].join("");
}

function renderCaseGallery() {
  const featured = SHOWCASE_STORIES.slice(0, 3);
  const supporting = SHOWCASE_STORIES.slice(3);

  const featureMarkup = featured
    .map((item, index) => {
      const visual = storyVisualFor(item.id);
      const active = item.id === state.storyId ? " active" : "";
      const linkedCase = CASE_STUDIES.find((study) => study.id === item.caseId);
      const spread = linkedCase ? linkedCase.niftyReturn - linkedCase.spxReturn : NaN;
      const observation = storyObservationForCard(linkedCase, item);
      return `<button class="feature-story-card scorecard-enter${active}${index === 0 ? " feature-story-card--hero" : ""}" type="button" data-story="${item.id}" style="--story-accent:${visual.accent}; --story-tone:${visual.tone};">
        <span class="feature-story-media" aria-hidden="true"><img class="feature-story-photo" src="${visual.image}" alt="" /></span>
        <span class="feature-story-copy">
          <span class="feature-story-kicker">${visual.eyebrow}</span>
          <strong>${item.title}</strong>
          <small>${observation}</small>
          <em>${item.metric}${Number.isFinite(spread) ? ` / ${formatPercent(spread)} spread` : ""}</em>
          <span class="story-more">${item.level} / Open story</span>
        </span>
      </button>`;
    })
    .join("");

  const listMarkup = supporting
    .map((item, index) => {
      const visual = storyVisualFor(item.id);
      const variant = storyCardVariant(item.id, index);
      const active = item.id === state.storyId ? " active" : "";
      const linkedCase = CASE_STUDIES.find((study) => study.id === item.caseId);
      const spread = linkedCase ? linkedCase.niftyReturn - linkedCase.spxReturn : NaN;
      const observation = storyObservationForCard(linkedCase, item);
      return `<button class="case-tile ${variant} scorecard-enter${active}" style="--story-accent:${visual.accent}; --story-tone:${visual.tone};" type="button" data-story="${item.id}">
        ${variant === "text-first" ? "" : `<span class="case-art" aria-hidden="true"><img class="case-photo" src="${visual.image}" alt="" /></span>`}
        <span class="case-index">${String(index + 4).padStart(2, "0")}</span>
        <div class="case-copy">
          <span class="case-kicker">${visual.eyebrow}</span>
          <strong>${item.title}</strong>
          <small>${observation}</small>
          <em>${item.metric}${Number.isFinite(spread) ? ` / ${formatPercent(spread)} spread` : ""}</em>
          <span class="story-more">${item.level} / Open story</span>
        </div>
      </button>`;
    })
    .join("");

  els.caseGallery.innerHTML = `<div class="case-gallery-shell">
    <div class="feature-story-grid">${featureMarkup}</div>
    <div class="story-list-shell scorecard-enter is-visible">
      <div class="story-list-heading">
        <div>
          <p class="eyebrow">More angles</p>
          <h3>Seven supporting stories</h3>
        </div>
        <p>These stay compact on purpose. The deck leads with three anchor stories, then gives the rest as quick-click research angles.</p>
      </div>
      <div class="case-gallery-list">${listMarkup}</div>
    </div>
  </div>`;
}

function storyVisualFor(storyId) {
  return STORY_VISUALS[storyId] || STORY_VISUALS["spx-follow-through"];
}

function storyObservationForCard(linkedCase, story) {
  if (!linkedCase) return story.hook;
  return `${formatDateLabel(linkedCase.spxDate)}: S&P ${formatPercent(linkedCase.spxReturn)}. ${formatDateLabel(linkedCase.niftyDate)}: NIFTY ${formatPercent(
    linkedCase.niftyReturn,
  )}.`;
}

function storyCardVariant(storyId, index) {
  if (["support-resistance", "weekly-monthly"].includes(storyId)) return "text-first";
  if (index % 3 === 1) return "note-card";
  return "photo-card";
}

function setupRangeButtons() {
  els.rangeButtons.innerHTML = rangeKeys()
    .map((range) => `<button type="button" data-range="${range}">${range}</button>`)
    .join("");

  els.rangeButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-range]");
    if (!button) return;
    state.range = button.dataset.range;
    state.mode = "range";
    syncControls();
    loadData();
  });
}

function updateRangeButtonState() {
  els.rangeButtons.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.range === state.range;
    button.classList.toggle("active", active);
  });
}

function syncControls() {
  const selectedCase = activeCase();
  if (selectedCase) {
    state.mode = "session";
    state.sessionDate = selectedCase.niftyDate;
    state.alignMode = state.alignMode || "session";
  }

  els.caseSelect.value = state.caseId;
  els.mode.value = state.mode;
  els.sessionDate.value = state.sessionDate;
  els.alignMode.value = state.alignMode;
  els.chartType.value = state.chartType;
  els.chartView.value = state.chartView;
  els.interval.value = state.interval;
  els.rebaseVisible.checked = state.rebaseVisible;
  els.ma20.checked = state.ma20;
  els.ma50.checked = state.ma50;
  updateRangeButtonState();

  const sessionMode = state.mode === "session";
  els.rangeGroup.classList.toggle("hidden", sessionMode);
  els.dateGroup.classList.toggle("hidden", !sessionMode);
  els.alignGroup.classList.toggle("hidden", !sessionMode);
  els.mode.disabled = Boolean(selectedCase);
}

function requestedInterval() {
  if (state.mode === "session") {
    const selected = ["5m", "15m", "60m"].includes(state.interval) ? state.interval : "5m";
    return isOlderThanIntradayWindow(state.sessionDate) ? "1d" : selected;
  }

  const config = RANGE_CONFIG[state.range];
  const selected = state.interval === "auto" ? config.autoInterval : state.interval;

  if (["5m", "15m", "60m"].includes(selected) && !["1D", "5D", "1W"].includes(state.range)) {
    setStatus("Granularity adjusted to 1 day for this duration.");
    return "1d";
  }

  if (selected === "1d" && ["3Y", "5Y", "MAX"].includes(state.range)) {
    return config.autoInterval;
  }

  return selected;
}

function isOlderThanIntradayWindow(dateISO) {
  const selected = Date.parse(`${dateISO}T00:00:00Z`);
  const ageDays = (Date.now() - selected) / (1000 * 60 * 60 * 24);
  return ageDays > 55;
}

function formatSessionOffset(time) {
  const minutes = Math.max(0, Math.round((time - SESSION_BASE) / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}:${String(remainder).padStart(2, "0")} from open`;
}

function chartOptions() {
  const sessionAligned = state.mode === "session" && state.alignMode === "session";
  return {
    layout: {
      background: { type: "solid", color: "#0f1210" },
      textColor: "#d8d3c8",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    },
    grid: {
      vertLines: { color: "rgba(216, 211, 200, 0.08)" },
      horzLines: { color: "rgba(216, 211, 200, 0.10)" },
    },
    rightPriceScale: {
      borderColor: "rgba(216, 211, 200, 0.16)",
      scaleMargins: { top: 0.12, bottom: 0.14 },
    },
    timeScale: {
      borderColor: "rgba(96, 88, 70, 0.2)",
      timeVisible: state.mode === "session" || ["5m", "15m", "60m"].includes(requestedInterval()),
      secondsVisible: false,
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    localization: {
      priceFormatter: (price) => formatPercent(price),
      timeFormatter: (time) => {
        if (sessionAligned) return formatSessionOffset(Number(time));
        return new Date(Number(time) * 1000).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    handleScale: true,
    handleScroll: true,
    autoSize: true,
  };
}

function clearCharts() {
  cancelSeriesAnimations();
  state.charts.forEach(({ chart, resizeObserver }) => {
    resizeObserver?.disconnect();
    chart.remove();
  });
  state.charts = [];
  state.activeSeries = [];
  state.primarySeries = {};
  els.chartArea.innerHTML = "";
  els.chartArea.className = "chart-area";
}

function makePane(label = "") {
  const pane = document.createElement("div");
  pane.className = "chart-pane";
  pane.setAttribute("aria-label", label || "Interactive chart pane");
  els.chartArea.appendChild(pane);
  return pane;
}

function createChart(pane) {
  const chart = LightweightCharts.createChart(pane, chartOptions());
  chart.applyOptions({
    width: pane.clientWidth,
    height: pane.clientHeight,
  });

  const resizeObserver = new ResizeObserver(() => {
    chart.applyOptions({
      width: pane.clientWidth,
      height: pane.clientHeight,
    });
  });
  resizeObserver.observe(pane);

  chart.subscribeCrosshairMove((param) => updateLegend(param));
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!state.rebaseVisible || !range) return;
    if (Number.isFinite(state.visibleFrom) && Math.abs(state.visibleFrom - range.from) < 1) return;
    window.clearTimeout(state.rebaseTimer);
    state.rebaseTimer = window.setTimeout(() => {
      state.visibleFrom = typeof range.from === "number" ? range.from : null;
      renderCharts(false);
    }, 120);
  });

  state.charts.push({ chart, pane, resizeObserver });
  return chart;
}

function parseYahooBars(payload, symbolKey, interval) {
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

function filterBarsForRange(bars) {
  if (RANGE_CONFIG[state.range].filter !== "ytd") return bars;
  const now = new Date();
  const from = Date.UTC(now.getUTCFullYear(), 0, 1) / 1000;
  return bars.filter((bar) => bar.time >= from);
}

function filterSessionBars(symbolKey, bars, dateISO, interval = requestedInterval()) {
  const symbol = SYMBOLS[symbolKey];
  const { open, close } = sessionWindow(symbolKey, dateISO);
  return bars.filter((bar) => {
    const sameLocalDate = localDateForTimestamp(bar.time, symbol.timeZone) === dateISO;
    if (interval === "1d") return sameLocalDate;
    return sameLocalDate && bar.time >= open - 60 && bar.time <= close + 60;
  });
}

async function fetchSymbol(symbolKey, params) {
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

async function loadData() {
  if (!window.LightweightCharts) {
    setStatus("Chart library failed to load. Check the internet connection for the CDN.", true);
    return;
  }

  const requestId = ++state.dataRequestId;
  stopReplay();
  state.replayIndex = 0;
  state.isLoading = true;
  state.visibleFrom = null;
  syncControls();

  try {
    let didRender = false;
    if (state.mode === "session") {
      didRender = await loadSessionData(requestId);
    } else {
      didRender = await loadRangeData(requestId);
    }
    if (didRender && requestId === state.dataRequestId) {
      loadLeadLagStudy();
      renderStatsPanel();
    }
  } catch (error) {
    if (requestId !== state.dataRequestId) return;
    setStatus(error.message, true);
    clearCharts();
    els.chartArea.innerHTML = `<div class="empty-state">Could not load market data. Try Refresh or a different date.</div>`;
  } finally {
    if (requestId === state.dataRequestId) state.isLoading = false;
  }
}

async function loadRangeData(requestId) {
  const config = RANGE_CONFIG[state.range];
  const interval = requestedInterval();
  const loadingMessage = `Loading ${state.range} data at ${interval} granularity...`;
  setStatus(loadingMessage);
  showChartLoading(loadingMessage);

  const [nifty, spx] = await Promise.all([
    fetchSymbol("nifty", { range: config.fetchRange, interval }),
    fetchSymbol("spx", { range: config.fetchRange, interval }),
  ]);
  if (requestId !== state.dataRequestId) return false;

  state.data = {
    nifty: filterBarsForRange(nifty),
    spx: filterBarsForRange(spx),
  };

  renderCharts(true);
  setStatus(`Showing ${state.range} percent growth. Prices are normalized from the first bar.`);
  return true;
}

async function loadSessionData(requestId) {
  const interval = requestedInterval();
  const selectedCase = activeCase();
  const spxDate = selectedCase?.spxDate || state.sessionDate;
  const niftyWindow = sessionWindow("nifty", state.sessionDate);
  const spxWindow = sessionWindow("spx", spxDate);
  const leadLabel = selectedCase
    ? `${formatDateLabel(spxDate)} S&P into ${formatDateLabel(state.sessionDate)} NIFTY`
    : `${formatDateLabel(state.sessionDate)} sessions`;
  const loadingMessage = `Loading ${leadLabel} at ${interval} granularity...`;
  setStatus(loadingMessage);
  showChartLoading(loadingMessage);

  const [niftyRaw, spxRaw] = await Promise.all([
    fetchSymbol("nifty", { period1: niftyWindow.period1, period2: niftyWindow.period2, interval }),
    fetchSymbol("spx", { period1: spxWindow.period1, period2: spxWindow.period2, interval }),
  ]);
  if (requestId !== state.dataRequestId) return false;

  state.data = {
    nifty: filterSessionBars("nifty", niftyRaw, state.sessionDate, interval),
    spx: filterSessionBars("spx", spxRaw, spxDate, interval),
  };

  renderCharts(true);
  const alignment =
    state.alignMode === "session"
      ? "session-aligned from each market open"
      : "shown on exact clock time; diagnostics still use elapsed-session pairing";
  const intervalNote = interval === "1d" ? " Older dates use daily bars because intraday history is limited by the data provider." : "";
  setStatus(`${leadLabel} is ${alignment}. Percent move is based from each session open.${intervalNote}`);
  return true;
}

function displayTimeFor(symbolKey, bar) {
  if (state.mode === "session" && state.alignMode === "session") {
    const firstBar = state.data[symbolKey]?.[0];
    return SESSION_BASE + Math.max(0, bar.time - firstBar.time);
  }
  return bar.time;
}

function sourceBarForDisplayTime(symbolKey, displayTime) {
  const bars = state.data[symbolKey] || [];
  if (state.mode === "session" && state.alignMode === "session") {
    const firstBar = bars[0];
    const target = firstBar ? firstBar.time + (displayTime - SESSION_BASE) : displayTime;
    return bars.find((bar) => bar.time >= target);
  }
  return bars.find((bar) => bar.time >= displayTime);
}

function basePriceFor(symbolKey) {
  const bars = state.data[symbolKey] || [];
  if (!bars.length) return null;

  const baseBar =
    state.rebaseVisible && Number.isFinite(state.visibleFrom) ? sourceBarForDisplayTime(symbolKey, state.visibleFrom) : bars[0];

  if (state.mode === "session") return baseBar?.open;
  return baseBar?.close;
}

function percentBars(symbolKey) {
  const base = basePriceFor(symbolKey);
  const bars = state.data[symbolKey] || [];
  if (!Number.isFinite(base) || base === 0) return [];

  return bars.map((bar, index) => {
    const value = ((bar.close / base) - 1) * 100;
    return {
      time: displayTimeFor(symbolKey, bar),
      open: ((bar.open / base) - 1) * 100,
      high: ((bar.high / base) - 1) * 100,
      low: ((bar.low / base) - 1) * 100,
      close: value,
      value: state.mode === "session" && index === 0 ? 0 : value,
      sourceTime: bar.time,
    };
  });
}

function lineData(symbolKey) {
  return percentBars(symbolKey).map((bar) => ({ time: bar.time, value: bar.value }));
}

function movingAverage(data, windowSize) {
  const result = [];
  let sum = 0;
  const queue = [];

  data.forEach((point) => {
    queue.push(point.value);
    sum += point.value;
    if (queue.length > windowSize) sum -= queue.shift();
    if (queue.length === windowSize) {
      result.push({ time: point.time, value: sum / windowSize });
    }
  });

  return result;
}

function seriesOptions(symbolKey) {
  const symbol = SYMBOLS[symbolKey];
  return {
    priceFormat: { type: "custom", formatter: (price) => formatPercent(price) },
    lastValueVisible: true,
    priceLineVisible: true,
    color: symbol.color,
    lineColor: symbol.color,
    topColor: symbol.soft,
    bottomColor: "rgba(255,255,255,0)",
    baseValue: { type: "price", price: 0 },
    upColor: symbol.up,
    downColor: symbol.down,
    borderUpColor: symbol.up,
    borderDownColor: symbol.down,
    wickUpColor: symbol.up,
    wickDownColor: symbol.down,
  };
}

function addPercentSeries(chart, symbolKey, muted = false) {
  const symbol = SYMBOLS[symbolKey];
  let series;

  if (state.chartType === "candles") {
    series = chart.addCandlestickSeries({
      ...seriesOptions(symbolKey),
      priceLineColor: symbol.color,
      priceLineWidth: muted ? 1 : 2,
    });
    series.setData(percentBars(symbolKey).map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  } else if (state.chartType === "baseline") {
    series = chart.addBaselineSeries({
      ...seriesOptions(symbolKey),
      baseValue: { type: "price", price: 0 },
      topLineColor: symbol.color,
      bottomLineColor: symbolKey === "nifty" ? "#c84e3a" : "#8b4d9f",
      topFillColor1: symbol.soft,
      topFillColor2: "rgba(255,255,255,0)",
      bottomFillColor1: "rgba(255,255,255,0)",
      bottomFillColor2: symbolKey === "nifty" ? "rgba(200, 78, 58, 0.16)" : "rgba(139, 77, 159, 0.16)",
      lineWidth: muted ? 1 : 2,
    });
    series.setData(lineData(symbolKey));
  } else {
    series = chart.addLineSeries({
      ...seriesOptions(symbolKey),
      lineWidth: muted ? 1 : 3,
      crosshairMarkerVisible: true,
    });
    series.setData(lineData(symbolKey));
  }

  state.activeSeries.push({ series, symbolKey, label: symbol.label, color: symbol.color });
  state.primarySeries[symbolKey] = series;

  if (state.ma20) addMaSeries(chart, symbolKey, 20);
  if (state.ma50) addMaSeries(chart, symbolKey, 50);

  return series;
}

function addMaSeries(chart, symbolKey, windowSize) {
  const symbol = SYMBOLS[symbolKey];
  const series = chart.addLineSeries({
    color: symbolKey === "nifty" ? "#235f54" : "#7f2f25",
    lineWidth: windowSize === 20 ? 1 : 2,
    lineStyle: windowSize === 20 ? LightweightCharts.LineStyle.Dotted : LightweightCharts.LineStyle.Dashed,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceFormat: { type: "custom", formatter: (price) => formatPercent(price) },
  });
  const maData = movingAverage(lineData(symbolKey), windowSize);
  series.setData([]);
  animateSeriesReveal(series, maData, 2000);
  state.activeSeries.push({
    series,
    symbolKey,
    label: `${symbol.label} ${windowSize} MA`,
    color: symbol.color,
    muted: true,
  });
}

function animateSeriesReveal(series, points, durationMs = 1200) {
  if (prefersReducedMotion() || points.length < 8) {
    series.setData(points);
    return;
  }
  const start = performance.now();
  const reveal = (time) => {
    const progress = Math.min(1, (time - start) / durationMs);
    const eased = 1 - (1 - progress) ** 3;
    const count = Math.max(1, Math.floor(points.length * eased));
    series.setData(points.slice(0, count));
    if (progress < 1) {
      state.animation.rafs.push(window.requestAnimationFrame(reveal));
    }
  };
  state.animation.rafs.push(window.requestAnimationFrame(reveal));
}

function cancelSeriesAnimations() {
  state.animation.rafs.forEach((frame) => window.cancelAnimationFrame(frame));
  state.animation.rafs = [];
}

function comparisonLineData(symbolKey) {
  if (state.mode !== "session" || state.alignMode === "session") return lineData(symbolKey);

  const base = basePriceFor(symbolKey);
  const firstBar = state.data[symbolKey]?.[0];
  if (!Number.isFinite(base) || !firstBar) return [];

  return state.data[symbolKey].map((bar, index) => {
    const value = ((bar.close / base) - 1) * 100;
    return {
      time: SESSION_BASE + Math.max(0, bar.time - firstBar.time),
      value: index === 0 ? 0 : value,
    };
  });
}

function differenceData() {
  const nifty = comparisonLineData("nifty");
  const spx = comparisonLineData("spx");
  const spxByTime = new Map(spx.map((point) => [point.time, point.value]));
  return nifty
    .filter((point) => spxByTime.has(point.time))
    .map((point) => ({ time: point.time, value: point.value - spxByTime.get(point.time) }));
}

function renderDifference(chart) {
  const data = differenceData();
  const sigma = standardDeviation(data.map((point) => point.value));
  const diffSeries = chart.addBaselineSeries({
    baseValue: { type: "price", price: 0 },
    topLineColor: "#008f73",
    bottomLineColor: "#c1472f",
    topFillColor1: "rgba(0, 143, 115, 0.18)",
    topFillColor2: "rgba(0, 143, 115, 0.02)",
    bottomFillColor1: "rgba(193, 71, 47, 0.02)",
    bottomFillColor2: "rgba(193, 71, 47, 0.18)",
    lineWidth: 3,
    priceFormat: { type: "custom", formatter: (price) => formatPercent(price) },
  });
  diffSeries.setData(data);
  if (Number.isFinite(sigma) && sigma > 0) {
    [
      [sigma, "+1 sigma", "#8a7a54"],
      [-sigma, "-1 sigma", "#8a7a54"],
      [sigma * 2, "+2 sigma", "#7d3333"],
      [-sigma * 2, "-2 sigma", "#7d3333"],
    ].forEach(([price, title, color]) => {
      diffSeries.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title,
      });
    });
  }
  state.activeSeries.push({
    series: diffSeries,
    symbolKey: "spread",
    label: "NIFTY minus S&P",
    color: "#2d5f9a",
  });
}

function wilsonIntervalPublic(hits, n) {
  if (!n || !Number.isFinite(hits) || !Number.isFinite(n)) return { lower: NaN, upper: NaN };
  const z = 1.959963984540054;
  const p = hits / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

function standardDeviation(values) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return null;
  const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (clean.length - 1);
  return Math.sqrt(variance);
}

function renderCharts(fitContent) {
  if (!state.data.nifty?.length || !state.data.spx?.length) {
    clearCharts();
    els.chartArea.innerHTML = `<div class="empty-state">No chart data available for this selection.</div>`;
    updateStats();
    renderInsights();
    return;
  }

  const priorRange = state.charts[0]?.chart.timeScale().getVisibleRange();
  clearCharts();

  if (state.chartView === "split") {
    els.workspaceLabel.textContent = "Split lens";
    els.chartArea.classList.add("split");
    const niftyChart = createChart(makePane("NIFTY 50 percent performance"));
    const spxChart = createChart(makePane("S&P 500 percent performance"));
    addPercentSeries(niftyChart, "nifty");
    addPercentSeries(spxChart, "spx");
    synchronizeCharts(niftyChart, spxChart);
  } else {
    const chart = createChart(makePane("NIFTY 50 and S&P 500 percent performance overlay"));
    if (state.chartView === "difference") {
      els.workspaceLabel.textContent = "Deviation lens";
      renderDifference(chart);
    } else {
      els.workspaceLabel.textContent = state.mode === "session" ? "Session replay lens" : "Overlay lens";
      addPercentSeries(chart, "nifty");
      addPercentSeries(chart, "spx", state.chartType === "candles");
    }
  }

  if (fitContent) {
    state.charts.forEach(({ chart }) => chart.timeScale().fitContent());
  } else if (priorRange) {
    state.charts.forEach(({ chart }) => chart.timeScale().setVisibleRange(priorRange));
  }

  updateStats();
  updateLegend();
  renderInsights();
  setupReplay();
}

function setupReplay() {
  const sessionReady = state.mode === "session" && state.chartView !== "split" && state.data.nifty?.length;
  els.replayControls.classList.toggle("hidden", !sessionReady);
  if (!sessionReady) {
    stopReplay();
    return;
  }

  const points = lineData("nifty");
  const max = Math.max(0, points.length - 1);
  state.replayIndex = Math.min(state.replayIndex, max);
  els.replaySlider.max = String(max);
  els.replaySlider.value = String(state.replayIndex);
  updateReplayMarker();
}

function stopReplay() {
  if (state.replayTimer) window.clearInterval(state.replayTimer);
  state.replayTimer = null;
  state.replayPlaying = false;
  if (els.playReplay) els.playReplay.textContent = "Play";
}

function toggleReplay() {
  if (state.replayPlaying) {
    stopReplay();
    return;
  }

  state.replayPlaying = true;
  if (els.playReplay) els.playReplay.textContent = "Pause";
  state.replayTimer = window.setInterval(() => {
    const max = Number(els.replaySlider.max || 0);
    if (state.replayIndex >= max) state.replayIndex = 0;
    else state.replayIndex += 1;
    els.replaySlider.value = String(state.replayIndex);
    updateReplayMarker();
  }, 260);
}

function stepReplay(delta) {
  stopReplay();
  const max = Number(els.replaySlider.max || 0);
  state.replayIndex = Math.max(0, Math.min(max, state.replayIndex + delta));
  els.replaySlider.value = String(state.replayIndex);
  updateReplayMarker();
}

function nearestPoint(data, time) {
  return data.reduce((best, point) => {
    if (!best) return point;
    return Math.abs(point.time - time) < Math.abs(best.time - time) ? point : best;
  }, null);
}

function updateReplayMarker() {
  const niftyData = lineData("nifty");
  const spxData = lineData("spx");
  const anchor = niftyData[state.replayIndex] || niftyData.at(-1);
  if (!anchor) return;

  const spx = nearestPoint(spxData, anchor.time);
  const spread = anchor.value - (spx?.value ?? NaN);
  const timeLabel =
    state.alignMode === "session"
      ? formatSessionOffset(anchor.time)
      : new Date(anchor.time * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  Object.entries(state.primarySeries).forEach(([symbolKey, series]) => {
    const point = nearestPoint(lineData(symbolKey), anchor.time);
    if (point && typeof series.setMarkers === "function") {
      series.setMarkers([
        {
          time: point.time,
          position: "aboveBar",
          color: SYMBOLS[symbolKey].color,
          shape: "circle",
          text: "",
        },
      ]);
    }
  });

  els.replayReadout.textContent = `${timeLabel} | NIFTY ${formatPercent(anchor.value)} / S&P ${formatPercent(spx?.value)} / gap ${formatPercent(
    spread,
  )}`;
}

function synchronizeCharts(chartA, chartB) {
  let syncing = false;
  const sync = (target) => (range) => {
    if (syncing || !range) return;
    syncing = true;
    target.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  };

  chartA.timeScale().subscribeVisibleLogicalRangeChange(sync(chartB));
  chartB.timeScale().subscribeVisibleLogicalRangeChange(sync(chartA));
}

function lastValue(symbolKey) {
  const data = lineData(symbolKey);
  return data.at(-1)?.value;
}

function updateStats() {
  const nifty = lastValue("nifty");
  const spx = lastValue("spx");
  els.niftyReturn.textContent = formatPercent(nifty);
  els.spxReturn.textContent = formatPercent(spx);
  els.spreadReturn.textContent = formatPercent(nifty - spx);
}

function valueFromSeriesData(data) {
  if (!data) return null;
  if (Number.isFinite(data.value)) return data.value;
  if (Number.isFinite(data.close)) return data.close;
  return null;
}

function updateLegend(param) {
  const items = state.activeSeries.map((entry) => {
    const hoveredData = param?.seriesData?.get(entry.series);
    const value = valueFromSeriesData(hoveredData) ?? getLatestSeriesValue(entry);
    const mutedClass = entry.muted ? " muted" : "";
    return `<span class="legend-item${mutedClass}"><span class="dot" style="background:${entry.color}"></span>${entry.label} <strong>${formatPercent(value)}</strong></span>`;
  });

  els.legend.innerHTML = items.join("");
}

function getLatestSeriesValue(entry) {
  if (entry.symbolKey === "spread") return differenceData().at(-1)?.value;
  if (entry.label.includes(" MA")) {
    const windowSize = entry.label.includes("50") ? 50 : 20;
    return movingAverage(lineData(entry.symbolKey), windowSize).at(-1)?.value;
  }
  return lastValue(entry.symbolKey);
}

function pairedSeries() {
  const nifty = comparisonLineData("nifty");
  const spx = comparisonLineData("spx");
  const spxByTime = new Map(spx.map((point) => [point.time, point.value]));
  return nifty.filter((point) => spxByTime.has(point.time)).map((point) => [point.value, spxByTime.get(point.time), point.time]);
}

function correlation(pairs) {
  if (pairs.length < 3) return null;
  const xs = pairs.map((pair) => pair[0]);
  const ys = pairs.map((pair) => pair[1]);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  pairs.forEach(([x, y]) => {
    const xd = x - xMean;
    const yd = y - yMean;
    numerator += xd * yd;
    xDenominator += xd * xd;
    yDenominator += yd * yd;
  });

  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator ? numerator / denominator : null;
}

function pairCorrelation(rows) {
  if (rows.length < 3) return null;
  return correlation(rows.map((row) => [row.spx, row.nifty]));
}

function summarizePairs(rows) {
  const same = rows.filter((row) => row.same).length;
  return {
    sample: rows.length,
    correlation: pairCorrelation(rows),
    hitRate: rows.length ? same / rows.length : NaN,
    avgNifty: rows.length ? rows.reduce((sum, row) => sum + row.nifty, 0) / rows.length : NaN,
  };
}

function summarizeFx(rows) {
  const pairs = rows.map((row) => [row.fx, row.spread]);
  const depreciationWithUnderperformance = rows.filter((row) => row.fx > 0 && row.spread < 0).length;
  return {
    sample: rows.length,
    correlation: correlation(pairs),
    depreciationHitRate: rows.length ? depreciationWithUnderperformance / rows.length : NaN,
  };
}

function summarizeMacro(rows, field) {
  const pairs = rows.map((row) => [row[field], row.spread]);
  return {
    sample: rows.length,
    correlation: correlation(pairs),
  };
}

function sameDatePairs(niftyReturns, spxReturns) {
  const spxByDate = new Map(spxReturns.map((point) => [point.date, point]));
  return niftyReturns
    .map((niftyPoint) => {
      const spxPoint = spxByDate.get(niftyPoint.date);
      if (!spxPoint) return null;
      return {
        spxDate: spxPoint.date,
        niftyDate: niftyPoint.date,
        spx: spxPoint.value,
        nifty: niftyPoint.value,
        spread: niftyPoint.value - spxPoint.value,
        same: Math.sign(spxPoint.value) === Math.sign(niftyPoint.value),
      };
    })
    .filter(Boolean);
}

function linkedPairsWithLag(niftyReturns, spxReturns, lagSessions = 1) {
  const sortedSpx = [...spxReturns].sort((a, b) => a.date.localeCompare(b.date));
  const pairs = [];
  niftyReturns.forEach((niftyPoint) => {
    const previous = sortedSpx.filter((spxPoint) => spxPoint.date < niftyPoint.date);
    const spxPoint = previous.at(-lagSessions);
    if (!spxPoint) return;
    pairs.push({
      spxDate: spxPoint.date,
      niftyDate: niftyPoint.date,
      spx: spxPoint.value,
      nifty: niftyPoint.value,
      spread: niftyPoint.value - spxPoint.value,
      same: Math.sign(spxPoint.value) === Math.sign(niftyPoint.value),
    });
  });
  return pairs;
}

function buildLagSweep(niftyReturns, spxReturns, cutoffDate) {
  const lagConfigs = [
    ["Same calendar date", "Mostly contemporaneous; India usually trades before the US close.", sameDatePairs(niftyReturns, spxReturns)],
    ["Prior US close", "The main thesis: completed S&P session into the next NIFTY session.", linkedPairsWithLag(niftyReturns, spxReturns, 1)],
    ["Two US closes back", "A decay check: if this wins, the relationship is probably slower or noisier.", linkedPairsWithLag(niftyReturns, spxReturns, 2)],
  ];

  return lagConfigs.map(([label, detail, rows]) => {
    const filtered = rows.filter((row) => row.niftyDate >= cutoffDate);
    return { label, detail, ...summarizePairs(filtered) };
  });
}

function riskMetrics(bars) {
  if (!bars?.length) {
    return {
      sample: 0,
      totalReturn: NaN,
      annualReturn: NaN,
      annualVolatility: NaN,
      returnVolRatio: NaN,
      maxDrawdown: NaN,
      currentDrawdown: NaN,
    };
  }

  const returns = dailyReturns(bars).map((point) => point.value);
  const first = bars[0].close;
  const last = bars.at(-1).close;
  const totalReturn = ((last / first) - 1) * 100;
  const annualReturn = bars.length > 1 ? ((last / first) ** (252 / (bars.length - 1)) - 1) * 100 : NaN;
  const dailyVolatility = standardDeviation(returns);
  const annualVolatility = Number.isFinite(dailyVolatility) ? dailyVolatility * Math.sqrt(252) : NaN;
  const returnVolRatio = annualVolatility ? annualReturn / annualVolatility : NaN;
  let peak = first;
  let maxDrawdown = 0;

  bars.forEach((bar) => {
    peak = Math.max(peak, bar.close);
    const drawdown = ((bar.close / peak) - 1) * 100;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  });

  const latestPeak = bars.reduce((max, bar) => Math.max(max, bar.close), first);
  const currentDrawdown = ((last / latestPeak) - 1) * 100;

  return {
    sample: returns.length,
    totalReturn,
    annualReturn,
    annualVolatility,
    returnVolRatio,
    maxDrawdown,
    currentDrawdown,
  };
}

function formatCorrelation(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function renderDsStatCard() {
  if (!els.dsStatCard) return;
  const study = state.study;
  const ols = study?.ols;
  const granger = study?.granger;
  const recent = study?.recent;
  const fmt2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '--');
  const fmt4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : '--');
  const fmtPct = (v) => (Number.isFinite(v) ? (v * 100).toFixed(0) + '%' : '--');
  const n = recent?.sample ?? '--';
  const hitRate = fmtPct(recent?.hitRate);
  let hitCi = '';
  if (recent && Number.isFinite(recent.hitRate) && recent.sample) {
    const hits = Math.round(recent.hitRate * recent.sample);
    const ci = wilsonIntervalPublic(hits, recent.sample);
    if (Number.isFinite(ci.lower)) hitCi = ' [' + fmtPct(ci.lower) + '–' + fmtPct(ci.upper) + ']';
  }
  const grangerSig = granger?.significant ? '✓ significant' : (Number.isFinite(granger?.pValue) ? 'not significant' : '--');
  // safe: escapeHTML used on all dynamic values
  els.dsStatCard.innerHTML =
    '<div class="ds-card-primary">' +
    '<div class="ds-card-row"><span class="ds-label">Model</span><span class="ds-value">OLS — NIFTY<sub>t</sub> = α + β·SPX<sub>t−1</sub></span></div>' +
    '<div class="ds-card-row">' +
    '<span class="ds-label">β</span><span class="ds-value ds-accent">' + escapeHTML(fmt2(ols?.beta)) + '</span>' +
    '<span class="ds-label">R²</span><span class="ds-value ds-accent">' + escapeHTML(fmt2(ols?.rSquared)) + '</span>' +
    '<span class="ds-label">α</span><span class="ds-value">' + escapeHTML(fmt4(ols?.alpha)) + '</span>' +
    '</div>' +
    '<div class="ds-card-row">' +
    '<span class="ds-label">Hit rate</span><span class="ds-value ds-accent">' + escapeHTML(hitRate + hitCi) + '</span>' +
    '<span class="ds-label">n</span><span class="ds-value">' + escapeHTML(String(n)) + '</span>' +
    '</div>' +
    '<div class="ds-card-row">' +
    '<span class="ds-label">Granger F</span><span class="ds-value">' + escapeHTML(fmt2(granger?.fStat)) + '</span>' +
    '<span class="ds-label">p</span><span class="ds-value' + (granger?.significant ? ' ds-sig' : '') + '">' + escapeHTML(fmt4(granger?.pValue) + ' ' + grangerSig) + '</span>' +
    '</div>' +
    '</div>' +
    '<details class="ds-card-secondary">' +
    '<summary>Show methodology</summary>' +
    '<div class="ds-card-row"><span class="ds-label">Data</span><span class="ds-value">Daily session pairs, close-to-close returns, 2Y window</span></div>' +
    '<div class="ds-card-row"><span class="ds-label">Feature</span><span class="ds-value">X = S&amp;P return, lagged 1 session (no look-ahead)</span></div>' +
    '<div class="ds-card-row"><span class="ds-label">Limitation</span><span class="ds-value">Associative only. FX, oil, local flows, sector mix uncontrolled.</span></div>' +
    '</details>';
}

function renderInsights() {
  renderDsStatCard();
  const pairs = pairedSeries();
  const gap = (lastValue("nifty") ?? NaN) - (lastValue("spx") ?? NaN);
  const deviations = differenceData();
  const maxDeviation = deviations.length
    ? deviations.reduce((largest, point) => (Math.abs(point.value) > Math.abs(largest.value) ? point : largest), deviations[0])
    : { value: NaN, time: null };
  const corr = correlation(pairs);
  const leader =
    Number.isFinite(gap) && Math.abs(gap) >= 0.01 ? (gap > 0 ? "NIFTY ahead" : "S&P ahead") : "Nearly even";
  const maxTime = Number.isFinite(maxDeviation.time)
    ? state.mode === "session"
      ? formatSessionOffset(maxDeviation.time)
      : new Date(maxDeviation.time * 1000).toLocaleDateString()
    : "--";

  const study = state.study;
  const leadLagText = study
    ? `${formatCorrelation(study.recent.correlation)} corr, ${Math.round(study.recent.hitRate * 100)}% same direction`
    : state.studyError ? "Unavailable" : "Loading...";
  const selectedPair = study?.selected
    ? `${study.selected.spxDate} S&P ${formatPercent(study.selected.spxReturn)} -> ${study.selected.niftyDate || "next NIFTY"} ${formatPercent(
        study.selected.niftyReturn,
      )}`
    : `${state.sessionDate} S&P -> next NIFTY`;
  const fxDetail = study?.selected?.fxReturn
    ? `Selected next-NIFTY date USD/INR ${formatPercent(study.selected.fxReturn)}`
    : `${study?.fx?.sample || 0} daily pairs`;
  const oilDetail = study?.selected?.oilReturn
    ? `Selected next-NIFTY date Brent ${formatPercent(study.selected.oilReturn)}`
    : `${study?.oil?.sample || 0} daily pairs`;

  els.corrMetric.textContent = study ? formatCorrelation(study.recent.correlation) : formatCorrelation(corr);
  els.sameDirMetric.textContent = study ? `${Math.round(study.recent.hitRate * 100)}%` : "--";
  els.insightPanel.innerHTML = [
    insightCard("Current gap", formatPercent(gap), leader),
    insightCard("Max deviation", formatPercent(maxDeviation.value), maxTime),
    insightCard("Shape correlation", formatCorrelation(corr), `${pairs.length} aligned points`),
    insightCard("Prior S&P sample", leadLagText, selectedPair),
    insightCard("USD/INR stress", formatCorrelation(study?.fx?.correlation), fxDetail),
    insightCard("Oil shock lens", formatCorrelation(study?.oil?.correlation), oilDetail),
  ].join("");
  renderThesisPanel();
  renderEvidenceTable();
  renderInsightWindows();
  renderCaseGallery();
  renderStoryTheatre();
  renderInsightDecks();
  renderLagSweep();
  renderRiskCockpit();
  renderContextStories();
  renderFutureScenarios();
  renderSourceLedger();
  animateMountedCards();
}

function insightCard(label, value, detail) {
  const tips = {
    "Current gap": "NIFTY percent move minus S&P percent move for the selected comparison.",
    "Max deviation": "The largest observed spread during the selected replay window.",
    "Shape correlation": "How similarly the two intraday shapes moved after normalization.",
    "Prior S&P sample": "A descriptive sample: completed S&P session linked to the next NIFTY session.",
    "USD/INR stress": "Association between rupee moves and NIFTY relative performance. Positive USD/INR means INR weakened.",
    "Oil shock lens": "Association between Brent crude moves and NIFTY relative performance. India is a large oil importer, so oil can matter for divergences.",
  };
  return `<div class="insight-card scorecard-enter"><span>${label} <i class="info-dot" data-tip="${tips[label] || "Descriptive metric"}">?</i></span><strong>${value}</strong><small>${detail || ""}</small></div>`;
}

function renderInsightWindows() {
  const selected = activeCase();
  const study = state.study;
  const gap = (lastValue("nifty") ?? NaN) - (lastValue("spx") ?? NaN);
  const direction = Number.isFinite(gap) ? (gap < 0 ? "S&P moved more than NIFTY" : "NIFTY moved more than the S&P") : "waiting for data";
  const strong = study?.strong;
  const fx = study?.fx;
  const bestLag = study?.lagSweep?.reduce((best, row) => (!best || row.hitRate > best.hitRate ? row : best), null);
  const deviations = differenceData();
  const maxDeviation = deviations.length
    ? deviations.reduce((largest, point) => (Math.abs(point.value) > Math.abs(largest.value) ? point : largest), deviations[0])
    : null;

  els.coachWindow.innerHTML = windowChrome(
    "Plain-English translator",
    "What am I looking at?",
    `<p>This app does not ask whether one index is bigger in rupees or dollars. It rebases both to <b>0%</b> and asks: after a US session finishes, does the next India session tend to rhyme with it?</p>
     <div class="explain-flow">
      <span>S&P closes</span><b>-></b><span>global risk read</span><b>-></b><span>NIFTY opens next</span><b>-></b><span>compare spread</span>
     </div>
     <div class="window-stat-grid">
      ${windowStat("Selected case", selected ? selected.level || "Replay case" : "Custom")}
      ${windowStat("Gap", formatPercent(Math.abs(gap)))}
      ${windowStat("Read", direction.replace(" moved more than ", " > "))}
     </div>
     <p class="window-note">For the selected case: ${selected ? selected.title : "custom analysis"}. ${direction} by ${formatPercent(Math.abs(gap))} in this window.</p>`,
  );

  els.leadWindow.innerHTML = windowChrome(
    "Lead-lag lab",
    "Is there a tendency?",
    `<div class="big-number">${study ? `${Math.round(study.recent.hitRate * 100)}%` : "--"}</div>
     <p>Same-direction rate in the recent daily sample. Strong S&P moves are separated because broad averages can hide the actual useful regime.</p>
     <div class="window-stat-grid">
      ${windowStat("Last 1Y corr", formatCorrelation(study?.recent?.correlation))}
      ${windowStat("|S&P| >= 1%", strong?.sample ? `${Math.round(strong.hitRate * 100)}%` : "--")}
      ${windowStat("Best lag", bestLag?.label || "--")}
     </div>`,
  );

  els.divergenceWindow.innerHTML = windowChrome(
    "Divergence radar",
    "Where did the simple model break?",
    `<div class="big-number">${formatPercent(maxDeviation?.value)}</div>
     <p>Largest selected-window spread. Divergences are the useful part: they show where local flows, positioning, currency, or policy context may have mattered more than US direction.</p>
     <div class="window-action-row"><button type="button" class="micro-action" data-case="model-miss">Load recent model miss</button></div>`,
  );

  els.fxWindow.innerHTML = windowChrome(
    "FX stress overlay",
    "Does rupee weakness help explain misses?",
    `<div class="big-number">${formatCorrelation(fx?.correlation)}</div>
     <p>Correlation between USD/INR daily moves and the NIFTY-minus-S&P spread. Positive USD/INR means the rupee weakened versus the dollar.</p>
     <div class="window-stat-grid">
      ${windowStat("Sample", `${fx?.sample || "--"} daily pairs`)}
      ${windowStat("Bias", Number.isFinite(fx?.correlation) && fx.correlation > 0 ? "Rupee pressure mattered" : "Weak read")}
      ${windowStat("Use", "Context lens")}
     </div>
     <p class="window-note">This is not a causal model; it is a macro context layer for interpreting divergence.</p>`,
  );

  els.factorWindow.innerHTML = windowChrome(
    "US factor lens",
    "Was S&P really a broad US signal?",
    `<div class="big-number">${formatCorrelation(study?.tech?.correlation)}</div>
     <p>Nasdaq 100 minus S&P 500 is used as a rough mega-cap / tech concentration proxy. When this spread is high, the S&P move may be more about US mega-cap leadership than global risk appetite.</p>
     <div class="window-stat-grid">
      ${windowStat("Selected tech spread", formatPercent(study?.selected?.techSpread))}
      ${windowStat("Brent vs spread", formatCorrelation(study?.oil?.correlation))}
      ${windowStat("Question", "Breadth or AI?")}
     </div>`,
  );
}

function renderStoryTheatre() {
  const selected = activeCase();
  const story = activeStory();
  const study = state.study;
  const page = document.body.dataset.page || "home";
  const spxReturn = selected?.spxReturn ?? lastValue("spx") ?? 0;
  const niftyReturn = selected?.niftyReturn ?? lastValue("nifty") ?? 0;
  const spread = niftyReturn - spxReturn;
  const storyValues = [
    selected ? `${selected.spxDate}: ${formatPercent(spxReturn)}` : "Prior US session",
    selected ? `${selected.niftyDate}: ${formatPercent(niftyReturn)}` : "Next India session",
    formatPercent(spread),
    `FX ${formatCorrelation(study?.fx?.correlation)} / Tech ${formatCorrelation(study?.tech?.correlation)}`,
  ];
  const phaseItems = (story?.phases || []).map(([label, narration], index) => ({
    label,
    value: storyValues[index] || story.metric,
    narration,
  }));
  const animationKey = [story?.id || "custom", selected?.id || "custom", state.sessionDate, state.alignMode, page].join("|");
  const storyReady = page !== "detail" || Boolean(state.data.nifty?.length && state.data.spx?.length);
  const shouldAnimate = storyReady && page === "detail" && (state.forceStoryAnimation || state.lastStoryAnimationKey !== animationKey);
  const observation = selected
    ? `${formatDateLabel(selected.spxDate)} S&P moved ${formatPercent(spxReturn)}, then ${formatDateLabel(selected.niftyDate)} NIFTY moved ${formatPercent(
        niftyReturn,
      )}.`
    : "Compare the completed US session with the next India session using percent growth, not absolute index levels.";
  const spreadLine =
    Number.isFinite(spread) && Math.abs(spread) >= 0.01
      ? spread > 0
        ? `NIFTY finished ${formatPercent(spread)} ahead of the prior US move.`
        : `NIFTY finished ${formatPercent(Math.abs(spread))} behind the prior US move.`
      : "The two sessions finished almost on top of each other.";

  els.storyTitle.textContent = story ? story.title : selected ? selected.hook : "Build the market story layer by layer";
  els.storySummary.textContent = `${observation} ${spreadLine}`;
  els.storyNarration.textContent = storyReady
    ? shouldAnimate
      ? "First the US move appears. Then India responds. Then the spread shows what was confirmed and what was missed."
      : phaseItems.at(-1)?.narration || ""
    : "Loading the selected market session.";
  els.storyTakeaway.innerHTML = storyTakeawayMarkup(story, selected, spread);
  if (!state.storySequenceRunning) {
    els.storySteps.innerHTML = phaseItems
      .map(
        (item, index) =>
          `<div class="story-step" data-story-step="${index}">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <small>${item.narration}</small>
          </div>`,
      )
      .join("");
  }
  els.storyPhase.textContent = story ? story.level : selected ? selected.title : "Custom";
  els.storyMetric.textContent = selected
    ? `${formatPercent(spxReturn)} S&P -> ${formatPercent(niftyReturn)} NIFTY`
    : "Interactive relationship sequence";

  if (!state.storySequenceRunning) {
    stopStorySequence();
    updateStoryPaths(spxReturn, niftyReturn, spread);
  }
  if (!storyReady) {
    setStoryVisualMode("pending");
    setStoryVisualState(0);
  } else if (shouldAnimate) {
    setStoryVisualMode("sequencing");
    setStoryVisualState(0);
    runStorySequence(phaseItems);
    state.lastStoryAnimationKey = animationKey;
    state.forceStoryAnimation = false;
  } else if (!state.storySequenceRunning) {
    setStoryVisualMode("settled");
    finishStorySequence(phaseItems);
  }
}

function storyLayers() {
  return [els.storySpxLine, els.storyNiftyLine, els.storySpreadBand].filter(Boolean);
}

function setStoryVisualMode(mode) {
  if (!els.storyVisual) return;
  els.storyVisual.classList.remove("is-pending", "is-sequencing", "is-settled");
  if (mode) els.storyVisual.classList.add(`is-${mode}`);
}

function setStoryVisualState(visibleCount, animatedIndex = null) {
  storyLayers().forEach((element, index) => {
    const length = element.dataset.storyLength || "0";
    if (index >= visibleCount) {
      if (element.dataset.storyState !== "hidden") {
        element.classList.remove("draw-line", "story-static");
        element.style.strokeDashoffset = length;
        element.dataset.storyState = "hidden";
      }
      return;
    }

    if (index === animatedIndex) {
      if (element.dataset.storyState !== "animating") {
        element.classList.remove("draw-line", "story-static");
        element.style.strokeDashoffset = length;
        void element.getBoundingClientRect();
        element.classList.add("draw-line");
        element.dataset.storyState = "animating";
      }
      return;
    }

    if (element.dataset.storyState !== "static") {
      element.classList.remove("draw-line");
      element.classList.add("story-static");
      element.style.strokeDashoffset = "0";
      element.dataset.storyState = "static";
    }
  });
}

function updateStoryPaths(spxReturn, niftyReturn, spread) {
  els.storySpxLine?.setAttribute("d", storyPath(spxReturn, 1));
  els.storyNiftyLine?.setAttribute("d", storyPath(niftyReturn, -1));
  els.storySpreadBand?.setAttribute("d", storyPath(spread, 0.35));
  storyLayers().forEach((element) => {
    const length = Math.ceil(element.getTotalLength());
    element.dataset.storyLength = `${length}`;
    element.style.strokeDasharray = `${length}`;
    element.style.strokeDashoffset = `${length}`;
  });
}

function storyPath(finalReturn, bias) {
  const baseline = 245;
  const yEnd = storyY(finalReturn);
  const mid1 = storyY(finalReturn * 0.32 + bias * 0.5);
  const mid2 = storyY(finalReturn * 0.68 - bias * 0.35);
  const bend = finalReturn >= 0 ? -18 : 18;
  return `M45 ${baseline} C120 ${mid1 + bend} 170 ${mid1} 235 ${mid1} S340 ${mid2} 405 ${mid2} S500 ${yEnd} 595 ${yEnd}`;
}

function storyY(value) {
  const capped = Math.max(-4, Math.min(4, Number(value) || 0));
  return 245 - capped * 42;
}

function runStorySequence(phaseItems) {
  stopStorySequence();
  state.storySequenceRunning = true;
  setStoryVisualMode("sequencing");
  const token = ++state.storySequenceToken;
  const phaseDuration = prefersReducedMotion() || compactStoryLayout() ? 0 : 1600;

  phaseItems.forEach((item, index) => {
    const timeout = window.setTimeout(() => {
      if (token !== state.storySequenceToken) return;
      setStoryVisualState(Math.min(index + 1, 3), Math.min(index, 2));
      els.storySteps.querySelectorAll(".story-step").forEach((step) => {
        step.classList.toggle("active", step.dataset.storyStep === String(index));
      });
      els.storyPhase.textContent = `Phase 0${index + 1}: ${item.label}`;
      els.storyMetric.textContent = item.value;
      setStoryNarration(item.narration);
    }, index * phaseDuration);
    state.storyTimeouts.push(timeout);
  });

  const settleTimeout = window.setTimeout(() => {
    if (token !== state.storySequenceToken) return;
    finishStorySequence(phaseItems);
  }, phaseItems.length * phaseDuration + (phaseDuration ? 700 : 0));
  state.storyTimeouts.push(settleTimeout);
}

function setStoryNarration(text) {
  window.clearInterval(state.storyTypeTimer);
  els.storyNarration.classList.remove("is-typing");
  els.storyNarration.textContent = text;
}

function finishStorySequence(phaseItems) {
  state.storySequenceRunning = false;
  stopStorySequence();
  setStoryVisualMode("settled");
  setStoryVisualState(3);
  const finalStep = phaseItems.at(-1);
  els.storySteps.querySelectorAll(".story-step").forEach((step, index) => {
    step.classList.toggle("active", index === phaseItems.length - 1);
  });
  if (!finalStep) return;
  els.storyPhase.textContent = `Phase ${String(phaseItems.length).padStart(2, "0")}: ${finalStep.label}`;
  els.storyMetric.textContent = finalStep.value;
  setStoryNarration(finalStep.narration);
}

function stopStorySequence() {
  state.storySequenceToken += 1;
  state.storyTimeouts.forEach((timeout) => window.clearTimeout(timeout));
  state.storyTimeouts = [];
  window.clearInterval(state.storyTypeTimer);
  state.storyTypeTimer = null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function compactStoryLayout() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function storyTakeawayMarkup(story, selected, spread) {
  const spreadText =
    Number.isFinite(spread) && Math.abs(spread) >= 0.01
      ? spread > 0
        ? 'NIFTY outran the S&P feature by ' + formatPercent(spread) + ' — positive residual.'
        : 'NIFTY lagged the S&P feature by ' + formatPercent(Math.abs(spread)) + ' — negative residual.'
      : 'NIFTY and S&P finished nearly even — residual close to zero.';
  const observation = selected
    ? formatDateLabel(selected.spxDate) + ' → ' + formatDateLabel(selected.niftyDate)
    : 'Use any completed US session';
  if (!story) {
    return '<div class="takeaway-block"><span>Observation</span><strong>' + escapeHTML(observation) + '</strong><small>' + escapeHTML(spreadText) + '</small></div>';
  }
  return '<div class="takeaway-block"><span>Observation</span><strong>' + escapeHTML(observation) + '</strong><small>' + escapeHTML(spreadText) + '</small></div>' +
    '<div class="ds-case-card">' +
    '<div class="ds-case-row"><span class="ds-case-label">Problem</span><span class="ds-case-body">' + escapeHTML(story.problem || '') + '</span></div>' +
    '<div class="ds-case-row"><span class="ds-case-label">Model</span><span class="ds-case-body">' + escapeHTML(story.model || '') + '</span></div>' +
    '<div class="ds-case-row ds-case-result"><span class="ds-case-label">Result</span><span class="ds-case-body">' + escapeHTML(story.result || '') + '</span></div>' +
    '<details class="ds-case-more">' +
    '<summary>Data · Feature · Limitation</summary>' +
    '<div class="ds-case-row"><span class="ds-case-label">Data</span><span class="ds-case-body">' + escapeHTML(story.data || '') + '</span></div>' +
    '<div class="ds-case-row"><span class="ds-case-label">Feature</span><span class="ds-case-body">' + escapeHTML(story.feature || '') + '</span></div>' +
    '<div class="ds-case-row ds-case-limitation"><span class="ds-case-label">Limitation</span><span class="ds-case-body">' + escapeHTML(story.limitation || '') + '</span></div>' +
    '</details>' +
    '</div>';
}

function storyQuestion(storyId) {
  if (["ai-boom", "tech-boom"].includes(storyId)) return "Ask whether the US move was broad, or mostly mega-cap tech.";
  if (["inr-depreciation", "dedollarization"].includes(storyId)) return "Ask whether currency pressure changed how foreign investors read India.";
  if (storyId === "oil-shock") return "Ask whether oil mattered more for India than the prior US session did.";
  if (["india-catch-up", "weekly-monthly"].includes(storyId)) return "Ask whether the relationship looks stronger on weekly and monthly horizons than on one noisy day.";
  if (storyId === "support-resistance") return "Ask whether the spread stalled because the market hit a visible level, not because the story vanished.";
  return "Ask whether the US move was large enough to matter and whether India confirmed it on the next session.";
}

function renderInsightDecks() {
  const study = state.study;
  const bestLag = study?.lagSweep?.reduce((best, row) => (!best || row.hitRate > best.hitRate ? row : best), null);
  const topMiss = study?.contextRows?.[0];
  const recent = [
    {
      title: bestLag ? `${bestLag.label} is the strongest recent lag` : "Lag strength is loading",
      detail: bestLag
        ? `${bestLag.sample} recent pairs show ${Math.round(bestLag.hitRate * 100)}% same-direction movement with ${formatCorrelation(bestLag.correlation)} correlation. That tells the viewer where the relationship is strongest, not just whether it exists.`
        : "The app ranks same-date, prior-close, and two-session lag samples once data loads.",
    },
    {
      title: "Large S&P moves are the cleaner regime",
      detail: `When |S&P| >= 1%, next NIFTY matched direction about ${study?.strong?.sample ? `${Math.round(study.strong.hitRate * 100)}%` : "--"} of the time. That is a better interview claim than saying the two indices always follow.`,
    },
    {
      title: topMiss ? `Biggest recent miss: ${topMiss.niftyDate}` : "Divergences are investigation prompts",
      detail: topMiss
        ? `Prior S&P ${formatPercent(topMiss.spx)}, next NIFTY ${formatPercent(topMiss.nifty)}, spread ${formatPercent(topMiss.spread)}. The app then checks FX ${formatPercent(topMiss.fx)}, Brent ${formatPercent(topMiss.oil)}, and tech spread ${formatPercent(topMiss.techSpread)}.`
        : "Model misses become prompts for local flows, FX, oil, policy, or sector mix.",
    },
    {
      title: "Weekly/monthly horizons are separated",
      detail: `Weekly corr ${formatCorrelation(study?.weekly?.correlation)}, monthly corr ${formatCorrelation(study?.monthly?.correlation)}. This keeps trading-session noise away from allocator-style questions.`,
    },
    {
      title: "Replay turns abstract stats into a story",
      detail: "The scrubber shows when the spread opened, while the theatre sequence explains the S&P signal, NIFTY response, spread, and macro context in order.",
    },
  ];
  const global = [
    {
      title: "AI leadership can make S&P less 'broad market'",
      detail: "If US gains are concentrated in mega-cap tech, NIFTY may not follow one-for-one. The Nasdaq 100 minus S&P spread is used as a rough breadth clue.",
    },
    {
      title: "Dollar strength changes the India read-through",
      detail: `USD/INR-vs-spread corr is ${formatCorrelation(study?.fx?.correlation)} in the 2Y sample. A rising USD/INR can pressure foreign investor dollar returns even if local equities look fine.`,
    },
    {
      title: "Oil is a different shock for India",
      detail: `Brent-vs-spread corr is ${formatCorrelation(study?.oil?.correlation)}. If crude spikes, the India story can diverge from the US even when global risk appetite is similar.`,
    },
    {
      title: "De-dollarization is a scenario, not a chart shortcut",
      detail: "If BRICS/local-currency settlement narratives matter, the first chart clue should be persistent FX regime change, not one-day equity noise.",
    },
    {
      title: "India catch-up is a structural question",
      detail: "If domestic earnings, capex, or flows dominate, NIFTY should show relative strength even when the S&P signal is neutral or narrowly tech-led.",
    },
  ];

  els.recentInsightDeck.innerHTML = recent.map((item, index) => insightStoryCard(item, index)).join("");
  els.globalInsightDeck.innerHTML = global.map((item, index) => insightStoryCard(item, index)).join("");
}

function insightStoryCard(item, index) {
  return `<details class="story-card scorecard-enter" ${index === 0 ? "open" : ""}>
    <summary><span>0${index + 1}</span><strong>${item.title}</strong></summary>
    <p>${item.detail}</p>
  </details>`;
}

function renderLagSweep() {
  if (!els.lagSweep) return;
  const rows = state.study?.lagSweep || [];
  if (!rows.length) {
    els.lagSweep.innerHTML = `<div class="table-empty">${state.studyError ? "Lag sweep unavailable." : "Loading lag sweep..."}</div>`;
    return;
  }

  const bestIndex = rows.reduce((best, row, index) => {
    if (!Number.isFinite(row.hitRate)) return best;
    if (best === -1) return index;
    return row.hitRate > rows[best].hitRate ? index : best;
  }, -1);

  els.lagSweep.innerHTML = rows
    .map(
      (row, index) => `<article class="lag-card scorecard-enter${index === bestIndex ? " best" : ""}">
        <span>${index === bestIndex ? "strongest sample" : "lag test"}</span>
        <h3>${row.label}</h3>
        <div class="lag-metrics">
          <b>${Math.round(row.hitRate * 100)}%</b>
          <em>${formatCorrelation(row.correlation)} corr</em>
        </div>
        <p>${row.detail}</p>
        <small>${row.sample} recent pairs</small>
      </article>`,
    )
    .join("");
}

function renderRiskCockpit() {
  if (!els.riskCockpit) return;
  const risk = state.study?.risk;
  if (!risk) {
    els.riskCockpit.innerHTML = `<div class="table-empty">${state.studyError ? "Risk cockpit unavailable." : "Loading risk cockpit..."}</div>`;
    return;
  }

  els.riskCockpit.innerHTML = [
    riskCard("2Y total return", risk.nifty.totalReturn, risk.spx.totalReturn, "Index-level percent change over the fetched daily sample."),
    riskCard("Annualized vol", risk.nifty.annualVolatility, risk.spx.annualVolatility, "Daily return volatility scaled by sqrt(252)."),
    riskCard("Max drawdown", risk.nifty.maxDrawdown, risk.spx.maxDrawdown, "Worst peak-to-trough fall in the 2Y sample."),
    riskCard("Return / vol", risk.nifty.returnVolRatio, risk.spx.returnVolRatio, "Simple annual return divided by annual volatility, not a risk-free Sharpe."),
  ].join("");
}

function riskCard(label, niftyValue, spxValue, detail) {
  const formatter = label === "Return / vol" ? formatRatio : formatPercent;
  const leader = riskLeader(label, niftyValue, spxValue);
  return `<article class="risk-card scorecard-enter">
    <span>${label}</span>
    <div class="risk-compare">
      <b style="--bar:${riskBar(niftyValue, label)}%"><i>NIFTY</i>${formatter(niftyValue)}</b>
      <b style="--bar:${riskBar(spxValue, label)}%"><i>S&amp;P</i>${formatter(spxValue)}</b>
    </div>
    <p>${detail}</p>
    <small>Better read: ${leader}</small>
  </article>`;
}

function riskLeader(label, niftyValue, spxValue) {
  if (!Number.isFinite(niftyValue) || !Number.isFinite(spxValue)) return "--";
  if (label === "Annualized vol") return niftyValue <= spxValue ? "NIFTY" : "S&P";
  return niftyValue >= spxValue ? "NIFTY" : "S&P";
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function riskBar(value, label) {
  if (!Number.isFinite(value)) return 0;
  const magnitude = label === "Return / vol" ? Math.abs(value) * 45 : Math.abs(value) * 2.2;
  return Math.max(8, Math.min(100, magnitude));
}

function renderContextStories() {
  if (!els.contextStories) return;
  const rows = state.study?.contextRows || [];
  if (!rows.length) {
    els.contextStories.innerHTML = `<div class="table-empty">${state.studyError ? "Divergence board unavailable." : "Loading divergence board..."}</div>`;
    return;
  }

  els.contextStories.innerHTML = rows
    .slice(0, 5)
    .map((row, index) => {
      const clue = strongestContextClue(row);
      return `<button class="context-card scorecard-enter" type="button" data-date="${row.niftyDate}" data-case="custom">
        <span>0${index + 1} / ${row.niftyDate}</span>
        <strong>${formatPercent(row.spread)} NIFTY-minus-S&amp;P spread</strong>
        <p>Prior S&amp;P ${formatPercent(row.spx)} on ${row.spxDate}; next NIFTY ${formatPercent(row.nifty)}.</p>
        <div class="context-chip-row">
          <em>FX ${formatPercent(row.fx)}</em>
          <em>Brent ${formatPercent(row.oil)}</em>
          <em>Tech spread ${formatPercent(row.techSpread)}</em>
        </div>
        <small>${clue}</small>
      </button>`;
    })
    .join("");
}

function renderFutureScenarios() {
  if (!els.futureScenarios) return;
  const study = state.study;
  const scenarios = [
    {
      tag: "AI / mega-cap concentration",
      title: "If US AI leadership keeps broadening",
      then:
        "S&P strength should become easier for NIFTY to follow because the US move would look more like broad risk appetite than a handful of mega-cap winners.",
      watch: `Nasdaq-minus-S&P spread ${formatCorrelation(study?.tech?.correlation)} vs NIFTY spread, plus whether same-direction rate rises in strong S&P sessions.`,
      wrong: "If S&P rallies but the Nasdaq spread dominates and NIFTY does not respond, the signal may be too US-sector-specific.",
    },
    {
      tag: "Dollar / rupee",
      title: "If the dollar stays strong",
      then:
        "NIFTY can underperform the S&P from a global investor perspective even when local sentiment is fine, because INR weakness can pressure foreign-flow appetite.",
      watch: `USD/INR correlation with NIFTY-minus-S&P spread is ${formatCorrelation(study?.fx?.correlation)} in the current 2Y sample.`,
      wrong: "If USD/INR rises while NIFTY still outperforms, domestic flows or earnings momentum may be overpowering the currency drag.",
    },
    {
      tag: "De-dollarization / BRICS",
      title: "If local-currency settlement becomes more relevant",
      then:
        "The interesting signal should be regime-level FX stability or lower dollar sensitivity, not one dramatic equity candle.",
      watch: "Does the USD/INR lens become less useful over monthly windows while NIFTY keeps compounding independently?",
      wrong: "If equity divergence still lines up with dollar stress, the de-dollarization story is not visible in this market relationship yet.",
    },
    {
      tag: "Oil shock",
      title: "If crude oil spikes",
      then:
        "India can diverge from the US because imported inflation and current-account pressure matter more for NIFTY than for the S&P.",
      watch: `Brent correlation with spread is ${formatCorrelation(study?.oil?.correlation)}; inspect the generated divergence board for oil-heavy misses.`,
      wrong: "If oil rises and NIFTY still outperforms, sector mix, policy response, or domestic flows may be absorbing the shock.",
    },
    {
      tag: "India catch-up",
      title: "If India's domestic cycle leads",
      then:
        "NIFTY should show positive spread on neutral US days and remain resilient when S&P gains are narrow.",
      watch: `Monthly corr ${formatCorrelation(study?.monthly?.correlation)} and 2Y return/vol ratio NIFTY ${formatRatio(study?.risk?.nifty?.returnVolRatio)} vs S&P ${formatRatio(study?.risk?.spx?.returnVolRatio)}.`,
      wrong: "If NIFTY only moves after large US sessions, the story is more global beta than independent compounding.",
    },
    {
      tag: "US slowdown / rates",
      title: "If US growth slows while rates ease",
      then:
        "The S&P can weaken on earnings risk while NIFTY benefits from easier global liquidity, creating a different kind of divergence.",
      watch: "Do negative S&P sessions stop transmitting to NIFTY, and does the weekly/monthly spread improve despite weaker US daily returns?",
      wrong: "If both markets fall together on risk-off days, liquidity relief is not dominating the growth scare.",
    },
  ];

  els.futureScenarios.innerHTML = scenarios
    .map(
      (item, index) => `<details class="future-card scorecard-enter" ${index < 2 ? "open" : ""}>
        <summary><span>${item.tag}</span><strong>${item.title}</strong></summary>
        <div class="scenario-grid">
          <p><b>If / then</b>${item.then}</p>
          <p><b>What to watch</b>${item.watch}</p>
          <p><b>What would change my mind</b>${item.wrong}</p>
        </div>
      </details>`,
    )
    .join("");
}

function strongestContextClue(row) {
  const clues = [
    ["currency", row.fx, "Rupee move was the largest macro clue in this miss."],
    ["oil", row.oil, "Brent had the largest contextual move around this miss."],
    ["tech", row.techSpread, "US tech concentration was the largest clue in this miss."],
  ].filter(([, value]) => Number.isFinite(value));
  if (!clues.length) return "Macro proxies were unavailable for this row.";
  clues.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return clues[0][2];
}

function renderSourceLedger() {
  if (!els.sourceLedger) return;
  const study = state.study;
  const updated = study?.lastUpdated
    ? new Date(study.lastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "loading";
  els.sourceLedger.innerHTML = `
    <div>
      <p class="eyebrow">Evidence ledger</p>
      <h2>Freshness, scope, and limits</h2>
    </div>
    <div class="ledger-grid">
      <span><b>Data</b> Yahoo Finance chart endpoint via local proxy: ^NSEI, ^GSPC, INR=X, BZ=F, ^NDX.</span>
      <span><b>Refresh</b> ${updated}</span>
      <span><b>Sample</b> ${study?.twoYear?.sample || "--"} daily pairs, ${study?.weekly?.sample || "--"} weekly pairs, ${study?.monthly?.sample || "--"} monthly pairs.</span>
      <span><b>Method</b> Prices are normalized to percent growth. Currency conversion is intentionally ignored except as USD/INR context.</span>
      <span><b>Reference</b> Risk/drawdown/volatility framing is inspired by portfolio comparison tools such as <a href="https://portfolioslab.com/tools/stock-comparison/NFTY/SPY" target="_blank" rel="noreferrer">PortfoliosLab</a>; the lead-lag story layer is custom.</span>
      <span><b>Claim discipline</b> Association only. Macro cards are clues to investigate, not causal proof.</span>
    </div>`;
}

function animateMountedCards() {
  const currentPage = document.body.dataset.page || "home";
  const nodes = document.querySelectorAll(`[data-page-section="${currentPage}"] .scorecard-enter:not(.is-visible)`);
  if (prefersReducedMotion()) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }
  window.requestAnimationFrame(() => {
    nodes.forEach((node, index) => {
      node.style.setProperty("--stagger", `${Math.min(index, 16) * 34}ms`);
      node.classList.add("is-visible");
    });
  });
}

function windowChrome(kicker, title, body) {
  return `<div class="window-bar"><span></span><span></span><span></span><b>${kicker}</b></div><h3>${title}</h3>${body}`;
}

function windowStat(label, value) {
  return `<div class="window-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderThesisPanel() {
  const selected = activeCase();
  const study = state.study;
  const stageRows = study
    ? [
        ["1", "Recent tendency", `${study.recent.sample} last-1Y pairs, ${Math.round(study.recent.hitRate * 100)}% same direction`],
        [
          "2",
          "Strong-move filter",
          `|S&P| >= 1% matched ${study.strong.sample ? Math.round(study.strong.hitRate * 100) : "--"}% of next NIFTY sessions`,
        ],
        [
          "3",
          "Weekly / monthly lens",
          `Weekly corr ${formatCorrelation(study.weekly.correlation)}, monthly corr ${formatCorrelation(study.monthly.correlation)}`,
        ],
        [
          "4",
          "FX stress check",
          `USD/INR vs spread corr ${formatCorrelation(study.fx.correlation)} across ${study.fx.sample} daily pairs`,
        ],
        [
          "5",
          "Tech / oil context",
          `Tech-spread corr ${formatCorrelation(study.tech.correlation)}, Brent corr ${formatCorrelation(study.oil.correlation)}`,
        ],
        ["6", "Event exceptions", "Replay selected cases to show where the simple relationship breaks"],
      ]
    : [
        ["1", "Recent tendency", state.studyError ? "Sample unavailable" : "Loading sample"],
        ["2", "Strong-move filter", state.studyError ? "Sample unavailable" : "Loading sample"],
        ["3", "Weekly / monthly lens", state.studyError ? "Sample unavailable" : "Loading sample"],
        ["4", "FX stress check", state.studyError ? "USD/INR sample unavailable" : "Loading USD/INR sample"],
        ["5", "Tech / oil context", state.studyError ? "Macro sample unavailable" : "Loading macro sample"],
        ["6", "Event exceptions", "Replay selected cases"],
      ];

  const title = selected?.title || "Custom relationship check";
  const thesis =
    selected?.thesis ||
    "Use the controls to compare same-session movement or prior S&P session into next NIFTY. The app separates co-movement from causality.";
  const tags = selected?.tags || ["custom", "association", "no causal claim"];
  const pair = selected
    ? `${selected.spxDate} S&P ${formatPercent(selected.spxReturn)} -> ${selected.niftyDate} NIFTY ${formatPercent(selected.niftyReturn)}`
    : "Manual date pair";

  els.thesisPanel.innerHTML = `
    <div class="thesis-kicker">${selected?.stage || "Research workflow"}</div>
    <h2>${title}</h2>
    <p>${thesis}</p>
    <div class="case-pair">${pair}</div>
    <div class="tag-row">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    <div class="stage-list">
      ${stageRows
        .map(
          ([step, label, detail]) =>
            `<div class="stage-row"><b>${step}</b><span>${label}</span><small>${detail}</small></div>`,
        )
        .join("")}
    </div>
  `;
}

function renderEvidenceTable() {
  if (!state.study) {
    els.evidenceTable.innerHTML = `<div class="table-empty">${state.studyError ? "Evidence sample unavailable." : "Loading evidence sample..."}</div>`;
    return;
  }

  const rows = state.study.tableRows.slice(0, 8);
  els.evidenceTable.innerHTML = `
    <div class="evidence-summary">
      <span>Last 1Y: <strong>${formatCorrelation(state.study.recent.correlation)}</strong> corr / <strong>${Math.round(
        state.study.recent.hitRate * 100,
      )}%</strong> same direction</span>
      <span>Last 2Y: <strong>${formatCorrelation(state.study.twoYear.correlation)}</strong> corr / <strong>${Math.round(
        state.study.twoYear.hitRate * 100,
      )}%</strong> same direction</span>
      <span>Weekly 2Y: <strong>${formatCorrelation(state.study.weekly.correlation)}</strong> corr / <strong>${Math.round(
        state.study.weekly.hitRate * 100,
      )}%</strong> same direction</span>
      <span>Monthly 2Y: <strong>${formatCorrelation(state.study.monthly.correlation)}</strong> corr / <strong>${Math.round(
        state.study.monthly.hitRate * 100,
      )}%</strong> same direction</span>
      <span>Best recent lag: <strong>${state.study.lagSweep.reduce((best, row) => (row.hitRate > best.hitRate ? row : best), state.study.lagSweep[0]).label}</strong></span>
      <span>USD/INR vs spread: <strong>${formatCorrelation(state.study.fx.correlation)}</strong> corr</span>
      <span>Tech-spread vs NIFTY spread: <strong>${formatCorrelation(state.study.tech.correlation)}</strong> corr</span>
      <span>Brent vs NIFTY spread: <strong>${formatCorrelation(state.study.oil.correlation)}</strong> corr</span>
      <span>|S&P| >= 1%: <strong>${Math.round(state.study.strong.hitRate * 100)}%</strong> same direction</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Stage</th>
          <th>S&P session</th>
          <th>S&P</th>
          <th>Next NIFTY</th>
          <th>NIFTY</th>
          <th>Spread</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>
              <td>${row.stage}</td>
              <td>${row.spxDate}</td>
              <td>${formatPercent(row.spx)}</td>
              <td>${row.niftyDate}</td>
              <td>${formatPercent(row.nifty)}</td>
              <td>${formatPercent(row.spread)}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function dailyReturns(bars) {
  return bars
    .map((bar, index) => {
      if (index === 0) return null;
      const previous = bars[index - 1];
      return {
        date: new Date(bar.time * 1000).toISOString().slice(0, 10),
        value: ((bar.close / previous.close) - 1) * 100,
      };
    })
    .filter(Boolean);
}

function linkedPairs(niftyReturns, spxReturns) {
  return linkedPairsWithLag(niftyReturns, spxReturns, 1);
}

function bucketedPairs(niftyReturns, spxReturns, bucketType) {
  const spxByBucket = new Map(spxReturns.map((point) => [periodBucket(point.date, bucketType), point]));
  return niftyReturns
    .map((niftyPoint) => {
      const spxPoint = spxByBucket.get(periodBucket(niftyPoint.date, bucketType));
      if (!spxPoint) return null;
      return {
        spxDate: spxPoint.date,
        niftyDate: niftyPoint.date,
        spx: spxPoint.value,
        nifty: niftyPoint.value,
        spread: niftyPoint.value - spxPoint.value,
        same: Math.sign(spxPoint.value) === Math.sign(niftyPoint.value),
      };
    })
    .filter(Boolean);
}

function periodBucket(dateISO, bucketType) {
  if (bucketType === "month") return dateISO.slice(0, 7);
  const date = new Date(`${dateISO}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function loadLeadLagStudy() {
  const studyRequestId = ++state.studyRequestId;
  state.studyError = null;
  try {
    const [niftyBars, spxBars, niftyWeekly, spxWeekly, niftyMonthly, spxMonthly, usdInrBars, brentBars, ndxBars] = await Promise.all([
      fetchSymbol("nifty", { range: "2y", interval: "1d" }),
      fetchSymbol("spx", { range: "2y", interval: "1d" }),
      fetchSymbol("nifty", { range: "2y", interval: "1wk" }),
      fetchSymbol("spx", { range: "2y", interval: "1wk" }),
      fetchSymbol("nifty", { range: "2y", interval: "1mo" }),
      fetchSymbol("spx", { range: "2y", interval: "1mo" }),
      fetchSymbol("usdinr", { range: "2y", interval: "1d" }),
      fetchSymbol("brent", { range: "2y", interval: "1d" }),
      fetchSymbol("ndx", { range: "2y", interval: "1d" }),
    ]);
    if (studyRequestId !== state.studyRequestId) return;

    const niftyReturns = dailyReturns(niftyBars);
    const spxReturns = dailyReturns(spxBars);
    const fxReturns = dailyReturns(usdInrBars);
    const oilReturns = dailyReturns(brentBars);
    const ndxReturns = dailyReturns(ndxBars);
    const fxByDate = new Map(fxReturns.map((point) => [point.date, point]));
    const oilByDate = new Map(oilReturns.map((point) => [point.date, point]));
    const ndxByDate = new Map(ndxReturns.map((point) => [point.date, point]));
    const weeklyPairs = bucketedPairs(dailyReturns(niftyWeekly), dailyReturns(spxWeekly), "week");
    const monthlyPairs = bucketedPairs(dailyReturns(niftyMonthly), dailyReturns(spxMonthly), "month");
    const spxByDate = new Map(spxReturns.map((point) => [point.date, point]));
    const pairs = linkedPairs(niftyReturns, spxReturns);
    const fxPairs = pairs
      .map((point) => ({ ...point, fx: fxByDate.get(point.niftyDate)?.value }))
      .filter((point) => Number.isFinite(point.fx));
    const macroPairs = pairs
      .map((point) => ({
        ...point,
        oil: oilByDate.get(point.niftyDate)?.value,
        techSpread: (ndxByDate.get(point.spxDate)?.value ?? NaN) - point.spx,
      }))
      .filter((point) => Number.isFinite(point.oil) && Number.isFinite(point.techSpread));

    const oneYearCutoff = addDaysISO(defaultSessionDate(), -365);
    const recentPairs = pairs.filter((point) => point.niftyDate >= oneYearCutoff);
    const strongPairs = recentPairs.filter((point) => Math.abs(point.spx) >= 1);
    statsModulePromise ||= import("./modules/stats.js");
    const { olsRegression, grangerTest } = await statsModulePromise;
    const spxOlsInput = recentPairs.map((p) => ({ date: p.spxDate, return: p.spx }));
    const niftyOlsInput = recentPairs.map((p) => ({ date: p.niftyDate, return: p.nifty }));
    const olsResult = olsRegression(spxOlsInput, niftyOlsInput);
    const grangerResult = grangerTest(niftyOlsInput, spxOlsInput, 1);
    const lagSweep = buildLagSweep(niftyReturns, spxReturns, oneYearCutoff);
    const selectedSpxDate = activeCase()?.spxDate || state.sessionDate;
    const selectedSpx = spxByDate.get(selectedSpxDate);
    const nextNifty = selectedSpx ? niftyReturns.find((point) => point.date > selectedSpxDate) : null;
    const contextRows = pairs
      .map((point) => ({
        ...point,
        fx: fxByDate.get(point.niftyDate)?.value,
        oil: oilByDate.get(point.niftyDate)?.value,
        techSpread: (ndxByDate.get(point.spxDate)?.value ?? NaN) - point.spx,
      }))
      .filter((point) => point.niftyDate >= oneYearCutoff)
      .filter((point) => [point.fx, point.oil, point.techSpread].some(Number.isFinite))
      .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread));
    const caseRows = CASE_STUDIES.map((item) => ({
      stage: "Replay case",
      spxDate: item.spxDate,
      niftyDate: item.niftyDate,
      spx: item.spxReturn,
      nifty: item.niftyReturn,
      spread: item.niftyReturn - item.spxReturn,
    }));
    const divergenceRows = [...pairs]
      .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))
      .slice(0, 6)
      .map((point) => ({ ...point, stage: "Historical miss" }));

    state.study = {
      recent: summarizePairs(recentPairs),
      twoYear: summarizePairs(pairs),
      weekly: summarizePairs(weeklyPairs),
      monthly: summarizePairs(monthlyPairs),
      strong: summarizePairs(strongPairs),
      ols: { alpha: olsResult.alpha, beta: olsResult.beta, rSquared: olsResult.rSquared },
      granger: { fStat: grangerResult.fStat, pValue: grangerResult.pValue, significant: grangerResult.significant },
      lagSweep,
      fx: summarizeFx(fxPairs),
      oil: summarizeMacro(macroPairs, "oil"),
      tech: summarizeMacro(macroPairs, "techSpread"),
      risk: {
        nifty: riskMetrics(niftyBars),
        spx: riskMetrics(spxBars),
      },
      contextRows,
      tableRows: [...caseRows, ...divergenceRows],
      lastUpdated: Date.now(),
      selected: selectedSpx
        ? {
            spxDate: selectedSpx.date,
            spxReturn: selectedSpx.value,
            niftyDate: nextNifty?.date,
            niftyReturn: nextNifty?.value,
            fxReturn: nextNifty ? fxByDate.get(nextNifty.date)?.value : null,
            oilReturn: nextNifty ? oilByDate.get(nextNifty.date)?.value : null,
            techSpread: selectedSpx ? (ndxByDate.get(selectedSpx.date)?.value ?? NaN) - selectedSpx.value : null,
          }
        : null,
    };
    state.studyError = null;
    renderInsights();
  } catch (error) {
    if (studyRequestId !== state.studyRequestId) return;
    console.error("Unable to load lead-lag study", error);
    state.study = null;
    state.studyError = error.message || "Supplemental study unavailable";
    renderInsights();
  }
}

function wireControls() {
  setupCaseSelect();
  renderCaseGallery();
  setupRangeButtons();
  syncControls();

  els.stageLinks.forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.goPage));
  });

  els.caseSelect.addEventListener("change", () => {
    loadCaseStudy(els.caseSelect.value);
  });

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-go-page]");
    if (pageButton) {
      setPage(pageButton.dataset.goPage);
      return;
    }

    const dateButton = event.target.closest("[data-date]");
    if (dateButton?.dataset.date) {
      state.caseId = "custom";
      state.mode = "session";
      state.sessionDate = dateButton.dataset.date;
      state.alignMode = "session";
      syncControls();
      loadData();
      return;
    }

    const storyButton = event.target.closest("[data-story]");
    if (storyButton) {
      loadShowcaseStory(storyButton.dataset.story);
      return;
    }

    const caseButton = event.target.closest("[data-case]");
    if (!caseButton) return;
    loadCaseStudy(caseButton.dataset.case);
  });

  els.tourButton.addEventListener("click", toggleNarratedTour);
  els.copySummaryButton.addEventListener("click", copyThesisSummary);
  els.printButton.addEventListener("click", () => window.print());

  els.mode.addEventListener("change", () => {
    state.caseId = "custom";
    state.mode = els.mode.value;
    syncControls();
    loadData();
  });

  els.sessionDate.addEventListener("change", () => {
    if (!els.sessionDate.value) return;
    state.caseId = "custom";
    state.sessionDate = els.sessionDate.value;
    loadData();
  });

  els.previousDate.addEventListener("click", () => {
    state.caseId = "custom";
    state.sessionDate = addTradingDays(state.sessionDate, -1);
    loadData();
  });

  els.nextDate.addEventListener("click", () => {
    state.caseId = "custom";
    state.sessionDate = addTradingDays(state.sessionDate, 1);
    loadData();
  });

  els.alignMode.addEventListener("change", () => {
    state.alignMode = els.alignMode.value;
    renderCharts(true);
    const alignment =
      state.alignMode === "session"
        ? "session-aligned from each market open"
        : "shown on exact clock time; diagnostics still use elapsed-session pairing";
    setStatus(`${formatDateLabel(state.sessionDate)} is ${alignment}. Percent move is based from each session open.`);
  });

  els.chartType.addEventListener("change", () => {
    state.chartType = els.chartType.value;
    renderCharts(true);
  });

  els.chartView.addEventListener("change", () => {
    state.chartView = els.chartView.value;
    renderCharts(true);
  });

  els.interval.addEventListener("change", () => {
    state.interval = els.interval.value;
    loadData();
  });

  els.rebaseVisible.addEventListener("change", () => {
    state.rebaseVisible = els.rebaseVisible.checked;
    const range = state.charts[0]?.chart.timeScale().getVisibleRange();
    state.visibleFrom = state.rebaseVisible && range ? range.from : null;
    renderCharts(false);
  });

  els.ma20.addEventListener("change", () => {
    state.ma20 = els.ma20.checked;
    renderCharts(false);
  });

  els.ma50.addEventListener("change", () => {
    state.ma50 = els.ma50.checked;
    renderCharts(false);
  });

  els.refresh.addEventListener("click", loadData);
  els.playReplay?.addEventListener("click", toggleReplay);
  els.stepBack?.addEventListener("click", () => stepReplay(-1));
  els.stepForward?.addEventListener("click", () => stepReplay(1));
  els.replaySlider.addEventListener("input", () => {
    stopReplay();
    state.replayIndex = Number(els.replaySlider.value);
    updateReplayMarker();
  });
  els.fit.addEventListener("click", () => {
    state.visibleFrom = null;
    state.charts.forEach(({ chart }) => chart.timeScale().fitContent());
    if (state.rebaseVisible) renderCharts(true);
  });

  setPage(window.location.hash.replace("#", "") || "home", false);
}

function setPage(page, updateHash = true) {
  const allowed = new Set(["home", "stories", "detail", "macro"]);
  const nextPage = allowed.has(page) ? page : "home";
  const previousPage = document.body.dataset.page || "home";
  const shouldLoadDefaultStory = nextPage === "detail" && state.caseId === "custom";
  if (shouldLoadDefaultStory) {
    const story = activeStory();
    const selected = CASE_STUDIES.find((item) => item.id === story.caseId);
    if (selected) {
      state.caseId = selected.id;
      state.mode = "session";
      state.sessionDate = selected.niftyDate;
      state.chartView = "overlay";
      state.alignMode = "session";
      syncControls();
      renderCaseGallery();
      if (state.data.nifty?.length) loadData();
    }
  }
  document.body.dataset.page = nextPage;
  els.stageLinks.forEach((button) => button.classList.toggle("active", button.dataset.goPage === nextPage));
  if (updateHash) history.replaceState(null, "", `#${nextPage}`);
  if (nextPage !== previousPage) {
    window.scrollTo({ top: 0, behavior: "auto" });
    triggerPageEntrance(nextPage);
  }
  window.requestAnimationFrame(() => {
    document.querySelectorAll(`[data-page-section="${nextPage}"] .scorecard-enter`).forEach((node) => node.classList.add("is-visible"));
  });
  if (nextPage === "detail") {
    state.forceStoryAnimation = true;
    if (!state.isLoading && state.data.nifty?.length) renderStoryTheatre();
  } else {
    stopStorySequence();
  }
}

function loadShowcaseStory(storyId) {
  const story = SHOWCASE_STORIES.find((item) => item.id === storyId);
  if (!story) return;
  state.storyId = story.id;
  if (story.caseId) {
    state.caseId = story.caseId;
    const selected = activeCase();
    if (selected) {
      state.mode = "session";
      state.sessionDate = selected.niftyDate;
      state.chartView = "overlay";
      state.alignMode = "session";
      state.replayIndex = 0;
    }
  }
  state.forceStoryAnimation = true;
  state.isLoading = true;
  syncControls();
  renderCaseGallery();
  setPage("detail");
  loadData();
}

function loadCaseStudy(caseId) {
  state.caseId = caseId;
  const selected = activeCase();
  const matchingStory = SHOWCASE_STORIES.find((story) => story.caseId === caseId);
  if (matchingStory) state.storyId = matchingStory.id;
  if (selected) {
    state.mode = "session";
    state.sessionDate = selected.niftyDate;
    state.chartView = "overlay";
    state.alignMode = "session";
    state.replayIndex = 0;
  }
  state.forceStoryAnimation = true;
  state.isLoading = true;
  syncControls();
  renderCaseGallery();
  loadData();
}

async function copyThesisSummary() {
  const text = buildThesisSummary();
  try {
    await navigator.clipboard.writeText(text);
    els.copySummaryButton.textContent = "Copied";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    els.copySummaryButton.textContent = "Copied";
  }
  window.setTimeout(() => {
    els.copySummaryButton.textContent = "Copy thesis";
  }, 1400);
}

function buildThesisSummary() {
  const study = state.study;
  const selected = activeCase();
  const bestLag = study?.lagSweep?.reduce((best, row) => (!best || row.hitRate > best.hitRate ? row : best), null);
  const topMiss = study?.contextRows?.[0];
  const ols = study?.ols;
  const granger = study?.granger;
  const fmt2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '--');
  const fmt4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : '--');
  return [
    "NIFTY / S&P Evidence Desk — DS Model Summary",
    "",
    "MODEL",
    "OLS: NIFTY_t = α + β·SPX_{t-1}",
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

function toggleNarratedTour() {
  if (state.tourTimer) {
    window.clearInterval(state.tourTimer);
    window.clearTimeout(state.tourReplayTimeout);
    state.tourTimer = null;
    state.tourReplayTimeout = null;
    els.tourButton.textContent = "Start narrated tour";
    return;
  }

  let index = Math.max(0, CASE_STUDIES.findIndex((item) => item.id === state.caseId));
  els.tourButton.textContent = "Stop tour";
  loadCaseStudy(CASE_STUDIES[index].id);
  state.tourTimer = window.setInterval(() => {
    index = (index + 1) % CASE_STUDIES.length;
    loadCaseStudy(CASE_STUDIES[index].id);
    state.tourReplayTimeout = window.setTimeout(() => {
      if (!state.replayPlaying) toggleReplay();
    }, 1300);
  }, 8500);
}

function initializeEntranceMotion() {
  if (state.animation.booted) return;
  state.animation.booted = true;
  document.body.classList.add("booting");
  window.setTimeout(() => document.body.classList.remove("booting"), 1400);
}

function triggerPageEntrance(page) {
  const sections = [...document.querySelectorAll(`[data-page-section="${page}"]`)];
  window.clearTimeout(state.pageEntranceTimer);
  sections.forEach((section, index) => {
    section.classList.remove("page-enter");
    section.style.setProperty("--page-enter-delay", `${Math.min(index, 5) * 70}ms`);
  });
  window.requestAnimationFrame(() => {
    sections.forEach((section) => section.classList.add("page-enter"));
  });
  state.pageEntranceTimer = window.setTimeout(() => {
    sections.forEach((section) => section.classList.remove("page-enter"));
  }, 1300);
}

let statsModulePromise = null;

function setLiveStatsValues({ correlation = NaN, hitRate = NaN, beta = NaN, rSquared = NaN } = {}) {
  if (els.liveCorrelationStat) els.liveCorrelationStat.textContent = formatCorrelation(correlation);
  if (els.liveHitRateStat) els.liveHitRateStat.textContent = Number.isFinite(hitRate) ? `${Math.round(hitRate * 100)}%` : "--";
  if (els.liveBetaStat) els.liveBetaStat.textContent = Number.isFinite(beta) ? beta.toFixed(2) : "--";
  if (els.liveRSquaredStat) els.liveRSquaredStat.textContent = Number.isFinite(rSquared) ? `${Math.round(rSquared * 100)}%` : "--";
}

function returnsForStatsPanel(bars, dailyReturns) {
  const returns = dailyReturns(bars);
  if (state.mode !== "session" && !["5m", "15m", "60m"].includes(requestedInterval())) return returns;
  return returns.map((point, index) => ({ ...point, date: index }));
}

async function renderStatsPanel() {
  const niftyBars = state.data.nifty || [];
  const spxBars = state.data.spx || [];
  if (niftyBars.length < 2 || spxBars.length < 2) {
    setLiveStatsValues();
    return;
  }

  try {
    statsModulePromise ||= import("./modules/stats.js");
    const { dailyReturns, rollingPearson, hitRate, olsRegression } = await statsModulePromise;
    const niftyReturns = returnsForStatsPanel(niftyBars, dailyReturns);
    const spxReturns = returnsForStatsPanel(spxBars, dailyReturns);
    const regression = olsRegression(spxReturns, niftyReturns);
    const hits = hitRate(spxReturns, niftyReturns);
    const windowSize = Math.min(30, niftyReturns.length, spxReturns.length);
    const rolling = windowSize >= 2 ? rollingPearson(spxReturns, niftyReturns, windowSize) : [];
    const latestCorrelation = rolling.at(-1)?.r ?? NaN;

    setLiveStatsValues({
      correlation: latestCorrelation,
      hitRate: hits.rate,
      beta: regression.beta,
      rSquared: regression.rSquared,
    });
  } catch (error) {
    console.error("Unable to render live stats panel", error);
    setLiveStatsValues();
  }
}

wireControls();
initializeEntranceMotion();
loadData();
