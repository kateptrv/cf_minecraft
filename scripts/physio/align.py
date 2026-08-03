"""
Clock alignment between the jsPsych browser session and the Mindware recording.

Behavioral CSV rows carry:
    epoch_start_ms / epoch_end_ms   — Date.now() at trial start/end (UTC ms)
    perf_start_ms  / perf_end_ms    — performance.now() equivalents (browser-local, monotonic)
    block_selected_epoch_ms         — Date.now() at block click commit (choice phase only)
    session_start_epoch_ms          — Date.now() at experiment launch (constant per session)

Mindware provides one anchor: `acquisition_start_epoch_ms` (UTC ms).
Signal time is expressed as seconds since acquisition start, so:

    physio_time_s = (jsPsych_epoch_ms - acquisition_start_epoch_ms) / 1000

Assumes both computers are on the same NTP-synced wall clock (typical lab setup).
Skew of <100 ms is expected and acceptable for EDA (slow signal) and epoch-level
ECG summaries. For beat-level analysis, prefer TTL/LSL.
"""

from __future__ import annotations
from datetime import datetime
from typing import Iterable
import pandas as pd


def mindware_absolute_to_epoch_ms(date_str: str, time_str: str,
                                   timezone: str = "America/Los_Angeles") -> int:
    """Convert a Mindware absolute-events row (Date, Time) into UTC epoch ms."""
    dt = pd.to_datetime(f"{date_str.strip()} {time_str.strip()}",
                        format="%m/%d/%Y %I:%M:%S.%f %p")
    dt = dt.tz_localize(timezone).tz_convert("UTC")
    return int(dt.value // 1_000_000)


def epoch_ms_to_physio_seconds(epoch_ms: pd.Series | int,
                                acquisition_start_epoch_ms: int) -> pd.Series | float:
    """Vectorized: UTC ms → seconds since Mindware Acquisition Start."""
    if isinstance(epoch_ms, pd.Series):
        return (epoch_ms - acquisition_start_epoch_ms) / 1000.0
    return (int(epoch_ms) - acquisition_start_epoch_ms) / 1000.0


# Columns in the behavioral CSV that carry absolute times, and the physio_*_s
# columns we add for each.
_TIME_COLUMNS = {
    "epoch_start_ms":           "physio_start_s",
    "epoch_end_ms":              "physio_end_s",
    "block_selected_epoch_ms":   "physio_block_selected_s",
    "session_start_epoch_ms":    "physio_session_start_s",
}


def align_behavioral_to_physio(behavioral: pd.DataFrame,
                                acquisition_start_epoch_ms: int) -> pd.DataFrame:
    """
    Add physio_*_s columns to a behavioral DataFrame. Non-destructive — returns a copy.
    """
    aligned = behavioral.copy()
    for src, dst in _TIME_COLUMNS.items():
        if src in aligned.columns:
            aligned[dst] = epoch_ms_to_physio_seconds(aligned[src], acquisition_start_epoch_ms)
    return aligned


def infer_clock_skew_ms(behavioral: pd.DataFrame,
                         acquisition_start_epoch_ms: int) -> dict:
    """
    Sanity check: how much does the behavioral session appear to start before
    or after Mindware acquisition? Returns a dict with skew diagnostics.
    Ideally the session_start_epoch_ms should be *after* acquisition_start
    (experimenter arms Mindware, then launches the task).
    """
    if "session_start_epoch_ms" not in behavioral.columns:
        return {"note": "no session_start_epoch_ms column found"}
    sess_start = int(behavioral["session_start_epoch_ms"].dropna().iloc[0])
    return {
        "session_start_epoch_ms": sess_start,
        "acquisition_start_epoch_ms": acquisition_start_epoch_ms,
        "session_after_acquisition_ms": sess_start - acquisition_start_epoch_ms,
        "session_after_acquisition_s":  (sess_start - acquisition_start_epoch_ms) / 1000.0,
    }
