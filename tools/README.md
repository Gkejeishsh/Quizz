# tools/

Scripts used to turn a test PDF into a `.quizz` pack, and to check packs before delivery.

| Script | What it does |
|---|---|
| `quizzify.py` | PDF (or `.txt`) → `.quizz`. Detects questions, options, answer keys (block or inline), explanations, wraps, sections. Refuses to output a pack with a missing/invalid key. |
| `validate_pack.py` | Re-checks a `.quizz` file against the app's import rules (the same 12 rules). Exit `0` ok, `1` warnings, `2` errors. |
| `test_quizzify.py` | Builds synthetic PDFs (clean + messy) and asserts the converter output. `python3 tools/test_quizzify.py` |

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
Plain `.txt` input needs no dependencies.
