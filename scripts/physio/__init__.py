"""
Physio processing for the Minecraft counterfactual task.

Expected folder layout:
    data/physio/{YYYYMMDD}_{participant_id}/
        {YYYYMMDD}_{participant_id}_data.txt              # 1000 Hz Mindware continuous data
        {YYYYMMDD}_{participant_id}_events_absolute.txt   # Mindware events with absolute Date + Time
        {YYYYMMDD}_{participant_id}_events_relative.txt   # (optional) same events in seconds

Typical usage:
    from physio.io import load_participant
    from physio.align import align_behavioral_to_physio
    from physio.epochs import extract_epochs
    from physio.summarize import summarize_epochs

    pkt = load_participant("data/physio/20260716_905")
    beh = pd.read_csv("data/cf_minecraft_pid-905_...csv")
    aligned = align_behavioral_to_physio(beh, pkt.acquisition_start_epoch_ms)
    epochs = extract_epochs(pkt.signal, aligned, phases=["choice","outcome","cf","regret","teleport"])
    summary = summarize_epochs(epochs)

or, from the CLI:
    python scripts/process_physio.py --participant 905
"""

from .io import load_participant, PhysioPacket
from .align import align_behavioral_to_physio, mindware_absolute_to_epoch_ms
from .epochs import extract_epochs, PHASE_MARKERS
from .summarize import summarize_epochs

__all__ = [
    "load_participant", "PhysioPacket",
    "align_behavioral_to_physio", "mindware_absolute_to_epoch_ms",
    "extract_epochs", "PHASE_MARKERS",
    "summarize_epochs",
]
