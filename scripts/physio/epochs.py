"""
Extract ECG/EDA epochs from the continuous Mindware signal, one per
(behavioral phase × trial). Returns long-form DataFrames that can be
summarized or plotted directly.
"""

from __future__ import annotations
from typing import Iterable
import numpy as np
import pandas as pd


# Which behavioral CSV rows we want epochs for. Keys are trial-data `phase`
# values; values are (start_col, end_col) — the physio_*_s columns produced
# by align_behavioral_to_physio.
PHASE_MARKERS = {
    "biome_cue":               ("physio_start_s", "physio_end_s"),
    "choice":                  ("physio_start_s", "physio_end_s"),
    "anticipation":            ("physio_start_s", "physio_end_s"),
    "outcome":                 ("physio_start_s", "physio_end_s"),
    "counterfactual_feedback": ("physio_start_s", "physio_end_s"),
    "regret_probes":           ("physio_start_s", "physio_end_s"),
    "post_iti":                ("physio_start_s", "physio_end_s"),
}


def _slice_signal(signal: pd.DataFrame, start_s: float, end_s: float) -> pd.DataFrame:
    """Fast [start_s, end_s) slice by binary search on time_s."""
    t = signal["time_s"].values
    i0 = int(np.searchsorted(t, start_s, side="left"))
    i1 = int(np.searchsorted(t, end_s,   side="left"))
    return signal.iloc[i0:i1]


def extract_epochs(signal: pd.DataFrame,
                   aligned_behavioral: pd.DataFrame,
                   phases: Iterable[str] | None = None,
                   pre_s: float = 0.0,
                   post_s: float = 0.0) -> pd.DataFrame:
    """
    Slice `signal` (continuous physio) into per-trial per-phase epochs.

    Returns long-form:
        trial_index, phase, sample_index, time_s (relative to epoch start),
        ECG, GSC, biome, feedback, salience, ...
    Plus any behavioral columns joined through.

    Parameters
    ----------
    signal : DataFrame with columns time_s, ECG, GSC.
    aligned_behavioral : behavioral CSV after align_behavioral_to_physio().
    phases : optional filter — e.g. ["choice", "outcome"]. Defaults to all keys in PHASE_MARKERS.
    pre_s, post_s : optionally extend the window by this many seconds on either side
                    (useful for baseline correction).
    """
    if phases is None:
        phases = list(PHASE_MARKERS.keys())

    keep_meta = [c for c in ("participant_id", "trial_index", "biome", "feedback",
                             "salience", "salience_mode", "salience_count",
                             "comparison_type", "choice", "outcome_kind",
                             "outcome_payout", "cf_max_diff", "best_alt_payout",
                             "consider_target_n")
                 if c in aligned_behavioral.columns]

    out = []
    for phase in phases:
        start_col, end_col = PHASE_MARKERS[phase]
        rows = aligned_behavioral[
            (aligned_behavioral["phase"] == phase)
            & aligned_behavioral[start_col].notna()
            & aligned_behavioral[end_col].notna()
        ]
        for _, r in rows.iterrows():
            s = float(r[start_col]) - pre_s
            e = float(r[end_col])   + post_s
            if e <= s:
                continue
            seg = _slice_signal(signal, s, e).copy()
            if len(seg) == 0:
                continue
            seg["phase"] = phase
            seg["trial_index"] = r.get("trial_index")
            seg["time_from_epoch_s"] = seg["time_s"].values - s - pre_s
            for c in keep_meta:
                seg[c] = r[c]
            out.append(seg)

    if not out:
        return pd.DataFrame(columns=["time_s", "ECG", "GSC", "phase", "trial_index"])
    return pd.concat(out, ignore_index=True)
