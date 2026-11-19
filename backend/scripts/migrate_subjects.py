"""
Normalise subject names stored before the UI matched the ingested data
("Social Studies" → "Social Science", "Math" → "Mathematics").

Dry run by default; nothing is written unless you pass --apply.

    cd backend && source .venv/bin/activate
    python -m scripts.migrate_subjects            # show what would change
    python -m scripts.migrate_subjects --apply    # write the changes
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.supabase_service import get_supabase_client, init_supabase  # noqa: E402
from app.utils.subjects import normalize_subject, normalize_subjects  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    args = parser.parse_args()

    init_supabase()
    db = get_supabase_client()

    profiles = db.table("student_profiles").select("user_id, subjects").execute().data or []
    profile_changes = [
        (p["user_id"], p.get("subjects") or [], normalize_subjects(p.get("subjects")))
        for p in profiles
        if (p.get("subjects") or []) != normalize_subjects(p.get("subjects"))
    ]

    sessions = db.table("sessions").select("id, subject").not_.is_("subject", "null").execute().data or []
    session_changes = [
        (s["id"], s["subject"], normalize_subject(s["subject"]))
        for s in sessions
        if normalize_subject(s["subject"]) != s["subject"]
    ]

    print(f"student_profiles: {len(profile_changes)} of {len(profiles)} rows need changes")
    for _, before, after in profile_changes:
        print(f"  {before} -> {after}")
    print(f"sessions: {len(session_changes)} of {len(sessions)} rows need changes")
    for _, before, after in session_changes:
        print(f"  {before!r} -> {after!r}")

    if not args.apply:
        print("\nDry run. Re-run with --apply to write these changes.")
        return

    for user_id, _, after in profile_changes:
        db.table("student_profiles").update({"subjects": after}).eq("user_id", user_id).execute()
    for session_id, _, after in session_changes:
        db.table("sessions").update({"subject": after}).eq("id", session_id).execute()
    print(f"\nUpdated {len(profile_changes)} profiles and {len(session_changes)} sessions.")


if __name__ == "__main__":
    main()
