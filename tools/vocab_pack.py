#!/usr/bin/env python3
"""
Build packs/hec-vocab-urdu-test-1.quizz from
HEC_Vocabulary_50_Words_Urdu_Test-1.pdf.

The PDF's Urdu text layer is unusable (the glyphs are Type3 drawings whose
ToUnicode map resolves to NUL), so the Urdu strings here were transcribed from a
4x render of the page and cross-checked against the answer key. Every question,
option letter and option order matches the PDF exactly; the key comes from the
"Answer Key" grid on page 10.

    python3 tools/vocab_pack.py
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF = Path("/tmp/arena-coding-uploads/HEC_Vocabulary_50_Words_Urdu_Test-1.pdf")
OUT = ROOT / "packs" / "hec-vocab-urdu-test-1.quizz"

# (n, question, [A, B, C, D], key, explanation, page)
Q: list[tuple[int, str, list[str], str, str, int]] = [
    # ---------------- Part A: meaning in English (Q1–Q10) ----------------
    (
        1,
        "CAJOLE means:",
        ["force someone with threats", "scold harshly", "persuade by flattery", "ignore completely"],
        "C",
        "Cajole = persuade by flattery. The word's Latin root is caveola, a small cage — you trap someone sweetly rather than by force. Why the others tempt: “force someone with threats” and “scold harshly” are its opposite (coerce, berate); “ignore completely” drops the influence entirely.",
        4,
    ),
    (
        2,
        "IMMINENT means:",
        ["about to happen", "very old", "hard to believe", "impossible to find"],
        "A",
        "Imminent = about to happen. Note the -minent root (as in “imminent danger”): it hangs over you now. Why the others tempt: “very old” confuses it with eminent or ancient, “hard to believe” with incredible, “impossible to find” with inscrutable.",
        4,
    ),
    (
        3,
        "SIEGE means:",
        ["a celebration", "a peace treaty", "a sudden retreat", "a blockade of a place by an army"],
        "D",
        "Siege = a blockade of a place by an army, from sedere, “to sit” — the army sits outside until the town gives in. Why the others tempt: the -iege spelling resembles “siege of celebration” parties, and a siege is the opposite of both a peace treaty and a retreat.",
        4,
    ),
    (
        4,
        "CURTAIL means:",
        ["to lengthen", "to cut short", "to hide", "to praise"],
        "B",
        "Curtail = to cut short (curt- “short”). Why the others tempt: “to lengthen” is the direct antonym (extend); “to hide” borrows the disguise sense of cover; “to praise” is the meaning of extol, a different verb.",
        4,
    ),
    (
        5,
        "CANDID means:",
        ["frank and honest", "secretive", "shy", "angry"],
        "A",
        "Candid = frank and honest. In Latin candidus meant “white, bright”, hence a plain, open answer. Why the others tempt: “secretive” is the exact opposite, and it is easy to blend with “candid camera” trickiness (deceptive) rather than openness.",
        4,
    ),
    (
        6,
        "FRUGAL means:",
        ["wasteful", "generous", "careful with money", "very rich"],
        "C",
        "Frugal = careful with money, thrifty, from frux, “fruit/produce” — getting full value. Why the others tempt: “wasteful” is the antonym (extravagant); “generous” confuses thrift with meanness; “very rich” is about how much you have, not how you spend.",
        4,
    ),
    (
        7,
        "DICHOTOMY means:",
        ["a union of similar things", "a long journey", "a polite request", "a sharp division into two opposite parts"],
        "D",
        "Dichotomy = a sharp division into two opposites (di- “two” + tomia “cutting”). Why the others tempt: “a union of similar things” is the antonym; the “-tomy” ending is mistaken for “-nomy” (economy) or for a path/travel sense.",
        4,
    ),
    (
        8,
        "VERBOSE means:",
        ["silent", "using more words than needed", "speaking very softly", "speaking briefly"],
        "B",
        "Verbose = using more words than needed — verbose comes from verbum plus the -ose suffix meaning “full of”. Why the others tempt: “silent” and “speaking briefly” are opposites (terse, laconic); “speaking very softly” confuses wordiness with volume.",
        4,
    ),
    (
        9,
        "LENIENT means:",
        ["not strict; merciful", "cruel", "very angry", "careless"],
        "A",
        "Lenient = not strict, merciful (from lenire, “to soften”). Why the others tempt: “cruel” is the opposite (severe, harsh); “careless” confuses a deliberate leniency with negligence.",
        4,
    ),
    (
        10,
        "METICULOUS means:",
        ["lazy", "hurried", "very careful about small details", "forgetful"],
        "C",
        "Meticulous = very careful about small details. Why the others tempt: “hurried” and “lazy” both miss the painstaking sense; “forgetful” confuses care with memory, and meticulous attention is precisely the opposite of forgetting details.",
        4,
    ),
    # ---------------- Part B: meaning in Urdu (Q11–Q20) ----------------
    (
        11,
        "“خود مختار” means:",
        ["reciprocal", "autonomous", "obsolete", "notorious"],
        "B",
        "خود مختار = self-governing, i.e. autonomous (khud = self, mukhtar = in charge). Why the others tempt: reciprocal (with ہم آہنگ / باہمی) is the vocabulary word for mutual; obsolete (فرسودہ) and notorious (بدنام) are nearby list words but unrelated to self-rule.",
        5,
    ),
    (
        12,
        "HUMILIATION means:",
        ["عزت افزائی", "خوشی", "حیرت", "ذلت و رسوائی"],
        "D",
        "Humiliation = ذلت و رسوائی (disgrace). Why the others tempt: عزت افزائی means the opposite — increasing someone's honour; خوشی (joy) and حیرت (astonishment) pick up the emotion of the moment without the loss of dignity.",
        5,
    ),
    (
        13,
        "“مبہم” means:",
        ["ambiguous", "candid", "abundant", "diligent"],
        "A",
        "مبہم = unclear, with two possible meanings → ambiguous. Why the others tempt: candid (صاف گو) is about being plain-spoken, the opposite of ambiguous; abundant (کثیر) and diligent (محنتی) are list words with no link to vagueness.",
        5,
    ),
    (
        14,
        "BENEVOLENT means:",
        ["بدنیت", "کنجوس", "مہربان و نیک دل", "جلد باز"],
        "C",
        "Benevolent = well-wishing: bene- “good” + volens “wishing” → مہربان و نیک دل. Why the others tempt: بدنیت (ill-intentioned) and کنجوس (miserly) are opposites; جلد باز (hasty) replaces the “well-wishing” root with a false “bold” reading.",
        5,
    ),
    (
        15,
        "“بے سود” means:",
        ["vivid", "futile", "eloquent", "zealous"],
        "B",
        "بے سود = without profit/use → futile. Why the others tempt: vivid (روشن) and eloquent (فصیح) both sound positive, the reverse of futility; zealous (سرگرم) is enthusiasm, not uselessness.",
        5,
    ),
    (
        16,
        "NOTORIOUS means:",
        ["نیک نام", "گمنام", "بہادر", "بدنام"],
        "D",
        "Notorious = famous for something bad → بدنام. Why the others tempt: نیک نام (of good repute) is the opposite; گمنام (unknown) confuses fame with obscurity; بہادر (brave) is a virtue, not a bad reputation.",
        5,
    ),
    (
        17,
        "“ناگزیر” means:",
        ["trivial", "lenient", "inevitable", "prudent"],
        "C",
        "ناگزیر = unavoidable → inevitable (from guzar, “to pass/escape”; what cannot be escaped). Why the others tempt: trivial (معمولی) and lenient (نرم) are unrelated list words; prudent (محتاط) sounds careful but means cautious, not certain to happen.",
        5,
    ),
    (
        18,
        "HOSTILITY means:",
        ["دشمنی", "دوستی", "رحم", "صبر"],
        "A",
        "Hostility = enmity → دشمنی (hostis = enemy). Why the others tempt: دوستی (friendship) is the antonym; رحم (mercy) and صبر (patience) are calm virtues, not active ill will.",
        5,
    ),
    (
        19,
        "“فصیح” means:",
        ["verbose", "obscure", "meticulous", "eloquent"],
        "D",
        "فصیح = fluent and persuasive → eloquent. Why the others tempt: verbose (لفظوں کا زیادہ استعمال) is wordiness without force; obscure (مبہم) is the opposite of clear speech; meticulous (محقق) is about detail, not delivery.",
        5,
    ),
    (
        20,
        "PRUDENT means:",
        ["لاپرواہ", "دانشمند و محتاط", "غصہ ور", "سست"],
        "B",
        "Prudent = wise and careful about the future → دانشمند و محتاط. Why the others tempt: لاپرواہ (careless) and غصہ ور (irritable) are opposites of prudence; سست (lazy) confuses caution with slowness.",
        5,
    ),
    # ---------------- Part C: synonym (Q21–Q30) ----------------
    (
        21,
        "GENIALITY:",
        ["cordiality", "hostility", "rapidity", "beauty"],
        "A",
        "Geniality = friendly warmth → cordiality. Why the others tempt: hostility is its antonym; rapidity and beauty are distractor words chosen only for their -ity ending.",
        5,
    ),
    (
        22,
        "HEINOUS:",
        ["trivial", "pleasant", "atrocious", "ordinary"],
        "C",
        "Heinous = shockingly wicked → atrocious. Why the others tempt: trivial and ordinary both mean “not serious”, the direct opposite of a heinous crime; pleasant is the opposite of wicked.",
        6,
    ),
    (
        23,
        "PRAGMATIC:",
        ["dreamy", "practical", "careless", "emotional"],
        "B",
        "Pragmatic = practical, judging by results rather than theory. Why the others tempt: dreamy and emotional are the idealistic opposite; careless confuses “practical” with “sloppy”, but a pragmatic person is usually careful about what works.",
        6,
    ),
    (
        24,
        "SANCTITY:",
        ["cruelty", "wealth", "speed", "holiness"],
        "D",
        "Sanctity = holiness (sanctus = holy). Why the others tempt: cruelty is a moral opposite; wealth and speed are unrelated nouns with a similar rhythm.",
        6,
    ),
    (
        25,
        "CONFRONT:",
        ["avoid", "face", "hide", "forget"],
        "B",
        "Confront = face boldly (com- “together” + frons “forehead” — forehead to forehead). Why the others tempt: avoid and hide are the antonyms; forget removes the issue instead of meeting it.",
        6,
    ),
    (
        26,
        "OBSTRUCTION:",
        ["hindrance", "support", "gift", "signal"],
        "A",
        "Obstruction = blockage → hindrance. Why the others tempt: support is the opposite (it clears the way); gift and signal are unrelated fillers.",
        6,
    ),
    (
        27,
        "ABUNDANT:",
        ["scarce", "tiny", "plentiful", "hidden"],
        "C",
        "Abundant = plentiful, more than enough. Why the others tempt: scarce is its antonym; tiny describes size, not quantity; hidden describes visibility.",
        6,
    ),
    (
        28,
        "DILIGENT:",
        ["lazy", "angry", "clever", "industrious"],
        "D",
        "Diligent = hardworking → industrious. Why the others tempt: lazy is the antonym; clever is about intelligence, not effort; angry is a mood the word says nothing about.",
        6,
    ),
    (
        29,
        "TRIVIAL:",
        ["petty", "serious", "famous", "heavy"],
        "A",
        "Trivial = unimportant → petty. Why the others tempt: serious is the opposite; famous is about renown; heavy describes weight, not significance.",
        6,
    ),
    (
        30,
        "ZEALOUS:",
        ["apathetic", "gloomy", "enthusiastic", "tired"],
        "C",
        "Zealous = very enthusiastic (Greek zelos, “ardour”). Why the others tempt: apathetic and tired are the opposites; gloomy is a mood, not a lack of zeal.",
        6,
    ),
    # ---------------- Part D: antonym (Q31–Q40) ----------------
    (
        31,
        "IMPERIOUS:",
        ["domineering", "clever", "proud", "humble"],
        "D",
        "Imperious = arrogantly commanding, so the opposite is humble. Why the others tempt: domineering is a synonym (the trap here); proud is close to imperious but not its opposite; clever is unrelated.",
        6,
    ),
    (
        32,
        "AMATEUR:",
        ["novice", "professional", "beginner", "learner"],
        "B",
        "Amateur = non-professional, so the opposite is professional. Why the others tempt: novice, beginner and learner are all synonyms — three of the four options sit on the same side of the line, which is the hint.",
        6,
    ),
    (
        33,
        "REPULSIVE:",
        ["attractive", "disgusting", "nasty", "harsh"],
        "A",
        "Repulsive = disgusting, so the opposite is attractive. Why the others tempt: disgusting and nasty are synonyms; harsh describes manner, not appearance.",
        6,
    ),
    (
        34,
        "BILATERAL:",
        ["mutual", "joint", "unilateral", "reciprocal"],
        "C",
        "Bilateral = involving two sides, so the opposite is unilateral (one side). Why the others tempt: mutual, joint and reciprocal all mean “shared by two”, i.e. synonyms.",
        7,
    ),
    (
        35,
        "AGGRAVATE:",
        ["worsen", "alleviate", "inflame", "increase"],
        "B",
        "Aggravate = make worse, so the opposite is alleviate (ease). Why the others tempt: worsen, inflame and increase are all synonyms — aggravate literally means “to add weight”.",
        7,
    ),
    (
        36,
        "IMPARTIAL:",
        ["fair", "neutral", "honest", "biased"],
        "D",
        "Impartial = not taking sides, so the opposite is biased. Why the others tempt: fair, neutral and honest are its synonyms.",
        7,
    ),
    (
        37,
        "OBSOLETE:",
        ["current", "outdated", "ancient", "useless"],
        "A",
        "Obsolete = outdated, so the opposite is current. Why the others tempt: outdated and ancient are synonyms (ancient is merely older); useless is a consequence, not an antonym.",
        7,
    ),
    (
        38,
        "VIVID:",
        ["bright", "lively", "dull", "clear"],
        "C",
        "Vivid = bright, clear and lively, so the opposite is dull. Why the others tempt: bright, lively and clear are all synonyms of vivid.",
        7,
    ),
    (
        39,
        "MUNDANE:",
        ["ordinary", "extraordinary", "routine", "common"],
        "B",
        "Mundane = ordinary, dull, so the opposite is extraordinary. Why the others tempt: ordinary, routine and common are synonyms.",
        7,
    ),
    (
        40,
        "ABSTAIN:",
        ["avoid", "refrain", "resist", "indulge"],
        "D",
        "Abstain = keep from doing something, so the opposite is indulge. Why the others tempt: avoid, refrain and resist all mean holding back.",
        7,
    ),
    # ---------------- Part E: HEC-style sentences (Q41–Q50) ----------------
    (
        41,
        "The smell of fresh bread was REMINISCENT of his grandmother’s kitchen.",
        ["forgetful", "ignorant", "evocative", "unrelated"],
        "C",
        "Reminiscent of = bringing something back to mind → evocative of. Why the others tempt: forgetful sounds like “remind” but means a bad memory; ignorant is lack of knowledge; unrelated is the opposite of evoking a memory.",
        7,
    ),
    (
        42,
        "Rice is the STAPLE food of many countries.",
        ["basic", "rare", "luxurious", "seasonal"],
        "A",
        "Staple = the basic, main item of a diet. Why the others tempt: rare and luxurious are the opposite of everyday; seasonal describes availability over the year, not importance.",
        7,
    ),
    (
        43,
        "The two countries signed a RECIPROCAL trade agreement.",
        ["secret", "temporary", "unfair", "mutual"],
        "D",
        "Reciprocal = mutual, given in return. Why the others tempt: one-sided/unfair is its antonym; secret and temporary describe the agreement's timing or publicity, not its balance.",
        7,
    ),
    (
        44,
        "He waited with APPREHENSION for the exam result.",
        ["joy", "anxiety", "boredom", "pride"],
        "B",
        "Apprehension = anxiety about the future (apprehendere, “to seize” — dread seizes you). Why the others tempt: joy and pride are the feelings of a good result; boredom is indifference, not dread.",
        7,
    ),
    (
        45,
        "The doctor’s kind words DISPELLED her fears.",
        ["increased", "recorded", "drove away", "hid"],
        "C",
        "Dispel = drive away, scatter (dis- “apart” + pellere “to push”). Why the others tempt: increased is the opposite; hid confuses removing a fear with concealing it.",
        7,
    ),
    (
        46,
        "The dark clouds were an OMINOUS sign.",
        ["promising", "threatening", "unusual", "sudden"],
        "A",
        "Asked for the OPPOSITE of ominous (= threatening, a bad sign), so promising is the answer. Why the others tempt: threatening is a synonym (the trap); unusual and sudden describe how the sign appeared, not what it foretells.",
        8,
    ),
    (
        47,
        "His excuse sounded PLAUSIBLE.",
        ["believable", "convincing", "polite", "far-fetched"],
        "D",
        "Plausible = believable, so the opposite is far-fetched. Why the others tempt: believable and convincing are synonyms (the trap); polite describes tone, not credibility.",
        8,
    ),
    (
        48,
        "The meaning of the poem was OBSCURE.",
        ["hidden", "clear", "deep", "unclear"],
        "B",
        "Obscure = unclear, so the opposite is clear. Why the others tempt: hidden and unclear are synonyms (the trap); deep is often used approvingly of difficult poetry but is not an antonym.",
        8,
    ),
    (
        49,
        "He is a TENACIOUS fighter who never gives in.",
        ["weak-willed", "stubborn", "brave", "fierce"],
        "A",
        "Tenacious = persistent, holding firm, so the opposite is weak-willed. Why the others tempt: stubborn is a close synonym (the trap); brave and fierce are admired qualities, not opposites of persistence.",
        8,
    ),
    (
        50,
        "She showed great RESOLVE during the crisis.",
        ["determination", "courage", "hesitation", "patience"],
        "C",
        "Resolve = firm determination, so the opposite is hesitation. Why the others tempt: determination is a synonym (the trap), courage is a companion quality, and patience is endurance rather than wavering.",
        8,
    ),
]

KEY_GRID = "1C 2A 3D 4B 5A 6C 7D 8B 9A 10C 11B 12D 13A 14C 15B 16D 17C 18A 19D 20B 21A 22C 23B 24D 25B 26A 27C 28D 29A 30C 31D 32B 33A 34C 35B 36D 37A 38C 39B 40D 41C 42A 43D 44B 45C 46A 47D 48B 49A 50C"


def parse_key(grid: str) -> dict[int, str]:
    out: dict[int, str] = {}
    for token in grid.split():
        n = int(token[:-1])
        out[n] = token[-1]
    return out


def main() -> int:
    key = parse_key(KEY_GRID)
    assert len(key) == 50, f"key has {len(key)} entries"

    questions = []
    for n, text, options, answer, explanation, page in Q:
        assert key[n] == answer, f"Q{n}: handwritten {answer} != PDF key {key[n]}"
        assert len(options) == 4, f"Q{n}: {len(options)} options"
        questions.append(
            {
                "n": n,
                "type": "single",
                "question": text,
                "options": [{"key": k, "text": t} for k, t in zip("ABCD", options)],
                "answer": [answer],
                "explanation": explanation,
                "difficulty": "medium",
                "sourceRef": {"page": page},
            }
        )

    checksum = "sha256:" + hashlib.sha256(PDF.read_bytes()).hexdigest() if PDF.exists() else None
    pack = {
        "format": "quizz-pack",
        "formatVersion": 1,
        "id": "pck_hecvocab_urdu_1",
        "revision": 1,
        "supersedes": None,
        "title": "HEC Vocabulary — 50 Words (English & Urdu)",
        "subject": "English",
        "language": "en-ur",
        "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "instructions": (
            "50 questions in five parts: English meaning (1–10), Urdu meaning (11–20), "
            "synonym (21–30), antonym (31–40) and HEC-style sentences (41–50). "
            "Q1–Q25 are from past papers, Q26–Q50 are new words at the same level. "
            "No negative marking."
        ),
        "source": {
            "fileName": "HEC_Vocabulary_50_Words_Urdu_Test-1.pdf",
            "pages": 10,
            **({"checksum": checksum} if checksum else {}),
        },
        "groups": [
            {"id": "part-a", "type": "section", "title": "Part A — Meaning in English", "text": "Choose the correct meaning of the word in capital letters. (Q1–Q10)"},
            {"id": "part-b", "type": "section", "title": "Part B — Meaning in Urdu", "text": "Choose the correct word or the correct Urdu meaning. (Q11–Q20)"},
            {"id": "part-c", "type": "section", "title": "Part C — Synonym", "text": "Choose the word MOST NEARLY SIMILAR in meaning to the word in capital letters. (Q21–Q30)"},
            {"id": "part-d", "type": "section", "title": "Part D — Antonym", "text": "Choose the word MOST NEARLY OPPOSITE in meaning to the word in capital letters. (Q31–Q40)"},
            {"id": "part-e", "type": "section", "title": "Part E — HEC-style sentences", "text": "Q41–Q45: most nearly similar. Q46–Q50: most nearly opposite."},
        ],
        "questions": questions,
        "assets": {},
    }

    OUT.write_text(json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(questions)} questions, "
          f"{sum(1 for q in questions if q['explanation'])} explanations, "
          f"{OUT.stat().st_size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
