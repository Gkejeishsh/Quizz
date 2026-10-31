# Quizz

An offline Android quiz player for AI-generated PDF tests. You give me a test PDF (questions + answer key + explanations); I convert it into a `.quizz` file; the app plays it as a real MCQ exam, marks it instantly, shows your wrong answers next to the correct ones, and keeps your score history.

- **No AI in the app, no accounts, no internet required.**
- **Full plan:** [`PLAN.md`](PLAN.md) · **File format:** [`docs/quizz-pack.schema.json`](docs/quizz-pack.schema.json) · **Example:** [`docs/sample-pack.quizz`](docs/sample-pack.quizz)

## Try it

```bash
npm install
npm run dev        # http://localhost:5173  (mobile-sized preview)
npm test           # 27 unit + end-to-end tests
npm run build
```

The first launch seeds three demo tests so every screen has real content.

## What works today (M1–M5)

- **Design system** — dark + light themes, Bricolage Grotesque display type, Plus Jakarta body, JetBrains Mono numerals, spring motion, haptics, reduced-motion support, safe-area tokens.
- **Home** — logo, History button, theme switch, "Add new test" / "Saved tests", resume card, stats.
- **Import** — upload a `.quizz` file (validated with a 12-rule validator and a readable error report), or add a bundled pack from the Library tab. Save with a custom name and category; duplicate files are detected.
- **Saved tests** — category chips with counts, search, date groupings (Today / Yesterday / Last 7 days / This month / Earlier), rename / move / delete, best score per test.
- **Quiz** — one question at a time, PDF numbering and option order preserved, no correct/wrong reveal while answering, back to edit, autosave + resume, optional one-time timer that is never remembered, multi-select support, LaTeX questions.
- **Results** — animated score ring, correct/wrong/skipped, time, mistakes with your pick vs the correct one and the explanation, retry-wrong-only.
- **Explanations** — full review with filters (All / Wrong / Skipped / Correct), answer keys shown without playing.
- **History** — best / latest / attempt count per test, sparkline, per-attempt results, survives test deletion.
- **Categories & settings** — add / rename / delete (tests move to Uncategorized), backup export/import, text size, haptics, reduce motion, storage usage.

## Next

- M2: PDF → `.quizz` converter + validator for your real PDFs (send 2–3).
- M6: accessibility and performance pass on a real device.
- M7: Capacitor Android project + signed APK.

## Repo layout

```
PLAN.md                  strategy, research, design system, milestones
docs/                    pack schema + example pack
src/                     React app (screens, components, design tokens, store)
src/lib/                 validator, scoring, storage, dates, store
src/__tests__            end-to-end smoke tests (jsdom)
src/lib/__tests__        unit tests
public/                  logo, manifest
.github/workflows/ci.yml typecheck + tests + build
```
