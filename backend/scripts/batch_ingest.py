"""
Batch ingest all NCERT PDFs into Supabase pgvector.
Runs sequentially with progress tracking.

Usage:
  cd backend
  python -m scripts.batch_ingest
"""
import glob
import subprocess
import sys
from pathlib import Path

# Map folder prefixes to subjects
SUBJECT_MAP = {
    "9-Sci": "Science",
    "9-Math": "Mathematics",
    "9-Eco": "Social Science",
    "9-Eng": "English",
    "9-Geography": "Social Science",
    "9-History": "Social Science",
    "9-PoliticalScience": "Social Science",
    "9-Hindi": "Hindi",
}

def ingest_pdf(pdf_path: str, subject: str, grade: int = 9) -> bool:
    """Run ingest script for a single PDF."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "scripts.ingest",
             "--pdf", pdf_path,
             "--subject", subject,
             "--grade", str(grade)],
            timeout=300,  # 5 min timeout per PDF
            cwd=str(Path(__file__).parent.parent),
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"❌ TIMEOUT: {pdf_path}")
        return False
    except Exception as e:
        print(f"❌ ERROR: {pdf_path} → {e}")
        return False


def main() -> None:
    """Ingest all PDFs by subject."""
    total_pdfs = 0
    successful = 0
    failed = 0

    pdfs_dir = Path(__file__).parent.parent.parent / "Pdfs"

    for folder_prefix, subject in SUBJECT_MAP.items():
        folder = pdfs_dir / folder_prefix
        if not folder.exists():
            print(f"⚠️  Folder not found: {folder}")
            continue

        pdfs = sorted(glob.glob(str(folder / "*.pdf")))
        if not pdfs:
            print(f"⚠️  No PDFs in {folder}")
            continue

        print(f"\n{'='*60}")
        print(f"📚 {subject} ({len(pdfs)} PDFs)")
        print(f"{'='*60}")

        for i, pdf_path in enumerate(pdfs, 1):
            pdf_name = Path(pdf_path).name
            print(f"\n[{i}/{len(pdfs)}] {pdf_name}...", end=" ", flush=True)
            total_pdfs += 1

            if ingest_pdf(pdf_path, subject, grade=9):
                print("✓")
                successful += 1
            else:
                print("✗")
                failed += 1

    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Total:      {total_pdfs}")
    print(f"Successful: {successful} ✓")
    print(f"Failed:     {failed} ✗")
    print(f"Success rate: {successful/total_pdfs*100:.0f}%" if total_pdfs > 0 else "N/A")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
