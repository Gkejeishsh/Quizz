#!/usr/bin/env python3
"""
Build packs/hec-vocab-urdu-study.quizz — a practice test generated from the
50-word vocabulary list on pages 1–3 of HEC_Vocabulary_50_Words_Urdu_Test-1.pdf.

Why generated rather than hand-written: the list has four facts per row (Urdu
meaning, synonym, antonym, part of speech), so a rule script can build the
questions *and* prove every answer is unique and correct. Distractors are drawn
from the other rows of the same list (never invented), and the script asserts:

  * exactly four options per question, no duplicates;
  * the key is the only correct option;
  * each Urdu gloss shown as an option belongs to exactly one word.

The Urdu column exists only as Type3 glyph drawings in the PDF (its text layer
resolves to NUL), so it was transcribed from a 4x render of the page.

    python3 tools/vocab_study_pack.py
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF = Path("/tmp/arena-coding-uploads/HEC_Vocabulary_50_Words_Urdu_Test-1.pdf")
OUT = ROOT / "packs" / "hec-vocab-urdu-study.quizz"

# n, word, pos, english meaning, urdu meaning, synonym, antonym
WORDS: list[tuple[int, str, str, str, str, str, str]] = [
    (1, "Geniality", "n.", "friendly warmth", "خوش مزاجی، ملنساری", "cordiality", "coldness"),
    (2, "Cajole", "v.", "persuade by flattery", "خوشامد یا میٹھی باتوں سے راضی کرنا", "coax", "compel"),
    (3, "Imperious", "adj.", "arrogant, commanding", "متکبر، تحکمانہ", "domineering", "humble"),
    (4, "Imminent", "adj.", "about to happen", "قریب الوقوع", "impending", "remote"),
    (5, "Bilateral", "adj.", "involving two sides", "دو طرفہ", "two-sided", "unilateral"),
    (6, "Amateur", "n.", "non-professional", "شوقیہ، غیر پیشہ ور", "novice", "professional"),
    (7, "Confront", "v.", "face boldly", "ڈٹ کر سامنا کرنا", "face", "evade"),
    (8, "Siege", "n.", "blockade of a place", "محاصرہ", "blockade", "—"),
    (9, "Humiliation", "n.", "loss of dignity", "ذلت، رسوائی", "disgrace", "honour"),
    (10, "Reminiscent", "adj.", "reminding of something", "یاد دلانے والا", "evocative", "—"),
    (11, "Dichotomy", "n.", "sharp split into two opposites", "دو متضاد حصوں میں تقسیم", "split", "union"),
    (12, "Pragmatic", "adj.", "practical", "عملی، حقیقت پسند", "realistic", "idealistic"),
    (13, "Sanctity", "n.", "holiness", "تقدس، حرمت", "holiness", "profanity"),
    (14, "Heinous", "adj.", "shockingly wicked", "گھناؤنا، نہایت قبیح", "atrocious", "noble"),
    (15, "Repulsive", "adj.", "disgusting", "کراہت انگیز", "revolting", "attractive"),
    (16, "Curtail", "v.", "cut short", "کم کرنا، مختصر کرنا", "reduce", "extend"),
    (17, "Staple", "adj.", "basic, main", "بنیادی (خوراک)", "basic", "minor"),
    (18, "Autonomous", "adj.", "self-governing", "خود مختار", "independent", "dependent"),
    (19, "Reciprocal", "adj.", "mutual, in return", "باہمی، ایک دوسرے کے جواب میں کیا جانے والا", "mutual", "one-sided"),
    (20, "Apprehension", "n.", "anxiety about the future", "خدشہ، اندیشہ", "dread", "confidence"),
    (21, "Obstruction", "n.", "blockage", "رکاوٹ", "hindrance", "aid"),
    (22, "Aggravate", "v.", "make worse", "بگاڑنا، بدتر کرنا", "worsen", "alleviate"),
    (23, "Dispel", "v.", "drive away", "دور کرنا", "banish", "gather"),
    (24, "Hostility", "n.", "enmity", "دشمنی، عداوت", "animosity", "friendliness"),
    (25, "Resolve", "n.", "firm determination", "پختہ ارادہ", "determination", "hesitation"),
    (26, "Candid", "adj.", "frank", "صاف گو، کھرا", "frank", "evasive"),
    (27, "Prudent", "adj.", "wise and careful", "دانشمند، محتاط", "cautious", "reckless"),
    (28, "Frugal", "adj.", "thrifty", "کفایت شعار", "thrifty", "extravagant"),
    (29, "Mundane", "adj.", "ordinary, dull", "عام، روزمرہ کا، غیر دلچسپ", "routine", "extraordinary"),
    (30, "Obsolete", "adj.", "outdated", "متروک، فرسودہ", "outdated", "current"),
    (31, "Verbose", "adj.", "wordy", "ضرورت سے زیادہ الفاظ استعمال کرنے والا", "wordy", "concise"),
    (32, "Benevolent", "adj.", "kind, generous", "مہربان، نیک دل", "kind", "malevolent"),
    (33, "Abundant", "adj.", "plentiful", "وافر", "plentiful", "scarce"),
    (34, "Ambiguous", "adj.", "unclear, with two meanings", "مبہم", "vague", "clear"),
    (35, "Diligent", "adj.", "hardworking", "محنتی", "industrious", "lazy"),
    (36, "Futile", "adj.", "useless", "بے سود، لاحاصل", "pointless", "fruitful"),
    (37, "Impartial", "adj.", "unbiased", "غیر جانبدار", "neutral", "biased"),
    (38, "Inevitable", "adj.", "unavoidable", "ناگزیر", "unavoidable", "avoidable"),
    (39, "Lenient", "adj.", "merciful, not strict", "نرمی برتنے والا، رعایت دینے والا", "merciful", "strict"),
    (40, "Meticulous", "adj.", "very careful about details", "نہایت محتاط، باریک بیں", "precise", "careless"),
    (41, "Notorious", "adj.", "famous for something bad", "بدنام", "infamous", "reputable"),
    (42, "Obscure", "adj.", "unclear, little known", "غیر واضح، کم معروف", "vague", "clear"),
    (43, "Ominous", "adj.", "threatening, a bad sign", "منحوس، بدشگون", "sinister", "promising"),
    (44, "Plausible", "adj.", "believable", "قریب قیاس", "believable", "far-fetched"),
    (45, "Tenacious", "adj.", "persistent, holding firm", "ثابت قدم، ڈٹا رہنے والا", "persistent", "yielding"),
    (46, "Trivial", "adj.", "unimportant", "معمولی، غیر اہم", "petty", "significant"),
    (47, "Vivid", "adj.", "bright, clear, lively", "روشن، واضح، جاندار", "bright", "dull"),
    (48, "Zealous", "adj.", "very enthusiastic", "پرجوش، جوشیلا", "enthusiastic", "apathetic"),
    (49, "Abstain", "v.", "keep from doing", "پرہیز کرنا، باز رہنا", "refrain", "indulge"),
    (50, "Eloquent", "adj.", "fluent and persuasive", "فصیح، شیریں بیان", "articulate", "inarticulate"),
]

LETTERS = "ABCD"

# Options that mean nearly the same thing must never appear together, or a
# question would have two defensible answers. Each group is one meaning.
CLUSTERS: list[set[str]] = [
    {"unilateral", "one-sided", "biased"},
    {"extend", "lengthen"},
    {"alleviate", "ease"},
    {"clear", "obvious"},
    {"significant", "important"},
    {"professional", "expert"},
    {"attractive", "appealing", "pleasant"},
    {"promising", "hopeful"},
    {"current", "modern", "up-to-date"},
    {"careless", "reckless"},
    {"coldness", "indifference"},
    {"humble", "modest"},
    {"evasive", "secretive"},
    {"lazy", "idle"},
    {"scarce", "rare"},
    {"concise", "brief"},
    {"dull", "boring"},
    {"remote", "distant"},
    {"noble", "honour"},
    {"union", "unity"},
    {"gather", "collect"},
    {"compel", "force"},
    {"hesitation", "doubt"},
    {"dependent", "reliant"},
    {"vague", "ambiguous", "unclear", "obscure"},
    {"kind", "benevolent", "generous"},
    {"plentiful", "abundant"},
    {"holiness", "sanctity"},
    {"dread", "apprehension"},
    {"basic", "fundamental"},
    {"face", "confront"},
    {"novice", "amateur", "beginner"},
    {"determination", "resolve"},
    {"frank", "candid"},
    {"cautious", "prudent"},
    {"thrifty", "frugal"},
    {"outdated", "obsolete"},
    {"wordy", "verbose"},
    {"industrious", "diligent"},
    {"neutral", "impartial"},
    {"unavoidable", "inevitable"},
    {"merciful", "lenient"},
    {"precise", "meticulous"},
    {"persistent", "tenacious"},
    {"bright", "vivid"},
    {"enthusiastic", "zealous"},
    {"refrain", "abstain"},
    {"articulate", "eloquent"},
    {"blockade", "siege"},
    {"split", "dichotomy"},
]


def cluster_of(word: str) -> frozenset[str]:
    for group in CLUSTERS:
        if word in group:
            return frozenset(group)
    return frozenset({word})


def build() -> dict:
    rng = random.Random(20261103)  # fixed seed: the pack is reproducible

    synonyms = {w[5] for w in WORDS}
    antonyms = {w[6] for w in WORDS if w[6] != "—"}

    def options(correct: str, pool: list[str], n: int = 4) -> tuple[list[str], str]:
        """Shuffle the correct answer into n-1 distinct distractors from `pool`.

        A distractor from the same meaning cluster as the answer (or as another
        distractor) is skipped, so exactly one option can be defended.
        """
        picks: list[str] = []
        used = {cluster_of(correct)}
        for cand in rng.sample(pool, len(pool)):
            if cand == correct or cand in picks:
                continue
            group = cluster_of(cand)
            if group in used:
                continue
            picks.append(cand)
            used.add(group)
            if len(picks) == n - 1:
                break
        assert len(picks) == n - 1, f"not enough distractors for {correct!r}"
        opts = picks + [correct]
        rng.shuffle(opts)
        key = LETTERS[opts.index(correct)]
        assert opts.count(correct) == 1
        return opts, key

    def q(
        n: int, text: str, opts: list[str], key: str, explanation: str, page: int, tag: str
    ) -> dict:
        assert 3 <= len(opts) <= 4 and len(set(opts)) == len(opts), f"Q{n} options: {opts}"
        return {
            "n": n,
            "type": "single",
            "question": text,
            "options": [{"key": k, "text": t} for k, t in zip(LETTERS, opts)],
            "answer": [key],
            "explanation": explanation,
            "difficulty": "easy",
            "tags": [tag],
            "sourceRef": {"page": page},
        }

    questions: list[dict] = []
    n = 0

    # ---- part 1: Urdu meaning of each word (50) ----
    urdu_pool = [w[4] for w in WORDS]
    for row_n, word, pos, eng, urdu, syn, ant in WORDS:
        n += 1
        opts, key = options(urdu, urdu_pool)
        page = 1 if row_n <= 17 else 2 if row_n <= 40 else 3
        questions.append(
            q(
                n,
                f"What does “{word}” ({pos}) mean in Urdu?",
                opts,
                key,
                f"{word} ({pos}) = {urdu} — English meaning: “{eng}”. "
                f"Remember it with its synonym {syn}"
                + (f" and its opposite {ant}." if ant != "—" else "."),
                page,
                "urdu-meaning",
            )
        )

    # ---- part 2: synonym of each word (25, the past-paper rows) ----
    for row_n, word, pos, eng, urdu, syn, ant in WORDS[:25]:
        n += 1
        opts, key = options(syn, sorted(synonyms))
        page = 1 if row_n <= 17 else 2
        questions.append(
            q(
                n,
                f"Choose the word MOST NEARLY SIMILAR in meaning to {word.upper()}:",
                opts,
                key,
                f"{word} = {syn}. Urdu: {urdu}"
                + (f". Its opposite is {ant}." if ant != "—" else "."),
                page,
                "synonym",
            )
        )

    # ---- part 3: antonym of each word (25, the new-word rows) ----
    for row_n, word, pos, eng, urdu, syn, ant in WORDS[25:]:
        n += 1
        opts, key = options(ant, sorted(antonyms))
        page = 2 if row_n <= 40 else 3
        questions.append(
            q(
                n,
                f"Choose the word MOST NEARLY OPPOSITE in meaning to {word.upper()}:",
                opts,
                key,
                (
                    f"{word} = {eng}"
                    + (f" (= {syn})" if syn.lower() != eng.lower() else "")
                    + f"; its opposite is {ant}. Urdu: {urdu}."
                ),
                page,
                "antonym",
            )
        )

    # ---- part 4: part of speech (50) ----
    # only three parts of speech occur in the list, so these carry three options
    pos_pool = ["n.", "v.", "adj."]
    for row_n, word, pos, eng, urdu, syn, ant in WORDS:
        n += 1
        opts, key = options(pos, pos_pool, n=3)
        page = 1 if row_n <= 17 else 2 if row_n <= 40 else 3
        questions.append(
            q(
                n,
                f"What part of speech is “{word}”?",
                opts,
                key,
                f"{word} is {pos} — {eng}. Urdu: {urdu}.",
                page,
                "part-of-speech",
            )
        )

    # ---- part 5: sentence completion (50) ----
    vetted = [w for w in WORDS if w[6] != "—"]
    for row_n, word, pos, eng, urdu, syn, ant in vetted:
        # The cue is the word's synonym, so skip the two rows that share one
        # ("vague" covers both Ambiguous and Obscure) — otherwise the question
        # would have two defensible answers.
        if sum(1 for w in WORDS if w[5] == syn) > 1:
            continue
        n += 1
        opts, key = options(word, [w[1] for w in WORDS])
        page = 1 if row_n <= 17 else 2 if row_n <= 40 else 3
        questions.append(
            q(
                n,
                f"Which word fits? “{syn.capitalize()} is the same as ______ ({eng}).”",
                opts,
                key,
                f"{syn} means {eng}, so the word is {word} ({pos}). Urdu: {urdu}."
                f" The opposite is {ant}.",
                page,
                "sentence",
            )
        )

    # Number 1..N exactly: a skipped row must never leave a hole in the paper.
    for i, q_ in enumerate(questions, 1):
        q_["n"] = i
    assert [q_["n"] for q_ in questions] == list(range(1, len(questions) + 1))

    # global validity checks
    assert len({q_["n"] for q_ in questions}) == len(questions), "duplicate question numbers"
    for q_ in questions:
        assert q_["answer"][0] in {o["key"] for o in q_["options"]}

    def section(slug: str, heading: str, tag: str) -> dict:
        nums = [q_["n"] for q_ in questions if tag in q_["tags"]]
        return {
            "id": slug,
            "type": "section",
            "title": heading,
            "text": f"Questions {nums[0]}–{nums[-1]}",
        }

    title = f"HEC Vocabulary Study Drill ({len(questions)})"

    checksum = "sha256:" + hashlib.sha256(PDF.read_bytes()).hexdigest() if PDF.exists() else None
    return {
        "format": "quizz-pack",
        "formatVersion": 1,
        "id": "pck_hecvocab_study_1",
        "revision": 1,
        "supersedes": None,
        "title": title,
        "subject": "English",
        "language": "en-ur",
        "createdAt": "2026-11-03T05:00:00Z",
        "instructions": (
            "Generated from the 50-word HEC vocabulary list. Five rounds: "
            "Urdu meaning, synonym (past-paper words 1–25), antonym (new words 26–50), "
            "part of speech, and sentence completion. Every wrong option is a real word "
            "from the same list. Word numbers match the list."
        ),
        "source": {
            "fileName": "HEC_Vocabulary_50_Words_Urdu_Test-1.pdf",
            "pages": 3,
            **({"checksum": checksum} if checksum else {}),
        },
        "groups": [
            section("g-urdu", "Round 1 — Urdu meaning", "urdu-meaning"),
            section("g-syn", "Round 2 — Synonym", "synonym"),
            section("g-ant", "Round 3 — Antonym", "antonym"),
            section("g-pos", "Round 4 — Part of speech", "part-of-speech"),
            section("g-sentence", "Round 5 — Sentence completion", "sentence"),
        ],
        "questions": questions,
        "assets": {},
    }


def main() -> int:
    pack = build()
    OUT.write_text(json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    urdu = sum(1 for q in pack["questions"] if any("\u0600" <= c <= "\u06FF" for c in q["question"]))
    print(
        f"wrote {OUT.relative_to(ROOT)} — {len(pack['questions'])} questions "
        f"({urdu} with Urdu stems), {OUT.stat().st_size / 1024:.1f} KB"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
