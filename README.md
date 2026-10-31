# Quizz

An offline Android quiz player for AI-generated PDF tests. You give me a test PDF (questions + answer key + explanations); I convert it into a `.quizz` file; the app plays it as a real MCQ exam, marks it instantly, shows your wrong answers next to the correct ones, and keeps your score history.

- **No AI in the app, no accounts, no internet required.**
- **Full plan:** [`PLAN.md`](PLAN.md) · **File format:** [`docs/quizz-pack.schema.json`](docs/quizz-pack.schema.json) · **Example:** [`docs/sample-pack.quizz`](docs/sample-pack.quizz)

## Install on Android

1. Open **[Releases](https://github.com/Gkejeishsh/Quizz/releases/latest)** and download `Quizz-1.0.0.apk`.
2. Tap the file → allow *Install unknown apps* for your browser or file manager → **Install**.
3. Open **Quizz**. It ships with four tests already loaded (the HEC Quantitative Test 2 pack included).

The APK is signed with the project key committed in `android/quizz-release.jks`, so
every later build installs straight over the previous one — your saved tests, scores
and history survive updates. Everything runs offline: the app requests no internet,
storage, camera or location permission.

## Try it in a browser

```bash
npm install
npm run dev        # http://localhost:5173  (mobile-sized preview)
npm run check      # typecheck + 36 unit & end-to-end tests
npm run build
```

The first launch seeds four demo tests (packs/*.quizz) so every screen has real content.

## Converting your own tests

```bash
python3 tools/quizzify.py my-test.pdf -o packs/my-test.quizz --subject Chemistry
python3 tools/validate_pack.py packs/my-test.quizz
```

See [`docs/CONVERTING.md`](docs/CONVERTING.md) — including the prompt that makes AI-generated PDFs convert at ~100%.

## What works today (M1–M5)

- **Design system** — dark + light themes, Bricolage Grotesque display type, Plus Jakarta body, JetBrains Mono numerals, spring motion, haptics, reduced-motion support, safe-area tokens.
- **Home** — logo, History button, theme switch, "Add new test" / "Saved tests", resume card, stats.
- **Import** — upload a `.quizz` file (validated with a 12-rule validator and a readable error report), or add a bundled pack from the Library tab. Save with a custom name and category; duplicate files are detected.
- **Saved tests** — category chips with counts, search, date groupings (Today / Yesterday / Last 7 days / This month / Earlier), rename / move / delete, best score per test.
- **Quiz** — one question at a time, PDF numbering and option order preserved, no correct/wrong reveal while answering, back to edit, skip, flag for later, autosave + resume, optional one-time timer that is never remembered, multi-select support, LaTeX questions.
- **Results** — animated score ring, correct/wrong/skipped, time, mistakes with your pick vs the correct one and the explanation, retry-wrong-only, share summary.
- **Explanations** — full review with filters (All / Wrong / Skipped / Correct / Flagged) and search, answer keys shown without playing.
- **History** — best / latest / attempt count per test, sparkline, per-attempt results, survives test deletion.
- **Categories & settings** — add / rename / delete (tests move to Uncategorized), backup export/import, text size, haptics, sound, reduce motion, storage usage.
- **Behaviour** — Android-style back handling (one history entry per screen, hardware back opens the quiz exit sheet), offline PWA shell, installable from the browser.

## Building the APK yourself

```bash
npm ci && npx vite build
npx cap sync android          # copy the web bundle into the Android project
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

CI does exactly this on every push (`.github/workflows/android.yml`): it builds,
verifies and signs the release APK, uploads it as an artifact and attaches it to a
new GitHub Release. Needs JDK 21 + Android SDK 36 (`compileSdk`/`targetSdk` 36,
`minSdk` 24 — Android 7.0 and newer).

## Next

- **M2 (in progress):** converter + validator are built and calibrated on one real PDF (HEC Quantitative Test 2 — 50/50 questions, keys and explanations) — send more to keep widening coverage.
- **M6:** real-device QA: install the APK, check insets, haptics, back gesture, resume after force-close.

## Repo layout

```
PLAN.md                  strategy, research, design system, milestones
docs/                    pack schema, example pack, conversion guide
packs/                   .quizz test files (bundled into the app)
tools/                   PDF → .quizz converter, validator, converter tests
src/                     React app (screens, components, design tokens, store)
src/lib/                 validator, scoring, storage, dates, store
src/__tests__            end-to-end smoke tests (jsdom)
src/lib/__tests__        unit tests
public/                  logo, manifest, service worker
.github/workflows/ci.yml typecheck + tests + build
.github/workflows/android.yml  APK build, signing, GitHub Release
android/                 Capacitor Android project (icons, splash, manifest, key)
capacitor.config.ts      app id, splash and system-bar configuration
```
