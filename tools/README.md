# tools/

Scripts used to turn a test PDF into a `.quizz` pack, and to check packs before delivery.

| Script | What it does |
|---|---|
| `quizzify.py` | PDF (or `.txt`) → `.quizz`. Detects questions, options, answer keys (block or inline), explanations, wraps, sections. Refuses to output a pack with a missing/invalid key. |
| `validate_pack.py` | Re-checks a `.quizz` file against the app's import rules (the same 12 rules). Exit `0` ok, `1` warnings, `2` errors. |
| `test_quizzify.py` | Builds synthetic PDFs (clean + messy) and asserts the converter output. `python3 tools/test_quizzify.py` |
| `vocab_pack.py` | Builds the HEC Vocabulary (Urdu) pack by hand, because that PDF's Urdu text layer is unusable (see below). |
| `vocab_study_pack.py` | Generates the 196-question study drill from the same 50-word list (Urdu meaning, synonym, antonym, part of speech, sentence completion). |
| `make_assets.py` | Regenerates the Android launcher icons, splash screens and PWA icons from the Quizz mark. |

## Usage

```bash
# convert
python3 tools/quizzify.py exam.pdf -o packs/chem-ch3.quizz \
    --title "Chemistry — Ch. 3" --subject Chemistry

# validate
python3 tools/validate_pack.py packs/*.quizz

# converter tests
python3 tools/test_quizzify.py
```

Dependencies: `pip install pdfplumber` for PDFs (`reportlab` only for the tests).
Plain `.txt` input needs no dependencies. `make_assets.py` needs `pillow`.

## PDFs with broken Urdu/Arabic text layers

Some generators (Chrome print-to-PDF with an Arabic font, for example) draw every
Urdu glyph as a **Type3 font** whose `ToUnicode` map resolves to `U+0000`. The
extracted text then contains NUL characters and the words cannot be recovered
programmatically — not by `pdfplumber`, not by `pypdf`.

Workflow for those files:

1. Render the page at 3–4× with `pypdfium2` and read the Urdu from the image.
2. Transcribe into a small data file (`vocab_pack.py` is the template for this
   test) with the question numbers, options and key exactly as printed.
3. Assert every key against the printed answer-key grid (the script does this —
   it caught a mis-transcribed letter in Q50).
4. Run `validate_pack.py` before committing.

The app bundles Noto Sans Arabic, so Urdu strings render identically offline.

## Generating study drills from a word list

`vocab_study_pack.py` turns the transcribed 50-word list into practice rounds, so
one PDF yields more than one pass over the same vocabulary. Rules it enforces
(they are assertions, not conventions — a violation stops the build):

* **Distractors come from the same list.** A wrong option is always another real
  word (or its real meaning), never invented filler.
* **One option per meaning cluster.** Words are grouped by shared meaning; an
  option is never drawn from the cluster the answer belongs to, so no two
  options can both be defensible.
* **No duplicate options**, and exactly one key that exists in the option list.
* **Question numbers are 1…N with no holes.** Rows skipped for a clean question
  (e.g. two words sharing a synonym) are not numbered, and group ranges are
  computed from the questions, not hardcoded.
* **Options are shuffled** with a fixed seed (`20261103`), so the run is
  reproducible and the key is spread over A–D.

If a round cannot host enough questions, fix the data — do not lower the
uniqueness checks.
