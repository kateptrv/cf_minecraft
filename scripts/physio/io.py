"""
Loaders for Mindware BioLab exports.

Continuous data file format (tab-separated):
    Sample Rate:\t1000.000000
    Time (s)\tECG\tGSC
    0.000000\t0.000466\t0.000000
    ...

Events file format (absolute):
    Event Type\tName\tDate\tTime
    Acquisition PC:BioLab\tAcquisition Start\t07/16/2026\t04:49:22.195 PM
"""

from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import re
import numpy as np
import pandas as pd


@dataclass
class PhysioPacket:
    """Everything we need to align and epoch one participant's physio session."""
    participant_id: str
    session_dir: Path
    sample_rate_hz: float
    signal: pd.DataFrame                  # columns: time_s, ECG, GSC
    events: pd.DataFrame                  # from events_absolute.txt
    acquisition_start_epoch_ms: int       # UTC ms — anchor for behavioral alignment


def _parse_sample_rate(header: str) -> float:
    m = re.search(r"Sample Rate:\s*([0-9.]+)", header)
    if not m:
        raise ValueError(f"Could not find 'Sample Rate' in {header!r}")
    return float(m.group(1))


def load_signal(path: str | Path) -> tuple[pd.DataFrame, float]:
    """Load a Mindware _data.txt file. Returns (df, sample_rate_hz)."""
    path = Path(path)
    with open(path, "r") as f:
        header = f.readline()
        sample_rate = _parse_sample_rate(header)
    df = pd.read_csv(path, sep="\t", skiprows=1)
    # Normalize column names
    df.columns = [c.strip() for c in df.columns]
    rename = {}
    for c in df.columns:
        cl = c.lower()
        if cl.startswith("time"):
            rename[c] = "time_s"
        elif cl == "gsc" or "gsc" in cl or "eda" in cl:
            rename[c] = "GSC"
        elif cl == "ecg" or "ecg" in cl:
            rename[c] = "ECG"
    df = df.rename(columns=rename)
    required = {"time_s"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Signal file missing columns {missing}; got {list(df.columns)}")
    return df, sample_rate


def load_events_absolute(path: str | Path, timezone: str = "America/Los_Angeles") -> pd.DataFrame:
    """
    Load a Mindware _events_absolute.txt file and add a `epoch_ms` column
    (UTC milliseconds since 1970). The Mindware timestamps are wall-clock in the
    local timezone of the recording machine.
    """
    path = Path(path)
    df = pd.read_csv(path, sep="\t")
    df.columns = [c.strip() for c in df.columns]

    # Combine Date + Time into a single string, parse in local tz, convert to UTC ms.
    dt_str = df["Date"].str.strip() + " " + df["Time"].str.strip()
    # Mindware format: MM/DD/YYYY hh:MM:SS.fff AM/PM
    parsed = pd.to_datetime(dt_str, format="%m/%d/%Y %I:%M:%S.%f %p", errors="coerce")
    if parsed.isna().all():
        # Fall back to a permissive parse if the format shifts
        parsed = pd.to_datetime(dt_str, errors="coerce")
    parsed = parsed.dt.tz_localize(timezone).dt.tz_convert("UTC")
    df["epoch_ms"] = (parsed.astype("int64") // 1_000_000).astype("int64")
    return df


def find_acquisition_start_epoch_ms(events: pd.DataFrame) -> int:
    """Pull the 'Acquisition Start' event's absolute epoch (UTC ms)."""
    hits = events[events["Name"].str.strip().str.lower() == "acquisition start"]
    if len(hits) == 0:
        raise ValueError("No 'Acquisition Start' event found in events file.")
    return int(hits["epoch_ms"].iloc[0])


def _discover_session_files(session_dir: Path) -> dict:
    """Locate the three canonical Mindware files by suffix, permissive on prefix."""
    session_dir = Path(session_dir)
    files = list(session_dir.iterdir())
    def find(suffix):
        matches = [p for p in files if p.name.endswith(suffix)]
        if not matches:
            raise FileNotFoundError(f"No file ending in '{suffix}' in {session_dir}")
        return matches[0]
    return {
        "data":            find("_data.txt"),
        "events_absolute": find("_events_absolute.txt"),
    }


def load_participant(session_dir: str | Path, timezone: str = "America/Los_Angeles") -> PhysioPacket:
    """
    Load one participant's Mindware session. `session_dir` is like
    'data/physio/20260716_905'. Returns a PhysioPacket ready for alignment.
    """
    session_dir = Path(session_dir)
    files = _discover_session_files(session_dir)
    signal, sample_rate = load_signal(files["data"])
    events = load_events_absolute(files["events_absolute"], timezone=timezone)
    acq_start_ms = find_acquisition_start_epoch_ms(events)

    # Infer participant_id from folder name: expect '{YYYYMMDD}_{pid}'
    stem = session_dir.name
    m = re.match(r"(\d{8})_(.+)", stem)
    pid = m.group(2) if m else stem

    return PhysioPacket(
        participant_id=pid,
        session_dir=session_dir,
        sample_rate_hz=sample_rate,
        signal=signal,
        events=events,
        acquisition_start_epoch_ms=acq_start_ms,
    )
