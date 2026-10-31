#!/usr/bin/env python3
"""
validate_pack — check a .quizz file against the rules the app enforces.

    python3 tools/validate_pack.py packs/my-test.quizz
    python3 tools/validate_pack.py packs/*.quizz

Exit code 0 = importable, 1 = warnings only, 2 = errors (the app would refuse it).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

MAX_QUESTIONS = 500
MAX_BYTES = 12 * 1024 * 1024


def balanced_math(text: str) -> bool:
    return text.replace("\\$", "").count("$") % 2 == 0


def validate(path: Path) -> tuple[int, list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    size = path.stat().st_size
    if size > MAX_BYTES:
        errors.append(f"file is {size / 1024 / 1024:.1f} MB (limit 12 MB)")

    try:
        pack = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return 2, [f"not valid JSON: {exc}"], []

    if pack.get("format") != "quizz-pack":
        errors.append('format must be "quizz-pack"')
    if pack.get("formatVersion") != 1:
        errors.append("formatVersion must be 1")
    if not str(pack.get("id", "")).startswith("pck_"):
        errors.append("id must start with pck_")
    if not str(pack.get("title", "")).strip():
        errors.append("title is required")
    if not pack.get("createdAt"):
        warnings.append("createdAt is missing")

    questions = pack.get("questions") or []
    if not isinstance(questions, list) or not questions:
        errors.append("no questions")
        return 2, errors, warnings
    if len(questions) > MAX_QUESTIONS:
        errors.append(f"{len(questions)} questions (limit {MAX_QUESTIONS})")

    seen: set[int] = set()
    explained = 0
    for index, q in enumerate(questions):
        n = q.get("n")
        label = f"Q{n}" if isinstance(n, int) else f"question #{index + 1}"
        if not isinstance(n, int) or n < 1:
            errors.append(f"{label}: invalid question number")
            continue
        if n in seen:
            errors.append(f"{label}: duplicate number")
        seen.add(n)

        text = q.get("question") or ""
        if not str(text).strip():
            errors.append(f"{label}: empty question text")
        if not balanced_math(str(text)):
            errors.append(f"{label}: unclosed $ in question")

        options = q.get("options") or []
        if not (2 <= len(options) <= 6):
            errors.append(f"{label}: has {len(options)} options (need 2-6)")
        keys = []
        for option in options:
            key = option.get("key")
            if not isinstance(key, str) or len(key) != 1 or key not in "ABCDEF":
                errors.append(f"{label}: bad option key {key!r}")
                continue
            keys.append(key)
            if not str(option.get("text") or "").strip():
                errors.append(f"{label}: option {key} is empty")
            if not balanced_math(str(option.get("text") or "")):
                errors.append(f"{label}: option {key} has an unclosed $")
        if len(set(keys)) != len(keys):
            errors.append(f"{label}: duplicate option keys")

        answer = q.get("answer") or []
        if not answer:
            errors.append(f"{label}: no answer key")
        else:
            for key in answer:
                if key not in keys:
                    errors.append(f"{label}: answer {key!r} is not an option")
            if len(answer) > 1 and q.get("type", "single") == "single":
                errors.append(f"{label}: type is single but has {len(answer)} answers")

        explanation = q.get("explanation") or ""
        if str(explanation).strip():
            explained += 1
            if not balanced_math(str(explanation)):
                errors.append(f"{label}: explanation has an unclosed $")
        else:
            warnings.append(f"{label}: no explanation")

    print(f"\n{path}")
    print("─" * 46)
    print(f"  title        {pack.get('title')}")
    print(f"  subject      {pack.get('subject') or '—'}")
    print(f"  questions    {len(questions)}")
    print(f"  explanations {explained}/{len(questions)}")
    print(f"  size         {size / 1024:.1f} KB")
    for error in errors:
        print(f"  ERROR        {error}")
    for warning in warnings[:8]:
        print(f"  warning      {warning}")
    if len(warnings) > 8:
        print(f"  warning      …and {len(warnings) - 8} more")
    if not errors and not warnings:
        print("  OK           ready to import")

    return (2 if errors else 1 if warnings else 0), errors, warnings


def main(argv: list[str]) -> int:
    paths = [Path(a) for a in argv]
    if not paths:
        print(__doc__)
        return 2
    worst = 0
    for path in paths:
        if not path.exists():
            print(f"missing file: {path}")
            worst = 2
            continue
        code, _, _ = validate(path)
        worst = max(worst, code)
    return worst


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
