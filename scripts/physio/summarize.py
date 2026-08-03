"""
Per-epoch summary statistics for EDA (GSC) and ECG.

Kept intentionally lightweight — mean/min/max/range/AUC for EDA; peak-based
mean HR + SDNN for ECG. Swap in neurokit2 later for anything more careful.
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks


def _bandpass(x: np.ndarray, low: float, high: float, fs: float, order: int = 3) -> np.ndarray:
    """Zero-phase Butterworth bandpass. Returns x unchanged if too short."""
    if len(x) < 3 * order + 1:
        return x
    nyq = 0.5 * fs
    b, a = butter(order, [low / nyq, high / nyq], btype="band")
    return filtfilt(b, a, x)


def summarize_eda(gsc: np.ndarray, fs: float) -> dict:
    """Basic EDA summary: level + reactivity."""
    if len(gsc) == 0 or np.all(np.isnan(gsc)):
        return {"eda_mean": np.nan, "eda_min": np.nan, "eda_max": np.nan,
                "eda_range": np.nan, "eda_auc": np.nan, "eda_slope": np.nan}
    mn, mx = float(np.min(gsc)), float(np.max(gsc))
    duration_s = len(gsc) / fs
    # Simple linear trend as a proxy for tonic drift within the epoch
    if len(gsc) >= 3:
        t = np.arange(len(gsc)) / fs
        slope = float(np.polyfit(t, gsc, 1)[0])   # units: GSC/second
    else:
        slope = np.nan
    return {
        "eda_mean":  float(np.mean(gsc)),
        "eda_min":   mn,
        "eda_max":   mx,
        "eda_range": mx - mn,
        "eda_auc":   float(np.trapezoid(gsc, dx=1.0 / fs)),   # ≈ area under curve
        "eda_slope": slope,
    }


def summarize_ecg(ecg: np.ndarray, fs: float) -> dict:
    """
    ECG summary via naive R-peak detection on a 5–15 Hz bandpassed signal.
    Returns mean HR (bpm), SDNN (ms), and beat count. NaN if the epoch is too
    short to reliably estimate HR (< 5 seconds).
    """
    duration_s = len(ecg) / fs
    if duration_s < 5 or np.all(np.isnan(ecg)):
        return {"ecg_hr_bpm": np.nan, "ecg_sdnn_ms": np.nan, "ecg_beat_count": 0}

    filt = _bandpass(ecg, low=5.0, high=15.0, fs=fs)
    # Distance ≥ 300 ms (~200 bpm max), height = mean + 0.5*std of the abs signal
    min_distance = int(0.30 * fs)
    height = np.mean(np.abs(filt)) + 0.5 * np.std(np.abs(filt))
    peaks, _ = find_peaks(filt, distance=min_distance, height=height)

    if len(peaks) < 2:
        return {"ecg_hr_bpm": np.nan, "ecg_sdnn_ms": np.nan, "ecg_beat_count": int(len(peaks))}

    ibis_s = np.diff(peaks) / fs
    hr = 60.0 / np.mean(ibis_s)
    sdnn = 1000.0 * np.std(ibis_s, ddof=1) if len(ibis_s) > 1 else np.nan
    return {"ecg_hr_bpm": float(hr), "ecg_sdnn_ms": float(sdnn), "ecg_beat_count": int(len(peaks))}


def summarize_epochs(epoched: pd.DataFrame, fs: float | None = None) -> pd.DataFrame:
    """
    Collapse a long-form epoch DataFrame (from extract_epochs) into one row per
    (trial_index × phase) with EDA + ECG summary columns.
    """
    if len(epoched) == 0:
        return pd.DataFrame()
    if fs is None:
        # Infer from mean sample spacing
        dt = np.median(np.diff(epoched.sort_values("time_s")["time_s"].values[:1000]))
        fs = 1.0 / dt if dt > 0 else 1000.0

    meta_cols = [c for c in epoched.columns
                 if c not in ("time_s", "ECG", "GSC", "time_from_epoch_s")]
    grouped = epoched.groupby(["trial_index", "phase"], sort=False)

    rows = []
    for (trial_idx, phase), g in grouped:
        eda = summarize_eda(g["GSC"].values, fs) if "GSC" in g else {}
        ecg = summarize_ecg(g["ECG"].values, fs) if "ECG" in g else {}
        first = g.iloc[0]
        row = {c: first[c] for c in meta_cols}
        row["duration_s"] = len(g) / fs
        row["n_samples"] = len(g)
        row.update(eda)
        row.update(ecg)
        rows.append(row)

    return pd.DataFrame(rows).sort_values(["trial_index", "phase"]).reset_index(drop=True)

