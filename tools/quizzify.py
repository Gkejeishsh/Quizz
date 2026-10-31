#!/usr/bin/env python3
"""
quizzify — convert a test PDF into a .quizz pack for the Quizz app.

Usage:
    python3 tools/quizzify.py test.pdf -o packs/my-test.quizz \
        --title "Chemistry — Ch. 3" --subject Chemistry

What it does
------------
1. Extracts a text layer from the PDF (pdfplumber). Scanned image PDFs are rejected.
2. Segments the document into: title, questions, answer key, explanations.
3. Parses question numbering, option markers (A) (a) A. A:), wrapped lines,
   inline "Answer:"/"Explanation:" blocks, answer-key blocks (1-B, 1. B, 1 → B),
   and explanation sections numbered like the questions.
4. Prints a report (questions, keys, explanations, warnings) and writes the pack.
5. Refuses to write a pack that breaks a hard rule — it never guesses an answer.

Only the stdlib is required; pdfplumber is used if present.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------- #
# extraction
# --------------------------------------------------------------------------- #

def read_pages(path: Path) -> list[str]:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return [path.read_text(encoding="utf-8", errors="replace")]

    try:
        import pdfplumber  # type: ignore
    except ImportError:  # pragma: no cover
        raise SystemExit(
            "pdfplumber is required for PDFs:  pip install pdfplumber\n"
            "(plain .txt files work without it)"
        )

    pages: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return pages


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = (
        text.replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u00a0", " ")
        .replace("\uf0b7", "-")
    )
    return text


def page_lines(pages: list[str]) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for number, page in enumerate(pages, start=1):
        for raw in normalize(page).splitlines():
            line = raw.strip()
            if line:
                out.append((number, line))
    return out

# --------------------------------------------------------------------------- #
# patterns
# --------------------------------------------------------------------------- #

HEADING_ANSWER = re.compile(
    r"^\s*(?:answer\s*key|answers?|key|correct\s+(?:answers?|options?))\s*[:\-]?\s*$", re.I
)
HEADING_EXPLAIN = re.compile(
    r"^\s*(?:explanations?|solutions?|answer\s+(?:key\s+)?with\s+explanations?|detailed\s+answers?)\s*[:\-]?\s*$",
    re.I,
)
HEADING_NOISE = re.compile(
    r"^\s*(?:section\s+[a-z0-9]+\b.*|part\s+[a-z0-9]+\b.*|instructions?\b.*|"
    r"total\s+(?:questions|marks)\b.*|time\s+allowed\b.*|page\s+\d+.*)$",
    re.I,
)

QUESTION_START = re.compile(r"^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[.)\]]\s*(.+)$", re.I)
OPTION_START = re.compile(r"^\s*\(?([A-Fa-f])\)?\s*[.):\-]\s+(.+)$")
OPTION_MARKER = re.compile(r"(?:^|\s)\(?([A-F])\)?\s*[.):\-]\s+")
INLINE_ANSWER = re.compile(
    r"^\s*(?:correct\s+)?answer\s*(?:is)?\s*[:\-]?\s*\(?([A-Fa-f](?:\s*[,&/]\s*[A-Fa-f])*)\)?\s*\.?\s*(.*)$",
    re.I,
)
INLINE_EXPLAIN = re.compile(r"^\s*(?:explanation|reason|why)\s*[:\-]\s*(.+)$", re.I)

KEY_LINE = re.compile(
    r"^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[.):\-=>]*\s*\(?([A-Fa-f](?:\s*[,&/]\s*[A-Fa-f])*)\)?\s*\.?\s*(.*)$"
)
KEY_PAIRS = re.compile(r"(\d{1,4})\s*[.):\-=>]*\s*\(?([A-Fa-f])\)?(?![\w])")
KEY_GRID_PAIR = re.compile(r"(?<![\w.])(\d{1,4})\s+([A-Fa-f])(?![\w])")
EXPLAIN_LINE = re.compile(r"^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[.):\-=>]\s*(.+)$")


@dataclass
class Question:
    n: int
    text: str = ""
    options: list[tuple[str, str]] = field(default_factory=list)
    answer: list[str] = field(default_factory=list)
    explanation: str = ""
    page: int = 1


# --------------------------------------------------------------------------- #
# parsing
# --------------------------------------------------------------------------- #

def split_sections(lines: list[tuple[int, str]]) -> tuple[list, list, list, str]:
    """Return (question_lines, answer_lines, explanation_lines, title)."""
    questions: list[tuple[int, str]] = []
    answers: list[tuple[int, str]] = []
    explanations: list[tuple[int, str]] = []
    title_parts: list[str] = []
    zone = "questions"

    for page, line in lines:
        if HEADING_EXPLAIN.match(line):
            zone = "explanations"
            continue
        if HEADING_ANSWER.match(line):
            zone = "answers"
            continue
        if zone == "questions" and HEADING_NOISE.match(line):
            continue
        if zone == "questions" and not questions:
            # everything before the first question is the title block
            if not QUESTION_START.match(line):
                title_parts.append(line)
                continue
        if zone == "answers":
            answers.append((page, line))
        elif zone == "explanations":
            explanations.append((page, line))
        else:
            questions.append((page, line))

    title = build_title(title_parts)
    return questions, answers, explanations, title


def build_title(parts: list[str]) -> str:
    if not parts:
        return ""
    joined = " ".join(parts)
    joined = re.sub(r"\b(page|name|date|roll\s*no\.?|class|time\s*allowed)\b.*", "", joined, flags=re.I)
    joined = re.sub(r"\s+", " ", joined).strip(" :-")
    return joined[:160]


def split_inline_options(line: str) -> list[tuple[str, str]] | None:
    """Split a one-line option row such as "A) 5 B) 6/5 C) 5/6 D) 1/5".

    Only returns a result when the markers are a clean run starting at A, so
    ordinary text that happens to contain "B)" is left alone.
    """
    markers = [(m.start(), m.group(1), m.end()) for m in OPTION_MARKER.finditer(line)]
    if len(markers) < 2:
        return None
    letters = [key for _, key, _ in markers]
    if letters == [chr(ord("A") + i) for i in range(len(letters))]:
        pass  # starts at A (the usual case)
    elif all(ord(b) - ord(a) == 1 for a, b in zip(letters, letters[1:])):
        pass  # a wrapped continuation row, e.g. "C) … D) …"
    else:
        return None
    options: list[tuple[str, str]] = []
    for index, (_, key, end) in enumerate(markers):
        stop = markers[index + 1][0] if index + 1 < len(markers) else len(line)
        text = line[end:stop].strip(" .;,")
        if not text:
            return None
        options.append((key, text))
    return options


def parse_questions(lines: list[tuple[int, str]]) -> list[Question]:
    questions: list[Question] = []
    current: Question | None = None
    target_option: str | None = None  # which line buffer is receiving text

    for page, line in lines:
        qmatch = QUESTION_START.match(line)
        # A question marker only counts if the number is the next expected one
        # (or the first), which protects option text like "2.5 moles" from
        # being mistaken for question 2.
        expected = (questions[-1].n + 1) if questions else 1
        is_question = bool(qmatch) and (
            int(qmatch.group(1)) == expected
            or (current is None and int(qmatch.group(1)) >= 1)
            or (current is not None and int(qmatch.group(1)) > current.n)
        )

        if is_question:
            current = Question(n=int(qmatch.group(1)), text=qmatch.group(2).strip(), page=page)
            questions.append(current)
            target_option = None
            continue

        if current is None:
            continue

        expected_key = chr(ord("A") + len(current.options))

        # options laid out on one line, possibly wrapped over two lines:
        #   "A) x = 1 B) x = 2"
        #   "C) x = 3 D) x = 4"
        inline = split_inline_options(line)
        if inline and inline[0][0] == expected_key:
            current.options.extend(inline)
            target_option = inline[-1][0]
            continue

        omatch = OPTION_START.match(line)
        if omatch and omatch.group(1).upper() == expected_key:
            current.options.append((expected_key, omatch.group(2).strip()))
            target_option = expected_key
            continue

        amatch = INLINE_ANSWER.match(line)
        if amatch:
            current.answer = [k.upper() for k in re.findall(r"[A-Fa-f]", amatch.group(1))]
            rest = amatch.group(2).strip(" .:-")
            if rest:
                current.explanation = rest
            target_option = None
            continue

        ematch = INLINE_EXPLAIN.match(line)
        if ematch:
            current.explanation = ematch.group(1).strip()
            target_option = None
            continue

        # continuation line
        if target_option is not None:
            key, text = current.options[-1]
            current.options[-1] = (key, f"{text} {line}".strip())
        else:
            current.text = f"{current.text} {line}".strip()

    for q in questions:
        q.text = tidy(q.text)
        q.options = [(k, tidy(t)) for k, t in q.options]
        q.explanation = tidy(q.explanation)
    return questions


def tidy(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return text


def parse_answers(lines: list[tuple[int, str]]) -> dict[int, list[str]]:
    answers: dict[int, list[str]] = {}
    for _page, line in lines:
        matched = False
        m = KEY_LINE.match(line)
        if m:
            number = int(m.group(1))
            keys = [k.upper() for k in re.findall(r"[A-Fa-f]", m.group(2))]
            if keys:
                answers[number] = keys
                matched = True
        if not matched:
            # compact blocks: "1-A 2-C 3-B" or "1.A 2.B 3.C 4.D"
            pairs = KEY_PAIRS.findall(line)
            if len(pairs) >= 2:
                for number_s, key in pairs:
                    answers.setdefault(int(number_s), [key.upper()])
                continue
            # grid rows: "1 B 11 A 21 A 31 C 41 B"
            grid = KEY_GRID_PAIR.findall(line)
            if len(grid) >= 2:
                for number_s, key in grid:
                    answers.setdefault(int(number_s), [key.upper()])
    return answers


def parse_explanations(lines: list[tuple[int, str]]) -> dict[int, str]:
    out: dict[int, str] = {}
    current: int | None = None
    for _page, line in lines:
        m = EXPLAIN_LINE.match(line)
        if m and (current is None or int(m.group(1)) != current):
            number = int(m.group(1))
            out[number] = m.group(2).strip()
            current = number
        elif current is not None:
            out[current] = f"{out[current]} {line}".strip()
    return {k: tidy(v) for k, v in out.items()}


SOLUTION_HEADER = re.compile(r"^Q(\d{1,4})\s*[·•.]")
CORRECT_LINE = re.compile(r"^Correct\s*:\s*(.+)$", re.I)
ANSWER_IN_TEXT = re.compile(r"Answer\s*:\s*\(?([A-Fa-f](?:\s*[,&/]\s*[A-Fa-f])*)\)?", re.I)
SECTION_LABEL = re.compile(
    r"^(Arithmetic|Algebra|Equations|Geometry|Statistics|Scenario|Reasoning|English|Physics|Chemistry|Biology)\b",
    re.I,
)


def parse_solutions_layout(layout_lines: list[Any]) -> dict[int, dict[str, str]]:
    """Read the "worked solutions" section using the label/body columns.

    Handles the common AI layout:

        Q12 · Percent Reverse | Answer: C
        Question  <restated question>
        A) … B) … C) … D) …
        Solution  <worked steps>
        Correct: C) 42
        Why the others tempt <why the distractors look right>
    """
    blocks: dict[int, dict[str, str]] = {}
    current: dict[str, str] | None = None
    field: str | None = None

    for line in layout_lines:
        label = (line.label or "").strip()
        body = (line.body or "").strip()

        header = SOLUTION_HEADER.match(label)
        if header:
            number = int(header.group(1))
            current = {"header": body, "question": "", "solution": "", "why": "", "correct": ""}
            blocks[number] = current
            field = "header"
            continue

        if current is None:
            continue

        if label == "Question":
            field = "question"
        elif label == "Solution":
            field = "solution"
        elif label.lower().startswith("why"):
            field = "why"
        elif label and label.lower().startswith("others"):
            pass  # the wrapped second half of "Why the others tempt"
        elif label and (SECTION_LABEL.match(label) or label.isupper()):
            current = None
            field = None
            continue
        elif label:
            # an unknown label ends the current text field but keeps the block
            field = None

        if not body:
            continue

        correct = CORRECT_LINE.match(body)
        if correct:
            current["correct"] = correct.group(1).strip()
            field = None
            continue

        if field == "header":
            current["header"] = f"{current['header']} {body}".strip()
        elif field in {"question", "solution", "why"}:
            current[field] = f"{current[field]} {body}".strip()

    return blocks


def solutions_to_text(blocks: dict[int, dict[str, str]]) -> dict[int, tuple[str, list[str]]]:
    """Turn parsed blocks into (explanation, answer keys) per question."""
    out: dict[int, tuple[str, list[str]]] = {}
    for number, block in blocks.items():
        answer_match = ANSWER_IN_TEXT.search(block.get("header", ""))
        keys = [k.upper() for k in re.findall(r"[A-Fa-f]", answer_match.group(1))] if answer_match else []
        if not keys and block.get("correct"):
            letter = re.match(r"\(?([A-Fa-f])\)?", block["correct"])
            if letter:
                keys = [letter.group(1).upper()]
        parts = []
        solution = tidy(block.get("solution", ""))
        why = tidy(block.get("why", ""))
        if solution:
            parts.append(solution)
        if why:
            parts.append(f"Why the others tempt: {why}")
        out[number] = (" ".join(parts), keys)
    return out


def guess_subject(title: str, questions: list[Question]) -> str:
    known = [
        "English", "Maths", "Mathematics", "Physics", "Chemistry", "Biology",
        "Computer", "Urdu", "Islamiat", "Pakistan Studies", "Economics", "History",
        "Geography", "Statistics", "Accounting", "General Science",
    ]
    for subject in known:
        if re.search(rf"\b{re.escape(subject)}\b", title, re.I):
            return "Maths" if subject == "Mathematics" else subject
    return ""


# --------------------------------------------------------------------------- #
# assembly + validation
# --------------------------------------------------------------------------- #

def build_pack(
    questions: list[Question], title: str, subject: str, *, source_name: str, pages: int, checksum: str
) -> tuple[dict, list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    numbers = [q.n for q in questions]
    duplicates = sorted({n for n in numbers if numbers.count(n) > 1})
    if duplicates:
        errors.append(f"Duplicate question numbers: {duplicates}")

    out_questions = []
    for q in questions:
        if not q.text:
            errors.append(f"Q{q.n}: empty question text")
        if not (2 <= len(q.options) <= 6):
            errors.append(f"Q{q.n}: expected 2-6 options, found {len(q.options)}")
        keys = {k for k, _ in q.options}
        if not q.answer:
            errors.append(f"Q{q.n}: no answer key found")
        else:
            bad = [a for a in q.answer if a not in keys]
            if bad:
                errors.append(f"Q{q.n}: answer key {bad} is not one of the options {sorted(keys)}")
        if not q.explanation:
            warnings.append(f"Q{q.n}: no explanation")
        if q.text.count("$") % 2:
            errors.append(f"Q{q.n}: unclosed $ in question text")
        out_questions.append(
            {
                "n": q.n,
                "type": "single" if len(q.answer) <= 1 else "multi",
                "question": q.text,
                "options": [{"key": k, "text": t} for k, t in q.options],
                "answer": q.answer,
                "explanation": q.explanation,
                "sourceRef": {"page": q.page},
            }
        )

    if not out_questions:
        errors.append("No questions were found in this document")

    pack = {
        "format": "quizz-pack",
        "formatVersion": 1,
        "id": "pck_" + hashlib.sha256((checksum + title).encode()).hexdigest()[:12],
        "revision": 1,
        "supersedes": None,
        "title": title or "Untitled test",
        "subject": subject,
        "language": "en",
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {"fileName": source_name, "pages": pages, "checksum": "sha256:" + checksum},
        "questions": out_questions,
        "groups": [],
        "assets": {},
    }
    return pack, errors, warnings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Convert a test PDF into a .quizz pack")
    parser.add_argument("input", type=Path)
    parser.add_argument("-o", "--output", type=Path)
    parser.add_argument("--title", default="")
    parser.add_argument("--subject", default="")
    parser.add_argument("--allow-missing-explanations", action="store_true")
    args = parser.parse_args(argv)

    if not args.input.exists():
        raise SystemExit(f"File not found: {args.input}")

    pages = read_pages(args.input)
    lines = page_lines(pages)
    layout: list[Any] | None = None
    if args.input.suffix.lower() == ".pdf":
        try:
            from pdf_layout import read_layout, strip_running_lines  # type: ignore

            layout = strip_running_lines(read_layout(args.input))
            layout_lines = [(line.page, line.text) for line in layout]
            if layout_lines:
                # richer than extract_text: keeps superscripts and drops footers
                lines = [(page, text) for page, text in layout_lines if text.strip()]
        except Exception as exc:  # noqa: BLE001
            print(f"  note            layout extraction skipped ({exc})")
    if not lines:
        raise SystemExit(
            "No text layer found. This PDF looks scanned — export a text-based PDF "
            "(or ask the AI to regenerate it) and try again."
        )

    q_lines, a_lines, e_lines, doc_title = split_sections(lines)
    questions = parse_questions(q_lines)
    answers = parse_answers(a_lines)
    explanations = parse_explanations(e_lines)

    # Worked solutions written in two columns (label | body) need layout-aware
    # reading; fall back silently to the plain-text explanations above.
    columns: dict[int, tuple[str, list[str]]] = {}
    if layout:
        try:
            start = 0
            for index, line in enumerate(layout):
                upper = f"{line.label} {line.body}".upper()
                if re.search(r"WORKED SOLUTIONS|EXPLANATIONS|SOLUTIONS\b", upper):
                    start = index
                    break
            if start:
                columns = solutions_to_text(parse_solutions_layout(layout[start:]))
        except Exception as exc:  # noqa: BLE001
            print(f"  note            layout parsing skipped ({exc})")

    conflicts: list[str] = []
    for q in questions:
        if not q.answer and q.n in answers:
            q.answer = answers[q.n]
        if not q.explanation and q.n in explanations:
            q.explanation = explanations[q.n]
        if q.n in columns:
            column_explanation, column_keys = columns[q.n]
            if column_explanation and len(column_explanation) > len(q.explanation):
                q.explanation = column_explanation
            if column_keys:
                if q.answer and column_keys != q.answer:
                    conflicts.append(
                        f"Q{q.n}: answer key says {q.answer}, worked solutions say {column_keys}"
                    )
                elif not q.answer:
                    q.answer = column_keys
        # an explanation section line like "1. B — because ..." can also carry the key
        if not q.answer and q.n in explanations:
            m = re.match(r"^\(?([A-F])\b", explanations[q.n])
            if m:
                q.answer = [m.group(1)]

    unused_keys = sorted(set(answers) - {q.n for q in questions})
    title = args.title.strip() or doc_title or args.input.stem.replace("-", " ").title()
    subject = args.subject.strip() or guess_subject(title, questions)

    checksum = hashlib.sha256(args.input.read_bytes()).hexdigest()
    pack, errors, warnings = build_pack(
        questions, title, subject, source_name=args.input.name, pages=len(pages), checksum=checksum
    )

    explained = sum(1 for q in questions if q.explanation)
    print("Quizz import report")
    print("──────────────────────────────────────────")
    print(f"  file            {args.input.name} ({len(pages)} page{'s' if len(pages) != 1 else ''})")
    print(f"  title           {title}")
    print(f"  subject         {subject or '—'}")
    print(f"  questions       {len(questions)}")
    print(f"  answer keys     {sum(1 for q in questions if q.answer)}/{len(questions)}")
    print(f"  explanations    {explained}/{len(questions)}")
    if unused_keys:
        print(f"  note            answer keys for missing questions: {unused_keys}")
    for conflict in conflicts[:6]:
        print(f"  warning         {conflict}")
    if len(conflicts) > 6:
        print(f"  warning         …and {len(conflicts) - 6} more key/solution conflicts")
    for error in errors:
        print(f"  ERROR           {error}")
    for warning in warnings[:12]:
        print(f"  warning         {warning}")
    if len(warnings) > 12:
        print(f"  warning         …and {len(warnings) - 12} more")

    if errors:
        print("\nNothing was written. Fix the source PDF (or the parser rules) and retry.")
        return 2
    if warnings and not args.allow_missing_explanations:
        missing = sum(1 for w in warnings if "no explanation" in w)
        if missing:
            print(f"  note            {missing} question(s) will have no explanation in the app")

    output = args.output or Path("packs") / (args.input.stem + ".quizz")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {output}  ({output.stat().st_size / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
