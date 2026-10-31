# Turning your test PDF into a `.quizz` file

You send me a PDF. I run it through the converter, check every question by hand, and send back a `.quizz` file you import once. After that the test lives inside the app — the PDF is no longer needed.

## 1. What makes a PDF convert perfectly

The converter handles normal AI-generated tests: numbered questions, `A) B) C) D)` options, an answer key block, and an explanations section. It also handles `(a) (b)` lowercase options, inline `Answer: B` lines, and questions wrapped over several lines.

It converts best when the PDF has:

- Continuous numbering `1. 2. 3.` (no section restarts)
- One option per line: `A) text`, `B) text`, …
- An `Answer Key` section: one line per question, `1. B`
- An `Explanations` section: one entry per question
- No tables, no two-column layout, no scanned images

Paste this into the AI before your topic request (Appendix A in `PLAN.md`):

```
Generate a multiple-choice test PDF with this exact structure:

1. Title line: "Test: <subject> — <topic>" and a line "Total questions: N".
2. Questions numbered continuously as "1.", "2.", ... with no section restarts.
3. Exactly four options per question, each on its own line, formatted:
   A) option text
   B) option text
   C) option text
   D) option text
4. No tables, no answer boxes, no two-column layout, no images unless necessary.
5. After all questions, a section titled "Answer Key" with one line per question:
   1. B
   2. C
6. After that, a section titled "Explanations" with one entry per question:
   1. <2–4 sentences explaining why the key is correct and the others are not>
7. Keep all math as plain Unicode (×, ÷, ², √, π, °) or LaTeX in $...$.
8. Use the same option order in the questions and the explanations.
```

## 2. What I do with it

```bash
python3 tools/quizzify.py my-test.pdf -o packs/my-test.quizz \
  --title "Chemistry — Ch. 3 Chemical Bonding" --subject Chemistry

python3 tools/validate_pack.py packs/my-test.quizz
```

`quizzify` prints a report — questions, answer keys found, explanations found, warnings — and refuses to write a file if any answer key is missing or points at a non-existent option. Then I spot-check the questions against the PDF.

## 3. How you import it

1. Save the `.quizz` file on your phone (WhatsApp, Drive, Downloads).
2. Open **Quizz → Add new test → Upload file** (or share the file to Quizz).
3. Pick a name and a category → **Save**.

The test is copied into the app's own storage. Deleting the original PDF or the `.quizz` file later does not affect it.

## 4. Common warnings

| Report line | Meaning | What to do |
|---|---|---|
| `Q7: no answer key found` | The key section is missing question 7 | Regenerate the PDF with a complete key |
| `answer key [E] is not one of the options` | Mismatch between key and options | Regenerate, or I fix it manually |
| `Q12: no explanation` | The explanation section skipped a question | Optional — the app hides "Show explanation" for that question |
| `No text layer found` | The PDF is a scan | Export a text-based PDF |
| `Duplicate question numbers` | Sections restart numbering | I merge them with section labels |

## 5. Notes

- Numbers and option order are preserved exactly as printed.
- Math: plain Unicode (², √, π) is kept as-is; `$…$` becomes rendered LaTeX in the app.
- Files are capped at 12 MB and 500 questions.
- If you edit a test, send the new PDF and I ship a revision — the app recognises the same test and offers to replace it.
