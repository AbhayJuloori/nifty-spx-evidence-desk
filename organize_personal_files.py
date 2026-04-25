from __future__ import annotations

import csv
import hashlib
import json
import os
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path


HOME = Path.home()
DOCUMENTS = HOME / "Documents"
DOWNLOADS = HOME / "Downloads"
TRASH_ROOT = HOME / ".Trash"
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")


CATEGORY_DIRS = [
    "Career/Resumes",
    "Career/Cover Letters",
    "Career/Applications",
    "Career/Interview Prep",
    "Career/LinkedIn",
    "Career/Offer Letters",
    "Education/Graduate Applications",
    "Education/Admissions",
    "Education/MEng Capstone",
    "Education/Records",
    "Finance/Loans",
    "Finance/Taxes",
    "Immigration/CPT",
    "Immigration/OPT",
    "Immigration/General",
    "Personal/Identity",
    "Personal/Insurance",
    "Personal/Photos",
    "Personal/Scanned Records",
    "Personal/Security",
    "Projects/Credentialed",
    "Projects/Data Science",
    "Projects/Surrogate Modeling",
    "Projects/Web Experiments",
    "Reference/AI",
    "Reference/Learning",
    "Archives/Compressed Files",
    "Software/Installers",
    "Review Needed",
    "Organization_Metadata",
]


EXCLUDED_TOP_LEVEL = {
    "Codex",
    "Career",
    "Education",
    "Finance",
    "Immigration",
    "Personal",
    "Projects",
    "Reference",
    "Archives",
    "Software",
    "Review Needed",
    "Organization_Metadata",
}

SKIP_FILENAMES = {".DS_Store", ".localized"}


@dataclass
class FileAction:
    source_path: str
    final_path: str
    status: str
    category: str
    sha256: str
    size_bytes: int
    note: str


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized(s: str) -> str:
    return s.lower().replace("_", " ").replace("-", " ")


def has_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def is_resume(name: str) -> bool:
    return "resume" in name or name.endswith("test res.pdf")


def is_cover_letter(name: str) -> bool:
    return "coverletter" in name or "cover letter" in name


def is_academic_record(name: str) -> bool:
    return has_any(
        name,
        [
            "transcript",
            "marksheet",
            "memo",
            "bonafide",
            "gre",
            "ielts",
            "program study",
            "curriculum",
            "code of conduct",
            "study conduct",
            "pass certificate",
            "ceas",
            "intermediate",
            "btech",
            "10th",
            "12th",
        ],
    )


def is_identity(name: str) -> bool:
    return has_any(
        name,
        [
            "passport",
            "aadhar",
            "pan",
            "birth certificate",
            "my sign",
            "profile pic",
            "id card",
        ],
    )


def is_tax(name: str) -> bool:
    return has_any(
        name,
        [
            "tax",
            "w2",
            "1095",
            "refund",
            "8316",
            "843",
            "fica",
            "form_8316",
            "form_843",
        ],
    )


def is_immigration(name: str) -> bool:
    return has_any(
        name,
        [
            "i-20",
            "i20",
            "i-94",
            "i94",
            "i-765",
            "i765",
            "sevis",
            "cpt",
            "opt",
            "visa",
            "receipt notice",
            "eligibilityresultsnotice",
        ],
    )


def is_loan(name: str) -> bool:
    return has_any(
        name,
        [
            "loan",
            "repayment schedule",
            "payslip",
            "paystub",
            "account summary",
            "transactions",
        ],
    )


def is_application_doc(name: str) -> bool:
    return has_any(
        name,
        [
            "applicationform",
            "application form",
            "prescreen",
            "pre screening",
            "questionnaire",
        ],
    )


def route(source: Path) -> Path:
    rel = source.relative_to(HOME)
    rel_text = normalized(str(rel))
    filename = source.name
    name = normalized(filename)
    suffix = source.suffix.lower()

    # Code workspace stays untouched.
    if rel.parts[0] == "Documents" and len(rel.parts) > 1 and rel.parts[1] == "Codex":
        raise ValueError("Codex files should not be routed")

    # Project-heavy folders: preserve internal layout.
    if "p&g surrogate" in rel_text:
        inner = source.relative_to(DOCUMENTS / "P&G Surrogate")
        return DOCUMENTS / "Projects/Surrogate Modeling/P&G Surrogate" / inner
    if "data_xgbc" in rel_text and rel.parts[:2] == ("Documents", "data_xgbc"):
        inner = source.relative_to(DOCUMENTS / "data_xgbc")
        return DOCUMENTS / "Projects/Surrogate Modeling/data_xgbc" / inner
    if rel.parts[:2] == ("Downloads", "data_pbi"):
        inner = source.relative_to(DOWNLOADS / "data_pbi")
        return DOCUMENTS / "Projects/Surrogate Modeling/data_pbi" / inner
    if rel.parts[:2] == ("Documents", "Credit Recourse Engine"):
        inner = source.relative_to(DOCUMENTS / "Credit Recourse Engine")
        return DOCUMENTS / "Projects/Data Science/Credit Recourse Engine" / inner

    if suffix in {".ipynb", ".csv", ".xlsx", ".xls"} and has_any(
        name + " " + rel_text,
        [
            "xgbc",
            "catboost",
            "surrogate",
            "powerbi",
            "database.xlsx",
            "combined.csv",
            "final joined",
            "speed chain",
            "main table",
            "friction package",
            "offset package",
            "rail overhead",
            "pressure chain",
        ],
    ):
        return DOCUMENTS / "Projects/Data Science" / filename

    if suffix in {".png", ".jpg", ".jpeg", ".svg", ".webp"} and has_any(
        name, ["gray zone", "grayzone", "surrogate", "dall", "infographic"]
    ):
        return DOCUMENTS / "Projects/Surrogate Modeling/Assets" / filename

    if suffix == ".html":
        return DOCUMENTS / "Projects/Web Experiments" / filename

    if suffix == ".tex":
        return DOCUMENTS / "Career/Resumes/Source Files" / filename

    if suffix == ".dmg":
        return DOCUMENTS / "Software/Installers" / filename

    if suffix == ".zip":
        if has_any(name, ["tax", "refund"]):
            return DOCUMENTS / "Finance/Taxes/Archives" / filename
        if has_any(name, ["lor"]):
            return DOCUMENTS / "Education/Graduate Applications/Archives" / filename
        if has_any(name, ["home credit", "archive"]):
            return DOCUMENTS / "Projects/Data Science/Archives" / filename
        if has_any(name, ["resume", "files"]):
            return DOCUMENTS / "Career/Resumes/Archives" / filename
        return DOCUMENTS / "Archives/Compressed Files" / filename

    if is_resume(name):
        if "downloads" in rel_text and "resume_" in name:
            return DOCUMENTS / "Career/Resumes/Tailored" / filename
        if "parexel" in name:
            return DOCUMENTS / "Career/Resumes/Tailored" / filename
        if "ms docs" in rel_text:
            return DOCUMENTS / "Career/Resumes/Archived" / filename
        return DOCUMENTS / "Career/Resumes/Master" / filename

    if is_cover_letter(name):
        return DOCUMENTS / "Career/Cover Letters" / filename

    if "interviewprep" in name or "interview prep" in name:
        return DOCUMENTS / "Career/Interview Prep" / filename

    if "linkedin" in name:
        return DOCUMENTS / "Career/LinkedIn" / filename

    if is_application_doc(name):
        return DOCUMENTS / "Career/Applications" / filename

    if "offerletter" in name or "offer letter" in name:
        if has_any(rel_text + " " + name, ["ucin", "uab", "maryland", "decision letter"]):
            return DOCUMENTS / "Education/Admissions/Offer Letters" / filename
        return DOCUMENTS / "Career/Offer Letters" / filename

    if "sop" in name or "essay" in name or "community involvement" in name or "leadership roles" in name or "research work experience" in name:
        return DOCUMENTS / "Education/Graduate Applications/Application Materials" / filename

    if "lor" in name or "lors" in rel_text:
        return DOCUMENTS / "Education/Graduate Applications/Letters of Recommendation" / filename

    if has_any(rel_text, ["mengt capstone", "meng capstone", "internship_final_report"]) or has_any(
        name, ["capstone", "program study", "internship final report"]
    ):
        return DOCUMENTS / "Education/MEng Capstone" / filename

    if has_any(rel_text, ["cincy", "university of cincinnati", "maryland college park", "south florida"]):
        return DOCUMENTS / "Education/Admissions" / filename

    if is_academic_record(name):
        if "scaned docs" in rel_text:
            return DOCUMENTS / "Education/Records/Scanned Academic Records" / filename
        return DOCUMENTS / "Education/Records" / filename

    if is_identity(name):
        if "scaned docs" in rel_text:
            return DOCUMENTS / "Personal/Scanned Records" / filename
        return DOCUMENTS / "Personal/Identity" / filename

    if "github" in rel_text or "security codes" in rel_text:
        return DOCUMENTS / "Personal/Security" / filename

    if has_any(name, ["ambetter", "insurance"]):
        return DOCUMENTS / "Personal/Insurance" / filename

    if has_any(name, ["whatsapp image", "profile pic"]):
        return DOCUMENTS / "Personal/Photos" / filename

    if is_tax(name):
        return DOCUMENTS / "Finance/Taxes" / filename

    if is_immigration(name):
        if "cpt" in rel_text:
            return DOCUMENTS / "Immigration/CPT" / filename
        if "opt" in rel_text:
            return DOCUMENTS / "Immigration/OPT" / filename
        return DOCUMENTS / "Immigration/General" / filename

    if is_loan(name):
        return DOCUMENTS / "Finance/Loans" / filename

    if suffix in {".docx", ".pages"} and has_any(name, ["refund", "shiny", "claude"]):
        if "refund" in name:
            return DOCUMENTS / "Finance/Taxes/FICA Refund" / filename
        if "claude" in name:
            return DOCUMENTS / "Reference/AI" / filename
        return DOCUMENTS / "Reference/Learning" / filename

    if suffix in {".eml"}:
        return DOCUMENTS / "Finance/Taxes/FICA Refund" / filename

    if source.parent == DOWNLOADS:
        return DOCUMENTS / "Review Needed" / filename

    return DOCUMENTS / "Review Needed" / filename


def ensure_unique_destination(dest: Path, source_hash: str) -> Path:
    if not dest.exists():
        return dest
    if dest.is_file() and sha256_of(dest) == source_hash:
        return dest
    stem, suffix = dest.stem, dest.suffix
    counter = 2
    while True:
        candidate = dest.with_name(f"{stem} ({counter}){suffix}")
        if not candidate.exists():
            return candidate
        if candidate.is_file() and sha256_of(candidate) == source_hash:
            return candidate
        counter += 1


def gather_sources() -> list[Path]:
    files: list[Path] = []
    for root in (DOCUMENTS, DOWNLOADS):
        for dirpath, dirnames, filenames in os.walk(root):
            current = Path(dirpath)
            rel = current.relative_to(root)
            if rel.parts and rel.parts[0] in EXCLUDED_TOP_LEVEL:
                dirnames[:] = []
                continue
            if root == DOCUMENTS and rel.parts and rel.parts[0] == "Codex":
                dirnames[:] = []
                continue
            dirnames[:] = [d for d in dirnames if d not in EXCLUDED_TOP_LEVEL and d != "Codex"]
            for filename in filenames:
                if filename in SKIP_FILENAMES:
                    continue
                files.append(current / filename)
    return sorted(files)


def select_canonical(paths: list[Path]) -> Path:
    rankings = [
        "Education/Records",
        "Personal/Identity",
        "Immigration/OPT",
        "Immigration/CPT",
        "Immigration/General",
        "Finance/Taxes",
        "Finance/Loans",
        "Career/Resumes",
        "Career/Cover Letters",
        "Career/Offer Letters",
        "Education/Admissions",
        "Education/Graduate Applications",
        "Personal/Scanned Records",
    ]
    scores = {prefix: len(rankings) - i for i, prefix in enumerate(rankings)}

    def key(path: Path) -> tuple[int, int, str]:
        rel = str(path.relative_to(DOCUMENTS))
        score = 0
        for prefix, value in scores.items():
            if rel.startswith(prefix):
                score = value
                break
        return (-score, len(rel), rel)

    return sorted(paths, key=key)[0]


def move_to_trash(path: Path, trash_dir: Path) -> Path:
    trash_dir.mkdir(parents=True, exist_ok=True)
    candidate = trash_dir / path.name
    if candidate.exists():
        stem, suffix = candidate.stem, candidate.suffix
        index = 2
        while (trash_dir / f"{stem} ({index}){suffix}").exists():
            index += 1
        candidate = trash_dir / f"{stem} ({index}){suffix}"
    shutil.move(str(path), str(candidate))
    return candidate


def prune_empty_dirs(root: Path) -> None:
    for dirpath, dirnames, filenames in os.walk(root, topdown=False):
        current = Path(dirpath)
        if current in {DOCUMENTS, DOWNLOADS}:
            continue
        if current.name in EXCLUDED_TOP_LEVEL or current.name == "Codex":
            continue
        if any(name not in SKIP_FILENAMES for name in filenames):
            continue
        if dirnames:
            continue
        for filename in filenames:
            file_path = current / filename
            if filename in SKIP_FILENAMES and file_path.exists():
                file_path.unlink()
        try:
            current.rmdir()
        except OSError:
            pass


def main() -> None:
    for category in CATEGORY_DIRS:
        (DOCUMENTS / category).mkdir(parents=True, exist_ok=True)

    actions: list[FileAction] = []
    moved_files: list[Path] = []
    trash_dir = TRASH_ROOT / f"DocumentCleanupDuplicates_{TIMESTAMP}"

    for source in gather_sources():
        source_hash = sha256_of(source)
        source_size = source.stat().st_size
        destination = route(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination = ensure_unique_destination(destination, source_hash)

        if destination.exists() and sha256_of(destination) == source_hash:
            trashed = move_to_trash(source, trash_dir)
            actions.append(
                FileAction(
                    source_path=str(source),
                    final_path=str(trashed),
                    status="duplicate_trashed_during_move",
                    category=str(destination.parent.relative_to(DOCUMENTS)),
                    sha256=source_hash,
                    size_bytes=source_size,
                    note=f"Exact duplicate of {destination}",
                )
            )
            continue

        if source == destination:
            moved_files.append(destination)
            actions.append(
                FileAction(
                    source_path=str(source),
                    final_path=str(destination),
                    status="kept_in_place",
                    category=str(destination.parent.relative_to(DOCUMENTS)),
                    sha256=source_hash,
                    size_bytes=source_size,
                    note="Already in target location",
                )
            )
            continue

        shutil.move(str(source), str(destination))
        moved_files.append(destination)
        actions.append(
            FileAction(
                source_path=str(source),
                final_path=str(destination),
                status="moved",
                category=str(destination.parent.relative_to(DOCUMENTS)),
                sha256=source_hash,
                size_bytes=destination.stat().st_size,
                note="Moved into organized structure",
            )
        )

    dedupe_candidates = [
        path for path in moved_files if path.exists() and path.is_file() and "Projects/" not in str(path.relative_to(DOCUMENTS))
    ]
    by_hash: dict[str, list[Path]] = {}
    for path in dedupe_candidates:
        by_hash.setdefault(sha256_of(path), []).append(path)

    for file_hash, group in by_hash.items():
        if len(group) < 2:
            continue
        canonical = select_canonical(group)
        for duplicate in group:
            if duplicate == canonical:
                continue
            trashed = move_to_trash(duplicate, trash_dir)
            actions.append(
                FileAction(
                    source_path=str(duplicate),
                    final_path=str(trashed),
                    status="duplicate_trashed_post_move",
                    category=str(canonical.parent.relative_to(DOCUMENTS)),
                    sha256=file_hash,
                    size_bytes=trashed.stat().st_size,
                    note=f"Exact duplicate of {canonical}",
                )
            )

    prune_empty_dirs(DOCUMENTS)
    prune_empty_dirs(DOWNLOADS)

    metadata_dir = DOCUMENTS / "Organization_Metadata"
    csv_path = metadata_dir / "file_index.csv"
    json_path = metadata_dir / "file_index.json"
    summary_path = metadata_dir / "organization_summary.md"

    actions_sorted = sorted(actions, key=lambda action: (action.status, action.source_path))

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(asdict(actions_sorted[0]).keys()))
        writer.writeheader()
        for action in actions_sorted:
            writer.writerow(asdict(action))

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump([asdict(action) for action in actions_sorted], handle, indent=2)

    moved_count = sum(1 for action in actions_sorted if action.status == "moved")
    kept_count = sum(1 for action in actions_sorted if action.status == "kept_in_place")
    dup_count = sum(1 for action in actions_sorted if "duplicate_trashed" in action.status)
    review_count = sum(1 for action in actions_sorted if action.category == "Review Needed")

    with summary_path.open("w", encoding="utf-8") as handle:
        handle.write("# Document Organization Summary\n\n")
        handle.write(f"- Run timestamp: `{TIMESTAMP}`\n")
        handle.write(f"- Files moved: `{moved_count}`\n")
        handle.write(f"- Files already in place after routing: `{kept_count}`\n")
        handle.write(f"- Exact duplicate copies sent to Trash: `{dup_count}`\n")
        handle.write(f"- Files parked in `Review Needed`: `{review_count}`\n")
        handle.write(f"- Duplicate Trash folder: `{trash_dir}`\n")
        handle.write("\n## Main Categories\n\n")
        for category in CATEGORY_DIRS:
            handle.write(f"- `{category}`\n")
        handle.write("\n## Metadata Files\n\n")
        handle.write(f"- `{csv_path}`\n")
        handle.write(f"- `{json_path}`\n")


if __name__ == "__main__":
    main()
