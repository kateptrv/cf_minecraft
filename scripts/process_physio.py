#!/usr/bin/env python3
"""
Process one participant's physio session end-to-end.

    python scripts/process_physio.py --participant 905
    python scripts/process_physio.py --participant 905 --behavioral data/beh_905.csv
    python scripts/process_physio.py --session-dir data/physio/20260716_905 \\
        --behavioral data/cf_minecraft_pid-905_....csv \\
        --out data/physio_processed/905_epoch_summary.csv

Emits (default `out` is `<physio_dir>/<pid>_epoch_summary.csv`):
    trial_index, phase, biome, feedback, salience, salience_count,
    duration_s, n_samples,
    eda_mean, eda_min, eda_max, eda_range, eda_auc, eda_slope,
    ecg_hr_bpm, ecg_sdnn_ms, ecg_beat_count
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path
import pandas as pd

# Ensure this script can be run from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from physio import (
    load_participant,
    align_behavioral_to_physio,
    extract_epochs,
    summarize_epochs,
)
from physio.align import infer_clock_skew_ms


REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "data"


def _find_session_dir(pid: str) -> Path:
    """Find the physio session dir for a participant, matching '*_{pid}'."""
    root = DATA / "physio"
    candidates = [p for p in root.iterdir() if p.is_dir() and p.name.endswith(f"_{pid}")]
    if not candidates:
        raise FileNotFoundError(
            f"No physio session dir under {root} matching '*_{pid}'. Available: "
            + ", ".join(p.name for p in root.iterdir() if p.is_dir())
        )
    if len(candidates) > 1:
        print(f"[warn] multiple sessions found for pid={pid}; using {candidates[0].name}")
    return candidates[0]


def _find_behavioral_csv(pid: str) -> Path | None:
    """Find a DataPipe-style behavioral CSV for this pid, if any."""
    matches = sorted(DATA.glob(f"cf_minecraft_pid-*{pid}*.csv"))
    if not matches:
        matches = sorted(DATA.glob(f"*{pid}*.csv"))
    return matches[-1] if matches else None   # latest by name


def main() -> int:
    ap = argparse.ArgumentParser(description="Compute per-epoch EDA/ECG summaries for one participant.")
    ap.add_argument("--participant", "-p", help="Participant ID (e.g. 905). Auto-discovers files.")
    ap.add_argument("--session-dir", help="Explicit path to the Mindware session dir.")
    ap.add_argument("--behavioral", help="Explicit path to the behavioral CSV.")
    ap.add_argument("--out", help="Output path for the epoch-summary CSV.")
    ap.add_argument("--timezone", default="America/Los_Angeles",
                    help="Local tz of the recording machine (Mindware writes wall-clock times).")
    ap.add_argument("--phases", nargs="+", default=None,
                    help="Which phases to summarize. Default: all.")
    args = ap.parse_args()

    # ---- Locate inputs ----
    if args.session_dir:
        session_dir = Path(args.session_dir)
    elif args.participant:
        session_dir = _find_session_dir(args.participant)
    else:
        ap.error("must pass --participant or --session-dir")

    if args.behavioral:
        beh_csv = Path(args.behavioral)
    elif args.participant:
        beh_csv = _find_behavioral_csv(args.participant)
        if beh_csv is None:
            ap.error(f"could not auto-locate behavioral CSV for pid={args.participant}; "
                     "pass --behavioral")
    else:
        ap.error("must pass --behavioral or --participant")

    print(f"[info] session dir      : {session_dir}")
    print(f"[info] behavioral CSV   : {beh_csv}")

    # ---- Load ----
    pkt = load_participant(session_dir, timezone=args.timezone)
    print(f"[info] sample rate      : {pkt.sample_rate_hz:.1f} Hz")
    print(f"[info] signal duration  : {pkt.signal['time_s'].iloc[-1]:.1f} s ({len(pkt.signal):,} samples)")
    print(f"[info] acq start (UTC)  : {pkt.acquisition_start_epoch_ms} ms")

    beh = pd.read_csv(beh_csv)
    print(f"[info] behavioral rows  : {len(beh):,}")

    # ---- Align ----
    aligned = align_behavioral_to_physio(beh, pkt.acquisition_start_epoch_ms)
    skew = infer_clock_skew_ms(aligned, pkt.acquisition_start_epoch_ms)
    if "session_after_acquisition_s" in skew:
        offset = skew["session_after_acquisition_s"]
        print(f"[info] session began    : {offset:+.2f} s after acquisition start")
        if offset < 0:
            print("[warn] session started BEFORE acquisition — physio missing early trials.")

    # ---- Epoch + summarize ----
    epoched = extract_epochs(pkt.signal, aligned, phases=args.phases)
    print(f"[info] epoched samples  : {len(epoched):,}  ({epoched['phase'].value_counts().to_dict()})")

    summary = summarize_epochs(epoched, fs=pkt.sample_rate_hz)

    # ---- Write ----
    if args.out:
        out_path = Path(args.out)
    else:
        out_path = DATA / "physio_processed" / f"{pkt.participant_id}_epoch_summary.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    summary.to_csv(out_path, index=False)
    print(f"[ok]  wrote {len(summary):,} rows → {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
