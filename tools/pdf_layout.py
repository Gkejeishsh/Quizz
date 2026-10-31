#!/usr/bin/env python3
"""
Layout-aware text extraction.

Some AI-generated test PDFs put a label in a narrow left column ("Solution",
"Correct:", "Why the others tempt") and the text in a right column. Reading the
page as plain text interleaves those columns and produces mangled sentences, so
this module returns each visual line split into a *label* part and a *body* part.

It also restores superscript and subscript runs, which plain text extraction
flattens: "x² − 3x" would otherwise come out as "x2 − 3x".
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from statistics import median

LABEL_COLUMN_MAX_X = 120.0
SUPERSCRIPT_RATIO = 0.86

SUPERSCRIPT = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "−": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "a": "ᵃ", "b": "ᵇ", "c": "ᶜ", "d": "ᵈ", "e": "ᵉ", "f": "ᶠ", "g": "ᵍ", "h": "ʰ", "i": "ⁱ",
    "j": "ʲ", "k": "ᵏ", "l": "ˡ", "m": "ᵐ", "n": "ⁿ", "o": "ᵒ", "p": "ᵖ", "r": "ʳ", "s": "ˢ",
    "t": "ᵗ", "u": "ᵘ", "v": "ᵛ", "w": "ʷ", "x": "ˣ", "y": "ʸ", "z": "ᶻ",
}

SUBSCRIPT = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "−": "₋", "=": "₌", "(": "₍", ")": "₎",
    "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ", "k": "ₖ", "l": "ₗ", "m": "ₘ", "n": "ₙ",
    "o": "ₒ", "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "u": "ᵤ", "v": "ᵥ", "x": "ₓ",
}


@dataclass
class LayoutLine:
    page: int
    top: float
    label: str
    body: str

    @property
    def text(self) -> str:
        return f"{self.label} {self.body}".strip()


def _convert_run(text: str, table: dict[str, str]) -> str:
    out = []
    for ch in text:
        mapped = table.get(ch.lower())
        if mapped is None:
            return text  # unsupported character: leave the run as plain text
        out.append(mapped)
    return "".join(out)


def _open(path: Path):
    try:
        import pdfplumber  # type: ignore
    except ImportError:  # pragma: no cover
        raise SystemExit("pdfplumber is required for layout extraction: pip install pdfplumber")
    return pdfplumber.open(str(path))


def read_layout(path: Path, label_column_max_x: float = LABEL_COLUMN_MAX_X) -> list[LayoutLine]:
    """Return every visual line of the PDF split into (label, body) columns."""
    lines: list[LayoutLine] = []
    with _open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(
                use_text_flow=False, keep_blank_chars=False, extra_attrs=["size"]
            )
            if not words:
                continue
            buckets: dict[int, list[dict]] = {}
            for word in words:
                buckets.setdefault(round(float(word["top"]) / 2.5), []).append(word)

            for key in sorted(buckets):
                row = sorted(buckets[key], key=lambda w: float(w["x0"]))
                sizes = [float(w.get("size") or 10) for w in row]
                tops = [float(w["top"]) for w in row]
                base_size = median(sizes) if sizes else 10
                base_top = median(tops) if tops else 0

                label_parts: list[str] = []
                body_parts: list[str] = []
                glue = False
                for word, size, top in zip(row, sizes, tops):
                    text = str(word["text"])
                    if size < base_size * SUPERSCRIPT_RATIO:
                        if top < base_top - 1.2:
                            converted = _convert_run(text, SUPERSCRIPT)
                            if converted != text:
                                text, glue = converted, True
                        elif top > base_top + 1.2:
                            converted = _convert_run(text, SUBSCRIPT)
                            if converted != text:
                                text, glue = converted, True

                    target = label_parts if float(word["x0"]) < label_column_max_x else body_parts
                    if glue and target:
                        target[-1] = target[-1] + text
                    else:
                        target.append(text)
                    glue = False

                lines.append(
                    LayoutLine(
                        page=page_number,
                        top=tops[0] if tops else 0.0,
                        label=" ".join(label_parts).strip(),
                        body=" ".join(body_parts).strip(),
                    )
                )
    return lines


def read_plain_lines(path: Path) -> list[tuple[int, str]]:
    """Fallback: page text split into trimmed lines (no column handling)."""
    out: list[tuple[int, str]] = []
    with _open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for raw in (page.extract_text() or "").splitlines():
                if raw.strip():
                    out.append((page_number, raw.strip()))
    return out


def strip_running_lines(lines: list[LayoutLine]) -> list[LayoutLine]:
    """Drop footers/headers: explicit page markers and lines repeated on most pages.

    Exact-text matching is used for repeats so numeric option rows ("A) 3 B) 9 …")
    that merely look alike are never removed.
    """
    import re

    def normalize(text: str) -> str:
        return re.sub(r"\s+", " ", text).strip().lower()

    exact: dict[str, set[int]] = {}
    for line in lines:
        if line.text:
            exact.setdefault(normalize(line.text), set()).add(line.page)

    page_count = len({line.page for line in lines}) or 1
    threshold = max(3, int(page_count * 0.5))

    out: list[LayoutLine] = []
    for line in lines:
        text = line.text
        lowered = text.lower()
        if re.search(r"\bpage\s*\d+", lowered) or re.fullmatch(r"[\s\-–—]*\d{1,4}[\s\-–—]*", text):
            continue
        if len(exact.get(normalize(text), set())) >= threshold and len(text) < 140:
            continue
        out.append(line)
    return out
