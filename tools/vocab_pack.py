#!/usr/bin/env python3
"""
Build packs/hec-vocab-urdu-test-1.quizz from the source PDF
(HEC_Vocabulary_50_Words_Urdu_Test-1.pdf).

Rebuilt from the PDF itself, not from a copy of the pack:

* Questions 1–10 and 21–50 are parsed straight out of the PDF's text layer —
  stems, option letters and option order exactly as printed.
* Questions 11–20 print Urdu, and this PDF draws Urdu with Type3 glyphs whose
  ToUnicode map resolves to NUL, so those strings are transcribed from a 3x
  render (see `URDU`) — they are the only hand-entered content in the pack.
* The key for every question comes from the printed "Answer Key" grid on
  page 10; the script refuses to write a pack whose key does not match it.
* The explanations are the authored ones (the paper has no explanation
  section) and are checked to exist for all 50 questions.

    python3 tools/vocab_pack.py            # rebuild the pack
    python3 tools/vocab_pack.py --check    # verify only, print the table
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF = Path("/tmp/arena-coding-uploads/HEC_Vocabulary_50_Words_Urdu_Test-1.pdf")
OUT = ROOT / "packs" / "hec-vocab-urdu-test-1.quizz"

PACK_ID = "pck_hecvocab_urdu_1"
REVISION = 2
EXPECTED_SHA256 = "0129555d6628fb0e0f40607ea0eebf04352949633b1a2b849a240098917d3fc2"
TEST_PAGES = range(4, 9)  # 1-based pages holding Q1–Q50
KEY_PAGE = 10
TOTAL = 50

# --------------------------------------------------------------------------
# The ten Urdu questions, transcribed from the render (page 5 of the PDF).
# (stem, [A, B, C, D], page)
# --------------------------------------------------------------------------
URDU: dict[int, tuple[str, list[str], int]] = {
    11: ("“خود مختار” means:", ["reciprocal", "autonomous", "obsolete", "notorious"], 5),
    12: ("HUMILIATION means:", ["عزت افزائی", "خوشی", "حیرت", "ذلت و رسوائی"], 5),
    13: ("“مبہم” means:", ["ambiguous", "candid", "abundant", "diligent"], 5),
    14: ("BENEVOLENT means:", ["بدنیت", "کنجوس", "مہربان و نیک دل", "جلد باز"], 5),
    15: ("“بے سود” means:", ["vivid", "futile", "eloquent", "zealous"], 5),
    16: ("NOTORIOUS means:", ["نیک نام", "گمنام", "بہادر", "بدنام"], 5),
    17: ("“ناگزیر” means:", ["trivial", "lenient", "inevitable", "prudent"], 5),
    18: ("HOSTILITY means:", ["دشمنی", "دوستی", "رحم", "صبر"], 5),
    19: ("“فصیح” means:", ["verbose", "obscure", "meticulous", "eloquent"], 5),
    20: ("PRUDENT means:", ["لاپرواہ", "دانشمند و محتاط", "غصہ ور", "سست"], 5),
}

# Authored explanations (the paper prints none), keyed by question number.
EXPLANATIONS: dict[int, str] = {
    1: "Cajole = persuade by flattery. The word's Latin root is caveola, a small cage — you trap someone sweetly rather than by force. Why the others tempt: “force someone with threats” and “scold harshly” are its opposite (coerce, berate); “ignore completely” drops the influence entirely.",
    2: "Imminent = about to happen. Note the -minent root (as in “imminent danger”): it hangs over you now. Why the others tempt: “very old” confuses it with eminent or ancient, “hard to believe” with incredible, “impossible to find” with inscrutable.",
    3: "Siege = a blockade of a place by an army, from sedere, “to sit” — the army sits outside until the town gives in. Why the others tempt: the -iege spelling resembles “siege of celebration” parties, and a siege is the opposite of both a peace treaty and a retreat.",
    4: "Curtail = to cut short (curt- “short”). Why the others tempt: “to lengthen” is the direct antonym (extend); “to hide” borrows the disguise sense of cover; “to praise” is the meaning of extol, a different verb.",
    5: "Candid = frank and honest. In Latin candidus meant “white, bright”, hence a plain, open answer. Why the others tempt: “secretive” is the exact opposite, and it is easy to blend with “candid camera” trickiness (deceptive) rather than openness.",
    6: "Frugal = careful with money, thrifty, from frux, “fruit/produce” — getting full value. Why the others tempt: “wasteful” is the antonym (extravagant); “generous” confuses thrift with meanness; “very rich” is about how much you have, not how you spend.",
    7: "Dichotomy = a sharp division into two opposites (di- “two” + tomia “cutting”). Why the others tempt: “a union of similar things” is the antonym; the “-tomy” ending is mistaken for “-nomy” (economy) or for a path/travel sense.",
    8: "Verbose = using more words than needed — verbose comes from verbum plus the -ose suffix meaning “full of”. Why the others tempt: “silent” and “speaking briefly” are opposites (terse, laconic); “speaking very softly” confuses wordiness with volume.",
    9: "Lenient = not strict, merciful (from lenire, “to soften”). Why the others tempt: “cruel” is the opposite (severe, harsh); “careless” confuses a deliberate leniency with negligence.",
    10: "Meticulous = very careful about small details. Why the others tempt: “hurried” and “lazy” both miss the painstaking sense; “forgetful” confuses care with memory, and meticulous attention is precisely the opposite of forgetting details.",
    11: "خود مختار = self-governing, i.e. autonomous (khud = self, mukhtar = in charge). Why the others tempt: reciprocal (with ہم آہنگ / باہمی) is the vocabulary word for mutual; obsolete (فرسودہ) and notorious (بدنام) are nearby list words but unrelated to self-rule.",
    12: "Humiliation = ذلت و رسوائی (disgrace). Why the others tempt: عزت افزائی means the opposite — increasing someone's honour; خوشی (joy) and حیرت (astonishment) pick up the emotion of the moment without the loss of dignity.",
    13: "مبہم = unclear, with two possible meanings → ambiguous. Why the others tempt: candid (صاف گو) is about being plain-spoken, the opposite of ambiguous; abundant (کثیر) and diligent (محنتی) are list words with no link to vagueness.",
    14: "Benevolent = well-wishing: bene- “good” + volens “wishing” → مہربان و نیک دل. Why the others tempt: بدنیت (ill-intentioned) and کنجوس (miserly) are opposites; جلد باز (hasty) replaces the “well-wishing” root with a false “bold” reading.",
    15: "بے سود = without profit/use → futile. Why the others tempt: vivid (روشن) and eloquent (فصیح) both sound positive, the reverse of futility; zealous (سرگرم) is enthusiasm, not uselessness.",
    16: "Notorious = famous for something bad → بدنام. Why the others tempt: نیک نام (of good repute) is the opposite; گمنام (unknown) confuses fame with obscurity; بہادر (brave) is a virtue, not a bad reputation.",
    17: "ناگزیر = unavoidable → inevitable (from guzar, “to pass/escape”; what cannot be escaped). Why the others tempt: trivial (معمولی) and lenient (نرم) are unrelated list words; prudent (محتاط) sounds careful but means cautious, not certain to happen.",
    18: "Hostility = enmity → دشمنی (hostis = enemy). Why the others tempt: دوستی (friendship) is the antonym; رحم (mercy) and صبر (patience) are calm virtues, not active ill will.",
    19: "فصیح = fluent and persuasive → eloquent. Why the others tempt: verbose (لفظوں کا زیادہ استعمال) is wordiness without force; obscure (مبہم) is the opposite of clear speech; meticulous (محقق) is about detail, not delivery.",
    20: "Prudent = wise and careful about the future → دانشمند و محتاط. Why the others tempt: لاپرواہ (careless) and غصہ ور (irritable) are opposites of prudence; سست (lazy) confuses caution with slowness.",
    21: "Geniality = friendly warmth → cordiality. Why the others tempt: hostility is its antonym; rapidity and beauty are distractor words chosen only for their -ity ending.",
    22: "Heinous = shockingly wicked → atrocious. Why the others tempt: trivial and ordinary both mean “not serious”, the direct opposite of a heinous crime; pleasant is the opposite of wicked.",
    23: "Pragmatic = practical, judging by results rather than theory. Why the others tempt: dreamy and emotional are the idealistic opposite; careless confuses “practical” with “sloppy”, but a pragmatic person is usually careful about what works.",
    24: "Sanctity = holiness (sanctus = holy). Why the others tempt: cruelty is a moral opposite; wealth and speed are unrelated nouns with a similar rhythm.",
    25: "Confront = face boldly (com- “together” + frons “forehead” — forehead to forehead). Why the others tempt: avoid and hide are the antonyms; forget removes the issue instead of meeting it.",
    26: "Obstruction = blockage → hindrance. Why the others tempt: support is the opposite (it clears the way); gift and signal are unrelated fillers.",
    27: "Abundant = plentiful, more than enough. Why the others tempt: scarce is its antonym; tiny describes size, not quantity; hidden describes visibility.",
    28: "Diligent = hardworking → industrious. Why the others tempt: lazy is the antonym; clever is about intelligence, not effort; angry is a mood the word says nothing about.",
    29: "Trivial = unimportant → petty. Why the others tempt: serious is the opposite; famous is about renown; heavy describes weight, not significance.",
    30: "Zealous = very enthusiastic (Greek zelos, “ardour”). Why the others tempt: apathetic and tired are the opposites; gloomy is a mood, not a lack of zeal.",
    31: "Imperious = arrogantly commanding, so the opposite is humble. Why the others tempt: domineering is a synonym (the trap here); proud is close to imperious but not its opposite; clever is unrelated.",
    32: "Amateur = non-professional, so the opposite is professional. Why the others tempt: novice, beginner and learner are all synonyms — three of the four options sit on the same side of the line, which is the hint.",
    33: "Repulsive = disgusting, so the opposite is attractive. Why the others tempt: disgusting and nasty are synonyms; harsh describes manner, not appearance.",
    34: "Bilateral = involving two sides, so the opposite is unilateral (one side). Why the others tempt: mutual, joint and reciprocal all mean “shared by two”, i.e. synonyms.",
    35: "Aggravate = make worse, so the opposite is alleviate (ease). Why the others tempt: worsen, inflame and increase are all synonyms — aggravate literally means “to add weight”.",
    36: "Impartial = not taking sides, so the opposite is biased. Why the others tempt: fair, neutral and honest are its synonyms.",
    37: "Obsolete = outdated, so the opposite is current. Why the others tempt: outdated and ancient are synonyms (ancient is merely older); useless is a consequence, not an antonym.",
    38: "Vivid = bright, clear and lively, so the opposite is dull. Why the others tempt: bright, lively and clear are all synonyms of vivid.",
    39: "Mundane = ordinary, dull, so the opposite is extraordinary. Why the others tempt: ordinary, routine and common are synonyms.",
    40: "Abstain = keep from doing something, so the opposite is indulge. Why the others tempt: avoid, refrain and resist all mean holding back.",
    41: "Reminiscent of = bringing something back to mind → evocative of. Why the others tempt: forgetful sounds like “remind” but means a bad memory; ignorant is lack of knowledge; unrelated is the opposite of evoking a memory.",
    42: "Staple = the basic, main item of a diet. Why the others tempt: rare and luxurious are the opposite of everyday; seasonal describes availability over the year, not importance.",
    43: "Reciprocal = mutual, given in return. Why the others tempt: one-sided/unfair is its antonym; secret and temporary describe the agreement's timing or publicity, not its balance.",
    44: "Apprehension = anxiety about the future (apprehendere, “to seize” — dread seizes you). Why the others tempt: joy and pride are the feelings of a good result; boredom is indifference, not dread.",
    45: "Dispel = drive away, scatter (dis- “apart” + pellere “to push”). Why the others tempt: increased is the opposite; hid confuses removing a fear with concealing it.",
    46: "Asked for the OPPOSITE of ominous (= threatening, a bad sign), so promising is the answer. Why the others tempt: threatening is a synonym (the trap); unusual and sudden describe how the sign appeared, not what it foretells.",
    47: "Plausible = believable, so the opposite is far-fetched. Why the others tempt: believable and convincing are synonyms (the trap); polite describes tone, not credibility.",
    48: "Obscure = unclear, so the opposite is clear. Why the others tempt: hidden and unclear are synonyms (the trap); deep is often used approvingly of difficult poetry but is not an antonym.",
    49: "Tenacious = persistent, holding firm, so the opposite is weak-willed. Why the others tempt: stubborn is a close synonym (the trap); brave and fierce are admired qualities, not opposites of persistence.",
    50: "Resolve = firm determination, so the opposite is hesitation. Why the others tempt: determination is a synonym (the trap), courage is a companion quality, and patience is endurance rather than wavering.",
}


def _clean_text_layers() -> tuple[dict[int, str], str]:
    """Return ({page: text}, answer-key page text) with headers/footers removed."""
    import pdfplumber  # imported late so --help works without the dependency

    def clean(text: str) -> str:
        text = re.sub(r"^\s*\d{1,2}/\d{1,2}/\d{2},.*$", "", text, flags=re.M)  # running header
        text = re.sub(r"^\s*HEC Vocabulary Pack \| Page \d+\s*$", "", text, flags=re.M)  # footer
        return text

    with pdfplumber.open(PDF) as pdf:
        if len(pdf.pages) < KEY_PAGE:
            raise SystemExit(f"{PDF.name}: expected {KEY_PAGE} pages, found {len(pdf.pages)}")
        pages = {p: clean(pdf.pages[p - 1].extract_text() or "") for p in TEST_PAGES}
        key_text = clean(pdf.pages[KEY_PAGE - 1].extract_text() or "")
    return pages, key_text


# "12. " at the start of a line opens a question block; a block ends where the
# next instruction or part heading starts.
BLOCK_START = re.compile(r"(?m)^\s*(\d{1,2})\.\s*")
BLOCK_END = re.compile(r"(?m)^\s*(?:PART [A-E]:|Choose the word)")
OPTIONS = re.compile(r"(?<![A-Za-z])A\)(.*?)B\)(.*?)C\)(.*?)D\)(.*)", re.S)
KEY_PAIR = re.compile(r"(?<![\d/\u2013-])(\d{1,2})\s*([A-D])(?![A-Za-z])")


def _squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_blocks(pages: dict[int, str]) -> dict[int, tuple[str, list[str], int]]:
    """Questions parsed out of the text layer, page by page."""
    parsed: dict[int, tuple[str, list[str], int]] = {}
    for page, text in pages.items():
        chunks = BLOCK_START.split(text)
        for i in range(1, len(chunks) - 1, 2):
            n = int(chunks[i])
            body = BLOCK_END.split(chunks[i + 1])[0]
            if n in parsed:
                raise SystemExit(f"question {n} appears twice in the PDF")
            stem = _squash(body.split("A)", 1)[0])
            match = OPTIONS.search(body)
            options = [_squash(g) for g in match.groups()] if match else []
            parsed[n] = (stem, options, page)
    return parsed


def parse_keys(key_text: str) -> dict[int, str]:
    keys: dict[int, str] = {}
    for n, letter in KEY_PAIR.findall(key_text):
        keys[int(n)] = letter
    return keys


def build_questions() -> list[dict]:
    parsed = parse_blocks(_clean_text_layers()[0])
    keys = parse_keys(_clean_text_layers()[1])

    missing = sorted(set(range(1, TOTAL + 1)) - set(parsed))
    extra = sorted(set(parsed) - set(range(1, TOTAL + 1)))
    if missing or extra:
        raise SystemExit(f"PDF parse mismatch — missing {missing}, unexpected {extra}")

    questions: list[dict] = []
    for n in range(1, TOTAL + 1):
        if n in URDU:
            stem, options, page = URDU[n]
        else:
            stem, options, page = parsed[n]
            # English questions must come out of the text layer cleanly; NULs
            # here would mean the Urdu Type3 problem spread to an English block.
            if "\x00" in stem or any("\x00" in o for o in options):
                raise SystemExit(f"Q{n}: unreadable characters in an English question")
        if len(options) != 4:
            raise SystemExit(f"Q{n}: expected 4 options, parsed {len(options)}: {options}")
        if not stem or any(not o for o in options):
            raise SystemExit(f"Q{n}: empty stem or option — {stem!r} {options!r}")
        if len(set(options)) != 4:
            raise SystemExit(f"Q{n}: duplicate options {options}")
        if n not in keys:
            raise SystemExit(f"Q{n}: no key in the printed answer-key grid")
        if n not in EXPLANATIONS:
            raise SystemExit(f"Q{n}: missing explanation")
        questions.append(
            {
                "n": n,
                "type": "single",
                "question": stem,
                "options": [{"key": k, "text": t} for k, t in zip("ABCD", options)],
                "answer": [keys[n]],
                "explanation": EXPLANATIONS[n],
                "difficulty": "easy" if n <= 20 else "medium",
                "sourceRef": {"page": page},
            }
        )
    return questions


def build() -> dict:
    digest = hashlib.sha256(PDF.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"{PDF.name}: checksum changed ({digest}) — re-verify the transcription")

    questions = build_questions()

    def section(slug: str, title: str, note: str, first: int, last: int) -> dict:
        return {"id": slug, "type": "section", "title": title, "text": f"{note} (Q{first}–Q{last})"}

    return {
        "format": "quizz-pack",
        "formatVersion": 1,
        "id": PACK_ID,
        "revision": REVISION,
        "supersedes": None,
        "title": "HEC Vocabulary — 50 Words (English & Urdu)",
        "subject": "English",
        "language": "en-ur",
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "instructions": (
            "50 questions in five parts: English meaning (1–10), Urdu meaning (11–20), "
            "synonym (21–30), antonym (31–40) and HEC-style sentences (41–50). "
            "Q1–Q25 are past-paper words, Q26–Q50 new words at the same level. "
            "No negative marking. Paper bands: 45–50 strong, 38–44 good (revise the "
            "missed words), below 38 re-learn the list and retest in two days."
        ),
        "source": {
            "fileName": "HEC_Vocabulary_50_Words_Urdu_Test-1.pdf",
            "pages": KEY_PAGE,
            "checksum": f"sha256:{digest}",
        },
        "groups": [
            section("part-a", "Part A — Meaning in English", "Choose the correct meaning of the word in capital letters.", 1, 10),
            section("part-b", "Part B — Meaning in Urdu", "Choose the correct word or the correct Urdu meaning.", 11, 20),
            section("part-c", "Part C — Synonym", "Choose the word MOST NEARLY SIMILAR in meaning to the word in capital letters.", 21, 30),
            section("part-d", "Part D — Antonym", "Choose the word MOST NEARLY OPPOSITE in meaning to the word in capital letters.", 31, 40),
            section("part-e", "Part E — HEC-style sentences", "Choose the word that fits the sentence (Q41–Q45 similar, Q46–Q50 opposite).", 41, 50),
        ],
        "questions": questions,
        "assets": {},
    }


def main(argv: list[str]) -> int:
    pack = build()
    questions = pack["questions"]

    if "--check" in argv:
        for q in questions:
            print(f"Q{q['n']:>2} p{q['sourceRef']['page']} {q['answer'][0]}  {q['question'][:64]}")
        urdu = sum(1 for q in questions if any("\u0600" <= c <= "\u06ff" for c in q["question"]))
        print(f"\n{len(questions)} questions · {urdu} with Urdu stems · key read from page 10")
        return 0

    OUT.write_text(json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    urdu_options = sum(
        1 for q in questions if any("\u0600" <= c <= "\u06ff" for o in q["options"] for c in o["text"])
    )
    print(
        f"wrote {OUT.relative_to(ROOT)} — {len(questions)} questions, {urdu_options} with Urdu options, "
        f"{OUT.stat().st_size / 1024:.1f} KB, revision {pack['revision']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
