#!/usr/bin/env python3
"""Detect UI-task changes that leave Quang's frontend ownership boundary."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parents[4]
BASELINE_FILE = REPO_ROOT / ".agents" / "ui-scope-baseline.json"
ALLOWED_PREFIXES = (
    "EDUREF_AI/frontend/",
    ".agents/",
)
ALLOWED_FILES = {
    "AGENTS.md",
    "UI_UX_info.txt",
}
PROTECTED_PREFIXES = (
    "EDUREF_AI/frontend/src/services/",
)
PROTECTED_FILES = {
    "EDUREF_AI/frontend/package.json",
    "EDUREF_AI/frontend/package-lock.json",
    "EDUREF_AI/frontend/vite.config.js",
}
DEMO_METADATA_PATH = "EDUREF_AI/frontend/src/services/api.js"
DEMO_NAME_REPLACEMENTS = {
    "name: 'Trần Thị Bình'": "name: 'Trần Minh Quang'",
    "name: 'Phạm Văn Dũng'": "name: 'Trần Đức Tài'",
}


def only_authorized_demo_names_changed():
    original = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"HEAD:{DEMO_METADATA_PATH}"],
        check=True, capture_output=True,
    ).stdout.decode("utf-8").replace("\r\n", "\n")
    current = (REPO_ROOT / DEMO_METADATA_PATH).read_text(encoding="utf-8")
    if current == original:
        return True
    for before, after in DEMO_NAME_REPLACEMENTS.items():
        if original.count(before) != 1:
            return False
        original = original.replace(before, after)
    return current == original


def git_paths(*args):
    result = subprocess.run(
        ["git", "-C", str(REPO_ROOT), *args],
        check=True,
        capture_output=True,
    )
    return {
        path.decode("utf-8").replace("\\", "/")
        for path in result.stdout.split(b"\0")
        if path
    }


def is_allowed(path):
    if path == DEMO_METADATA_PATH:
        return only_authorized_demo_names_changed()
    if path in PROTECTED_FILES or path.startswith(PROTECTED_PREFIXES):
        return False
    return path in ALLOWED_FILES or path.startswith(ALLOWED_PREFIXES)


def changed_paths():
    changed = set()
    changed.update(git_paths("diff", "--name-only", "-z"))
    changed.update(git_paths("diff", "--cached", "--name-only", "-z"))
    changed.update(git_paths("ls-files", "--others", "--exclude-standard", "-z"))
    return changed


def fingerprint(path):
    tracked = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "ls-files", "--error-unmatch", "--", path],
        capture_output=True,
    ).returncode == 0

    if tracked:
        payload = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "diff", "HEAD", "--binary", "--", path],
            check=True,
            capture_output=True,
        ).stdout
    else:
        target = REPO_ROOT / path
        payload = target.read_bytes() if target.is_file() else b"<missing-or-directory>"
    return hashlib.sha256(payload).hexdigest()


def load_baseline():
    if not BASELINE_FILE.exists():
        return {}
    return json.loads(BASELINE_FILE.read_text(encoding="utf-8")).get("protected", {})


def write_baseline(changed):
    protected = {
        path: fingerprint(path)
        for path in sorted(changed)
        if not is_allowed(path)
    }
    BASELINE_FILE.parent.mkdir(parents=True, exist_ok=True)
    BASELINE_FILE.write_text(
        json.dumps({"protected": protected}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"OK: captured {len(protected)} pre-existing protected change(s).")
    for path in protected:
        print(f"  - {path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--snapshot",
        action="store_true",
        help="Record current protected changes before starting UI work.",
    )
    args = parser.parse_args()
    changed = changed_paths()

    if args.snapshot:
        write_baseline(changed)
        return 0

    baseline = load_baseline()
    protected = sorted(path for path in changed if not is_allowed(path))
    blocked = [
        path
        for path in protected
        if baseline.get(path) != fingerprint(path)
    ]
    preserved = [path for path in protected if path not in blocked]

    if blocked:
        print("OUT OF SCOPE: UI/UX work introduced or altered protected paths:")
        for path in blocked:
            print(f"  - {path}")
        print("Revert those edits or obtain explicit authorization before continuing.")
        return 1

    print(f"OK: UI/UX changes remain inside scope; preserved {len(preserved)} pre-existing protected change(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
