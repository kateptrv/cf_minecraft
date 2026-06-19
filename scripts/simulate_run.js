/**
 * Simulate one participant's full run through index_minecraft_cf.html and
 * emit a CSV with the same schema jsPsych would save via DataPipe.
 *
 * Mirrors the trial-list and outcome-generation logic from
 * index_minecraft_cf.html. The simulated participant chooses randomly
 * (from the "consider" set on consider trials, otherwise from all tiles).
 *
 * Usage:  node scripts/simulate_run.js [seed] [out_path]
 */

const fs = require("fs");
const path = require("path");

/* -------- RNG (seedable) -------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = parseInt(process.argv[2] || "20260619", 10);
const OUT = process.argv[3] || path.join(__dirname, "..", "data", "example_session_simulated.csv");
const rng = mulberry32(SEED);
const rand = () => rng();
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function choice(arr) { return arr[Math.floor(rand() * arr.length)]; }
function jitterMs(min, max) { return Math.floor(min + rand() * (max - min)); }

/* -------- Task constants (mirror experiment file) -------- */
const GRID_COLS = 4, GRID_ROWS = 4, GRID_N = 16;
const NUMBERS = Array.from({ length: GRID_N }, (_, i) => i + 1);

const ORES = {
  coal: { value: 1 }, copper: { value: 2 }, iron: { value: 3 }, diamond: { value: 4 }
};

const BIOMES = {
  overworld: { cls: "biome-overworld" },
  cave:      { cls: "biome-cave" },
  deep:      { cls: "biome-deep" }
};

const ROW_OUTCOME_DISTS = {
  overworld: [
    { none: 0.60, coal: 0.28, copper: 0.08, iron: 0.03, diamond: 0.01 },
    { none: 0.52, coal: 0.26, copper: 0.12, iron: 0.07, diamond: 0.03 },
    { none: 0.44, coal: 0.22, copper: 0.14, iron: 0.12, diamond: 0.08 },
    { none: 0.34, coal: 0.16, copper: 0.16, iron: 0.16, diamond: 0.18 }
  ],
  cave: [
    { none: 0.52, coal: 0.20, copper: 0.14, iron: 0.09, diamond: 0.05 },
    { none: 0.44, coal: 0.16, copper: 0.16, iron: 0.14, diamond: 0.10 },
    { none: 0.36, coal: 0.12, copper: 0.16, iron: 0.18, diamond: 0.18 },
    { none: 0.28, coal: 0.08, copper: 0.14, iron: 0.22, diamond: 0.28 }
  ],
  deep: [
    { none: 0.42, coal: 0.10, copper: 0.16, iron: 0.18, diamond: 0.14 },
    { none: 0.36, coal: 0.08, copper: 0.14, iron: 0.20, diamond: 0.22 },
    { none: 0.30, coal: 0.06, copper: 0.12, iron: 0.20, diamond: 0.32 },
    { none: 0.24, coal: 0.04, copper: 0.10, iron: 0.20, diamond: 0.42 }
  ]
};
const CREEPER_RATE = 0;  // creepers disabled in the live task

const FEEDBACK_TYPES = ["full", "partial"];
const SALIENCE_COUNTS = { none: 0, little: 2, a_lot: 8 };
const COMPARISON_TYPES = ["good_to_bad", "bad_to_good"];
const TARGET_TOTAL_TRIALS = 66;

const BIOME_CUE_MS = 3000;
const PRE_ITI_MIN_MS = 4000, PRE_ITI_MAX_MS = 5000;
const ANTICIPATION_MS = 2000;
const COUNTERFACTUAL_MS = 5000;
const POST_ITI_MIN_MS = 4000, POST_ITI_MAX_MS = 5000;

/* -------- Grid helpers -------- */
function blockRC(n) { return { row: Math.floor((n - 1) / GRID_COLS), col: (n - 1) % GRID_COLS }; }
function neighborsOf(n) {
  const { row, col } = blockRC(n);
  const out = [];
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) out.push(r * GRID_COLS + c + 1);
  });
  return out;
}
function areAdjacent(a, b) { return neighborsOf(a).includes(b); }

/* -------- Outcome generation (mirror) -------- */
function payoutForContent(content) {
  if (!content) return 0;
  const kind = typeof content === "string" ? content : content.kind;
  if (ORES[kind]) return ORES[kind].value;
  if (kind === "creeper") {
    const sev = (typeof content === "object" && content.severity) ? content.severity : 1;
    return -sev;
  }
  return 0;
}
function sampleFromProbMap(probMap) {
  const r = rand();
  let acc = 0;
  const entries = Object.entries(probMap);
  for (const [k, p] of entries) { acc += p; if (r < acc) return k; }
  return entries[entries.length - 1][0];
}
function sampleCreeperSeverity() { return 1 + Math.floor(rand() * 4); }
function sampleRowContent(biome, rowIdx) {
  if (rand() < CREEPER_RATE) return { kind: "creeper", severity: sampleCreeperSeverity() };
  return { kind: sampleFromProbMap(ROW_OUTCOME_DISTS[biome][rowIdx]) };
}
function generateBoardForTrial(cell) {
  const map = {};
  NUMBERS.forEach((n) => { map[n] = sampleRowContent(cell.biome, blockRC(n).row); });
  return map;
}
function allRevealedBetter(chosen, map, revealed) {
  const cp = payoutForContent(map[chosen]);
  return revealed.every((n) => payoutForContent(map[n]) > cp);
}
function allRevealedWorse(chosen, map, revealed) {
  const cp = payoutForContent(map[chosen]);
  return revealed.every((n) => payoutForContent(map[n]) < cp);
}
function generateBoardWithDirectionalCounterfactuals(cell, chosen, revealed, preferredLabel) {
  if (!revealed || revealed.length === 0) {
    return { map: generateBoardForTrial(cell), comparisonLabel: null };
  }
  const preferred = preferredLabel || choice(COMPARISON_TYPES);
  const fallback = preferred === "bad_to_good" ? "good_to_bad" : "bad_to_good";
  const tryGen = (label, maxTries) => {
    for (let i = 0; i < maxTries; i++) {
      const map = generateBoardForTrial(cell);
      revealed.forEach((n) => { if (map[n] && map[n].kind === "creeper") map[n] = { kind: "none" }; });
      const ok = label === "bad_to_good" ? allRevealedBetter(chosen, map, revealed) : allRevealedWorse(chosen, map, revealed);
      if (ok) return { map, comparisonLabel: label };
    }
    return null;
  };
  return tryGen(preferred, 800) || tryGen(fallback, 800) ||
         { map: generateBoardForTrial(cell), comparisonLabel: null };
}
function deriveRevealedMetrics(chosen, map, revealed) {
  if (!revealed || revealed.length === 0) {
    return { focalCfBlock: null, focalCfContent: null, focalCfPayout: null, cfMaxDiff: null, cfBestAltValue: null, cfComparisonLabel: null };
  }
  const cp = payoutForContent(map[chosen]);
  const focal = revealed.slice().sort((a, b) => payoutForContent(map[b]) - payoutForContent(map[a]))[0];
  const fc = map[focal], fp = payoutForContent(fc);
  const diff = fp - cp;
  return {
    focalCfBlock: focal, focalCfContent: fc, focalCfPayout: fp,
    cfMaxDiff: diff, cfBestAltValue: fp,
    cfComparisonLabel: diff < 0 ? "good_to_bad" : diff === 0 ? "same" : "bad_to_good"
  };
}

/* -------- Trial list (mirror buildTrialList) -------- */
function buildTrialList() {
  const baseCells = [];
  Object.keys(BIOMES).forEach((biome) => {
    FEEDBACK_TYPES.forEach((feedback) => {
      baseCells.push({ biome, feedback, salience: "none", salience_mode: null, comparison_type: null, forced_creeper_trial: false });
      ["little", "a_lot"].forEach((salience) => {
        baseCells.push({ biome, feedback, salience, salience_mode: "consider", comparison_type: null, forced_creeper_trial: false });
      });
    });
  });
  let cells = [];
  for (let r = 0; r < 4; r++) cells = cells.concat(baseCells.map((c) => ({ ...c })));
  const salienceLevels = ["none", "little", "a_lot"];
  Object.keys(BIOMES).forEach((biome) => {
    FEEDBACK_TYPES.forEach((feedback) => {
      const target = choice(salienceLevels);
      const idx = cells.findIndex((c) => c.biome === biome && c.feedback === feedback && c.salience === target);
      if (idx !== -1) cells.splice(idx, 1);
    });
  });

  // Pre-assign comparison_type: 12 full-feedback consider trials marked
  // "good_to_bad" (chosen better than all revealed CFs), rest "bad_to_good".
  const directionalIdxs = cells
    .map((c, i) => (c.feedback === "full" && c.salience !== "none") ? i : -1)
    .filter((i) => i >= 0);
  const shuffledDirectional = shuffle(directionalIdxs);
  const NUM_GOOD_TO_BAD = Math.min(12, shuffledDirectional.length);
  shuffledDirectional.forEach((idx, j) => {
    cells[idx].comparison_type = j < NUM_GOOD_TO_BAD ? "good_to_bad" : "bad_to_good";
  });

  return shuffle(cells);
}

/* -------- Simulated participant -------- */
function pickConsiderSet(n) {
  // pick n random tiles
  return shuffle(NUMBERS).slice(0, n).sort((a, b) => a - b);
}
function pickChoice(considerSet) {
  // if considered, choose from considered (most participants commit to their shortlist);
  // otherwise pick uniformly from all 16 tiles
  if (considerSet && considerSet.length > 0) return choice(considerSet);
  return choice(NUMBERS);
}
function simulateRegretRating(cfMaxDiff, outcomeKind) {
  // higher regret when there was a clearly better alternative or when chosen tile was bad
  const base = 30;
  const cfPush = cfMaxDiff != null ? Math.max(0, cfMaxDiff) * 12 : 0;
  const creeperPush = outcomeKind === "creeper" ? 25 : 0;
  const emptyPush = outcomeKind === "none" ? 8 : 0;
  const noise = (rand() - 0.5) * 20;
  return Math.max(0, Math.min(100, Math.round(base + cfPush + creeperPush + emptyPush + noise)));
}

/* -------- CSV builder -------- */
const COLUMNS = [
  "trial_type", "trial_index", "time_elapsed", "internal_node_id", "rt",
  "phase", "biome", "feedback", "salience", "salience_mode", "salience_count",
  "comparison_type", "forced_creeper_trial", "choice", "choice_rt",
  "salience_set", "highlight_pattern", "consider_set", "consider_target_n", "consider_toggles",
  "outcome_kind", "outcome_payout", "creeper_severity",
  "focal_cf_block", "focal_cf_kind", "focal_cf_payout", "cf_max_diff", "cf_best_alt_value",
  "best_alt_block", "best_alt_kind", "best_alt_payout", "best_alt_adjacent", "n_adjacent_highvalue",
  "revealed_blocks", "regret_revealed_blocks", "wallet_after",
  "response",
  "participant_id", "prolific_pid", "prolific_study_id", "prolific_session_id", "date_iso",
  "tally_by_biome", "tally_by_feedback", "tally_by_salience", "tally_by_salience_mode",
  "tally_by_comparison_type", "tally_total"
];

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* -------- Run -------- */
const rows = [];
let timeMs = 0;
let trialIdxJs = 0;
let walletXP = 0;

const PARTICIPANT = {
  participant_id: "SIM-001",
  prolific_pid: "SIM-001",
  prolific_study_id: "SIM-STUDY",
  prolific_session_id: `SIM-SESS-${SEED}`,
  date_iso: new Date().toISOString()
};

const trialList = buildTrialList();

// quick tally for the addProperties columns
const tally = { biome: {}, feedback: {}, salience: {}, salience_mode: {}, comparison_type: {} };
trialList.forEach((c) => {
  tally.biome[c.biome] = (tally.biome[c.biome] || 0) + 1;
  tally.feedback[c.feedback] = (tally.feedback[c.feedback] || 0) + 1;
  tally.salience[c.salience] = (tally.salience[c.salience] || 0) + 1;
  tally.salience_mode[c.salience_mode || "n/a"] = (tally.salience_mode[c.salience_mode || "n/a"] || 0) + 1;
  tally.comparison_type[c.comparison_type || "n/a"] = (tally.comparison_type[c.comparison_type || "n/a"] || 0) + 1;
});
const TALLY_COLS = {
  tally_by_biome: JSON.stringify(tally.biome),
  tally_by_feedback: JSON.stringify(tally.feedback),
  tally_by_salience: JSON.stringify(tally.salience),
  tally_by_salience_mode: JSON.stringify(tally.salience_mode),
  tally_by_comparison_type: JSON.stringify(tally.comparison_type),
  tally_total: trialList.length
};

function pushRow(extra) {
  const r = { ...PARTICIPANT, ...TALLY_COLS, trial_index_jspsych: trialIdxJs, time_elapsed: timeMs, internal_node_id: `0.0-${trialIdxJs}.0`, ...extra };
  rows.push(r);
  trialIdxJs += 1;
}

for (let idx = 0; idx < trialList.length; idx++) {
  const cell = trialList[idx];
  const salienceCount = SALIENCE_COUNTS[cell.salience] || 0;

  // 1) Biome cue
  timeMs += BIOME_CUE_MS;
  pushRow({
    trial_type: "html-keyboard-response", rt: null,
    phase: "biome_cue", trial_index: idx,
    biome: cell.biome, feedback: cell.feedback, salience: cell.salience,
    salience_mode: cell.salience_mode, salience_count: salienceCount,
    forced_creeper_trial: false
  });

  // 2) Pre-ITI
  const preItiMs = jitterMs(PRE_ITI_MIN_MS, PRE_ITI_MAX_MS);
  timeMs += preItiMs;
  pushRow({
    trial_type: "html-keyboard-response", rt: null,
    phase: "pre_iti", trial_index: idx
  });

  // 3) Choice (consider mode: pick N then commit)
  let considerSet = [];
  let considerToggles = [];
  let considerTargetN = null;
  if (salienceCount > 0 && cell.salience_mode === "consider") {
    considerTargetN = salienceCount;
    considerSet = pickConsiderSet(salienceCount);
    considerToggles = considerSet.map((n) => ({ block: n, ts_ms: Math.round(rand() * 4000), action: "add" }));
  }
  const choiceBlock = pickChoice(considerSet);
  const choiceRt = Math.round(800 + rand() * 2200 + (salienceCount > 0 ? 1500 + rand() * 2000 : 0));
  timeMs += choiceRt;
  pushRow({
    trial_type: "html-keyboard-response", rt: choiceRt,
    phase: "choice", trial_index: idx,
    biome: cell.biome, feedback: cell.feedback,
    salience: cell.salience, salience_mode: cell.salience_mode, salience_count: salienceCount,
    comparison_type: cell.comparison_type, forced_creeper_trial: false,
    choice: choiceBlock, choice_rt: choiceRt,
    salience_set: [], highlight_pattern: null,
    consider_set: considerSet, consider_target_n: considerTargetN, consider_toggles: considerToggles
  });

  // 4) Anticipation — generate outcome_map
  const considerRevealedPool = considerSet.filter((n) => n !== choiceBlock);
  const isDirectional = cell.feedback === "full" && considerRevealedPool.length > 0;
  let board, cfLabel = null;
  if (isDirectional) {
    const gen = generateBoardWithDirectionalCounterfactuals(cell, choiceBlock, considerRevealedPool, cell.comparison_type);
    board = gen.map; cfLabel = gen.comparisonLabel;
  } else {
    board = generateBoardForTrial(cell);
  }
  const outcomeContent = board[choiceBlock];
  const outcomeKind = outcomeContent.kind;
  const outcomePayout = payoutForContent(outcomeContent);
  const revealedPool = cell.feedback === "full" ? considerRevealedPool : [];
  const m = deriveRevealedMetrics(choiceBlock, board, revealedPool);
  // best-alt across whole board
  const alts = NUMBERS.filter((n) => n !== choiceBlock);
  const sortedAlts = alts.slice().sort((a, b) => payoutForContent(board[b]) - payoutForContent(board[a]));
  const bestAltBlock = sortedAlts[0];
  const bestAltContent = board[bestAltBlock];
  const bestAltPayout = payoutForContent(bestAltContent);
  const bestAltAdjacent = areAdjacent(choiceBlock, bestAltBlock);
  const chosenVal = outcomePayout;
  const nAdjHigh = neighborsOf(choiceBlock).filter((n) => payoutForContent(board[n]) > chosenVal).length;
  timeMs += ANTICIPATION_MS;
  pushRow({
    trial_type: "html-keyboard-response", rt: null,
    phase: "anticipation", trial_index: idx
  });

  // 5) Outcome reveal
  walletXP += outcomePayout;
  const outcomeViewRt = Math.round(1500 + rand() * 1500);
  timeMs += outcomeViewRt;
  pushRow({
    trial_type: "html-keyboard-response", rt: outcomeViewRt,
    phase: "outcome", trial_index: idx,
    biome: cell.biome, feedback: cell.feedback,
    salience: cell.salience, salience_mode: cell.salience_mode, salience_count: salienceCount,
    comparison_type: cfLabel || cell.comparison_type, forced_creeper_trial: false,
    choice: choiceBlock,
    outcome_kind: outcomeKind, outcome_payout: outcomePayout,
    creeper_severity: outcomeContent.severity || null,
    focal_cf_block: m.focalCfBlock, focal_cf_kind: m.focalCfContent ? m.focalCfContent.kind : null,
    focal_cf_payout: m.focalCfPayout, cf_max_diff: m.cfMaxDiff, cf_best_alt_value: m.cfBestAltValue,
    best_alt_block: bestAltBlock, best_alt_kind: bestAltContent.kind, best_alt_payout: bestAltPayout,
    best_alt_adjacent: bestAltAdjacent, n_adjacent_highvalue: nAdjHigh,
    highlight_pattern: null, consider_target_n: considerTargetN, wallet_after: walletXP
  });

  // 6) Counterfactual feedback
  const revealedBlocks = cell.feedback === "full" ? considerRevealedPool : [];
  timeMs += COUNTERFACTUAL_MS;
  pushRow({
    trial_type: "html-keyboard-response", rt: null,
    phase: "counterfactual_feedback", trial_index: idx,
    biome: cell.biome, feedback: cell.feedback,
    salience: cell.salience, salience_mode: cell.salience_mode, salience_count: salienceCount,
    comparison_type: cfLabel || cell.comparison_type, forced_creeper_trial: false,
    revealed_blocks: revealedBlocks,
    focal_cf_block: m.focalCfBlock, focal_cf_kind: m.focalCfContent ? m.focalCfContent.kind : null,
    focal_cf_payout: m.focalCfPayout, cf_max_diff: m.cfMaxDiff, cf_best_alt_value: m.cfBestAltValue,
    best_alt_block: bestAltBlock, best_alt_kind: bestAltContent.kind, best_alt_payout: bestAltPayout,
    best_alt_adjacent: bestAltAdjacent, n_adjacent_highvalue: nAdjHigh,
    highlight_pattern: null, consider_target_n: considerTargetN
  });

  // 7) Regret probe
  const regret = simulateRegretRating(m.cfMaxDiff, outcomeKind);
  const regretRt = Math.round(2500 + rand() * 2000);
  timeMs += regretRt;
  pushRow({
    trial_type: "survey-html-form", rt: regretRt,
    phase: "regret_probes", trial_index: idx,
    biome: cell.biome, feedback: cell.feedback,
    salience: cell.salience, salience_mode: cell.salience_mode, salience_count: salienceCount,
    comparison_type: cfLabel || cell.comparison_type, forced_creeper_trial: false,
    choice: choiceBlock,
    outcome_kind: outcomeKind, outcome_payout: outcomePayout,
    creeper_severity: outcomeContent.severity || null,
    focal_cf_block: m.focalCfBlock, focal_cf_kind: m.focalCfContent ? m.focalCfContent.kind : null,
    focal_cf_payout: m.focalCfPayout, cf_max_diff: m.cfMaxDiff, cf_best_alt_value: m.cfBestAltValue,
    best_alt_block: bestAltBlock, best_alt_kind: bestAltContent.kind, best_alt_payout: bestAltPayout,
    best_alt_adjacent: bestAltAdjacent, n_adjacent_highvalue: nAdjHigh,
    highlight_pattern: null, consider_target_n: considerTargetN,
    regret_revealed_blocks: revealedBlocks, wallet_after: walletXP,
    response: JSON.stringify({ regret_chosen: regret })
  });

  // 8) Post-ITI
  const postItiMs = jitterMs(POST_ITI_MIN_MS, POST_ITI_MAX_MS);
  timeMs += postItiMs;
  pushRow({
    trial_type: "html-keyboard-response", rt: null,
    phase: "post_iti", trial_index: idx
  });
}

/* -------- Write CSV -------- */
const header = COLUMNS.join(",");
const body = rows.map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(",")).join("\n");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + "\n" + body + "\n");

console.log(`wrote ${rows.length} rows across ${trialList.length} trials → ${OUT}`);
console.log(`final wallet XP: ${walletXP}`);
console.log(`tally biome:    ${JSON.stringify(tally.biome)}`);
console.log(`tally feedback: ${JSON.stringify(tally.feedback)}`);
console.log(`tally salience: ${JSON.stringify(tally.salience)}`);
