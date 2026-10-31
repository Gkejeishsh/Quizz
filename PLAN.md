# Quizz — Build Plan & Technical Blueprint

**A private, offline-first Android quiz app that turns AI-generated PDF tests into playable MCQs — with instant scoring, mistake review and full explanations.**

Version 1.0 · 31 Oct 2026 · Branch `arena/44e5e339-quizz`

---

## 0. TL;DR

| Question | Answer |
|---|---|
| What am I building? | `Quizz` — an Android app (installable APK) that imports a custom `.quizz` file and plays it as an MCQ test, then shows score, your ticked vs. correct options, and explanations. |
| Does the app use AI? | No. Zero AI, zero network. I convert your PDF into a `.quizz` file; the app only reads that file. |
| Where does the PDF parsing happen? | On my side, in this workspace, with a converter + strict validator. The app never sees a PDF. |
| Is my data safe if I delete the original file? | Yes. The whole test content is copied **into the app's own database** at save time. The source file is not referenced afterwards. |
| How do I test it while we build? | A live mobile-sized preview in your browser (works on your phone immediately), installable as a PWA. |
| How do I get the APK? | At the end, via an automated build (GitHub Actions on this repo) that produces a signed, installable APK. |
| Option order / question numbers | Preserved exactly as in your PDF. `Q7` stays `Q7`, option `A` stays first and keeps its text. No shuffling by default. |

---

## 1. Reality check (constraints that shape the plan)

1. **This sandbox has no Android SDK / JDK.** I verified: no `java`, no `gradle`, no `sdkmanager`, and `dl.google.com` is not reachable from here. So I cannot run `gradle assembleRelease` locally.
   **Solution:** the app is a web app wrapped with **Capacitor**. The Android project is committed to the repo, and a **GitHub Actions workflow** builds the APK on a runner that ships with JDK 21 + Android SDK 36. You download the APK from the Actions run / Release page. (Fallback, if Actions is blocked on the repo: you open the project once in Android Studio and press Build → APK. The project will be ready for that, no code changes needed.)
2. **You are on a phone, in Pakistan, likely in a hostel/on mobile data.** The app must be tiny, fast on a low-end device, and 100% usable in airplane mode. No login, no ads, no analytics, no permissions.
3. **Content quality is the whole product.** A pretty app with wrong answer keys is worthless. That is why the file format, the converter, the validator, and my review pass get the most attention in this plan (§3).
4. **Your PDFs will be messy** — different AI generators, two-column layouts, wrapped option lines, math symbols, "Answer Key: 1-A 2-C", explanations after the key. The format and converter must tolerate this, and *fail loudly* rather than silently import a broken test.

---

## 2. Architecture decision

### 2.1 Stack

| Layer | Choice | Why |
|---|---|---|
| UI | **React 19 + TypeScript + Vite** | Fast iteration, I can preview it live in your browser, and it wraps into Android cleanly. |
| Styling | **CSS custom properties + hand-written CSS** (no heavy UI kit) | Full control over the "cool but professional" look, tiny bundle, no fighting a framework's opinions. |
| Motion | **`motion`** (Framer Motion) + CSS | Spring physics, staggered lists, shared-axis page transitions, layout animations. |
| State | **Zustand** store + write-through persistence | Simple, predictable, testable. |
| Storage | **IndexedDB (`idb-keyval`)** with versioned schema + localStorage fallback | Large payloads, survives app restarts/updates, no server. |
| Math | **KaTeX** (lazy-loaded only when a pack contains `$…$`) | Equations from Physics/Math PDFs render properly. |
| Android shell | **Capacitor 8** (`@capacitor/android`, `filesystem`, `share`, `haptics`, `status-bar`, `app`) | Native install, file-picker import, share-to-app, haptics, offline assets. |
| Tests | **Vitest** (logic) + **Playwright** (flows) | Scoring/validation/migrations must be provably correct. |

### 2.2 Why not native Kotlin?

Native Compose would be marginally smoother, but: I could not compile or verify it in this environment, you could not see it until the very end, and every design tweak would need a full APK rebuild. Web-core + Capacitor gives you a **live preview on your phone from milestone 1**, and the final APK is still a real, installable Android app with its own icon, splash screen and offline assets. The APK will use the system WebView that every Android 8+ phone has.

### 2.3 What ships inside the APK

* All UI, fonts, icons and animations — bundled locally (no CDN).
* Seed library: the `.quizz` packs we build, shipped in `assets/packs/` so a fresh install already has your tests.
* `INTERNET` permission **not required** for app function (I'll leave it out of the manifest unless a feature needs it).
* Target: Android 8.0 (API 26) → Android 16; arm64 + armv7.

---

## 3. The `.quizz` file format (the heart of the app)

### 3.1 Decision

A `.quizz` file is **UTF-8 JSON** (a plain-text object). I chose JSON over ZIP/binary because:

* it is inspectable — you can open it in any text editor and see exactly what the app will show;
* it survives email/WhatsApp/Drive transfers;
* it never needs native PDF code on the device;
* it can embed images if a question needs a diagram.

If a pack is large, it is still one file; images are embedded as base64 only when present, with a hard cap (default 12 MB per pack).

### 3.2 Schema (v1)

```jsonc
{
  "format": "quizz-pack",
  "formatVersion": 1,
  "id": "pck_7f3a91c2",               // stable id, generated at conversion
  "title": "Class 10 Chemistry — Ch. 3 Chemical Bonding",
  "subject": "Chemistry",             // free text, used as the default category
  "language": "en",
  "createdAt": "2026-10-31T09:12:00Z",
  "source": {
    "fileName": "chem-ch3-test.pdf",
    "pages": 8,
    "generator": "ChatGPT",           // whatever you tell me, optional
    "checksum": "sha256:9c1f…"        // of the pdf, for dedupe
  },
  "instructions": "Attempt all 40 questions. 1 mark each.",  // optional
  "durationMinutes": 0,               // 0 = none; >0 only *suggests* a timer length
  "groups": [                         // optional shared context (comprehension, diagrams)
    { "id": "g1", "type": "passage", "title": "Read the passage",
      "text": "…", "asset": null }
  ],
  "questions": [
    {
      "n": 1,                         // MUST match the number printed in your PDF
      "group": null,                  // or "g1"
      "type": "single",               // "single" | "multi" | "truefalse"
      "question": "Which of the following has a triple covalent bond?",
      "options": [
        { "key": "A", "text": "O₂" },
        { "key": "B", "text": "N₂" },
        { "key": "C", "text": "Cl₂" },
        { "key": "D", "text": "H₂" }
      ],
      "answer": ["B"],                // array → future-proof for multi-answer
      "explanation": "N₂ has one sigma and two pi bonds, i.e. a triple bond (N≡N).",
      "difficulty": "medium",         // easy | medium | hard (optional)
      "tags": ["covalent-bonding"]    // optional
    }
  ],
  "assets": {}                        // optional: { "a1": { "mime": "image/png", "data": "base64…" } }
}
```

A machine-readable JSON Schema lives at [`docs/quizz-pack.schema.json`](docs/quizz-pack.schema.json) and a working example at [`docs/sample-pack.quizz`](docs/sample-pack.quizz).

### 3.3 Validation rules (import is rejected unless all pass)

| # | Rule | On failure |
|---|---|---|
| 1 | `format === "quizz-pack"`, supported `formatVersion` | "Not a Quizz file" |
| 2 | ≥ 1 question | "This test has no questions" |
| 3 | `n` values are unique and ascending | "Duplicate question number 7" |
| 4 | every question has 2–6 options with unique keys | "Q12 has two options labelled B" |
| 5 | `answer` keys all exist in `options` | "Q9's answer key 'C' is missing" |
| 6 | no empty question/option text | "Q4 option B is empty" |
| 7 | every question has an explanation | Warning only — "Show Explanation" disabled for those |
| 8 | `$…$` math delimiters balanced | "Q18 has an unclosed equation" |
| 9 | pack < 12 MB and question count < 500 | Hard limit, protects low-end phones |
| 10 | duplicate pack `id`/checksum | "You already saved this test — open it?" |

Errors are shown **inside the app** on the import screen, per question, with a "copy report" button so you can send it to me and I fix the pack. It never half-imports.

### 3.4 PDF → `.quizz` pipeline (my side)

```
your PDF  →  tools/pdf_extract.py  →  raw.txt (layout-aware)
          →  tools/parse_tests.py  →  draft.json  (regex/heuristics: Q numbering,
                                       option markers A–D, answer key block,
                                       explanation section, sections, tables)
          →  my manual review pass (numbering, option order, math, missing keys)
          →  tools/validate_pack.py → pack.quizz   (schema + rules + sanity checks)
          →  packs/<subject>-<slug>.quizz  (+ preview thumbnail data)
```

* **Text-first, then human review.** Automated parsing gets 85–95%; I read every question against the PDF and fix the rest. For Math/Physics, I convert equations to LaTeX (rendered by KaTeX).
* **Answer key matching** handles all common shapes: inline (`Answer: B`), bottom block (`1-A 2-C 3-B`), table, or answer + explanation merged in one paragraph.
* **Explanations** come from the "Explanation / Solutions" section of the PDF, matched by question number. If the PDF's explanations are per-option, they are merged into the question's explanation.
* **Diagnostics**: the validator prints a table — question count, answer coverage, explanation coverage, missing/duplicate numbers, LaTeX issues — which I show you before you install the pack.
* **Traceability**: each pack keeps `source.fileName` + checksum, so if you send a corrected PDF I regenerate cleanly and the app can offer "update this test".

### 3.5 How the pack reaches your phone

1. **Live preview (web):** packs I build are served from the repo; in *Add New Test* there is a **Library** tab → tap → "Save". No file transfer needed.
2. **File:** download the `.quizz` → *Add New Test* → *Choose file* → it appears in the Android document picker.
3. **Share:** from WhatsApp/Telegram/Drive, "Open with Quizz" (registered intent filter).
4. **Bundled:** packs under `packs/` ship inside the next APK build (works with no file at all).

---

## 4. Data model & persistence

```
IndexedDB "quizz-db" (schemaVersion 1)
├── meta        { schemaVersion, installedAt, lastBackupAt }
├── settings    { theme: system|light|dark, haptics, fontSize, reduceMotion, shuffle:false }
├── categories  [{ id, name, color, order, createdAt }]
├── tests       [{ id, packId, name, categoryId, createdAt, updatedAt,
│                  questionCount, sourceFileName, checksum, pack /* full content */ }]
├── attempts    [{ id, testId, testName /* snapshot */, startedAt, finishedAt,
│                  durationMs, answers: { "1":"B", … }, score, total, marked }]
└── drafts      [{ testId, answers, index, startedAt }]   // resume interrupted test
```

**Key invariants**

* A **saved test owns a full copy of its content**. Deleting the PDF or the `.quizz` file changes nothing. This is your "Important Point 1".
* **Attempts snapshot `testName`** — so history survives even if you delete the test (the row is marked "deleted test"). No silent data loss.
* **History is derived, never duplicated.** "Latest high score" = query over attempts (best % and most recent attempt per test). One source of truth ⇒ the history screen can never go stale.
* **Category delete** moves its tests to the protected `Uncategorized` bucket; deleting a test asks for confirmation and states how many attempts exist.
* **Migrations**: `schemaVersion` is checked at boot; v1→v2 upgrade functions keep your data across app updates.
* **Backup**: Settings → *Export backup* writes a single `.quizzbackup` JSON (tests + categories + attempts + settings); *Import* restores it. Insurance against uninstalling.

---

## 5. Screens & flows

```
                ┌──────────────┐
                │   Splash     │  logo mark draws → wordmark rises (≤900 ms)
                └──────┬───────┘
                       ▼
     ┌──────────────────────────────────────┐
     │ Home                                 │
     │  ◉ Quizz      [ History ]  [ ☾/☀ ]   │
     │  "Ready for a quick win?"            │
     │  ┌────────────────┐ ┌──────────────┐ │
     │  │ + Add New Test │ │ Saved Tests  │ │
     │  └────────────────┘ └──────────────┘ │
     │  Continue where you left off →       │
     └───┬───────────────┬──────────────┬───┘
         ▼               ▼              ▼
   Add New Test      Saved Tests     History
   (import + save)   (categories)    (attempts, best scores)
         │               │
         │               ▼
         │          Test detail
         │        ┌────────┴────────┐
         │   Start Test      Show Explanation
         │        │                 │
         │        ▼                 ▼
         │   Quiz play ──► Results ──► Review / Explanations
         │        (one question at a time, no correctness feedback)
         └────────────────────────────────────────────┘
```

### 5.1 Home
Logo + display headline, theme switch, History button top-right. Two large tactile buttons (Add New Test / Saved Tests) with staggered entrance, subtle gradient glow, press-scale. Below: "Continue" card if a test is in progress, and a compact stats strip (tests saved · attempts · best %).

### 5.2 Add New Test
1. Drop zone / *Choose file* (accepts `.quizz`, `.json`); on Android also "Open with Quizz".
2. Import progress → **validation report**: title, subject, question count, explanation coverage, issues.
3. **Save sheet**: editable name (pre-filled with the pack title; empty → default name), category picker with inline "New category", Save.
4. Success: card flip + haptic + toast "Saved to Chemistry".
5. Library tab (preview/builds) to import pre-built packs directly.

### 5.3 Saved Tests
* Category chips (horizontal, animated underline) + "All"; tests grouped **by saved date** (Today / Yesterday / Last 7 days / Earlier) as required.
* Each row: name, category dot, question count, best %, last attempt; `⋯` menu → **Rename / Move to category / Delete**, plus quick *Start* on tap.
* Long-press enters selection mode for bulk move/delete.
* Empty state with illustration + "Add your first test".

### 5.4 Test detail
Cover card (name, category, N questions, best score ring, attempts), **Start Test**, **Show Explanation** (disabled with a clear reason if no explanations exist), and quick facts (last attempt, saved date, source file name).

### 5.5 Quiz play (the core loop)
* Top: close (with "Save & exit?" sheet: Resume later / Discard), progress "12 / 40", dynamic progress bar with a soft glow.
* Question card: number badge **matching the PDF**, question text (LaTeX/asset-aware), options A–D in the original order.
* Tap an option → it fills with accent, ticks, 180 ms hold, then the card springs out and the next springs in; **no right/wrong signal**, exactly as you asked.
* Back button re-opens the previous question with your selection intact; last question shows **Finish test** instead of auto-jumping.
* Selections are persisted per answer → app kill / phone call / battery death does not lose the test (it resumes at the last question).
* Timer is **off unless you switch it on for that attempt** (see §5.5.1); it is never remembered.

#### 5.5.1 One-time timer (per attempt, never saved)

**Flow:** Test detail → *Start Test* opens a compact **Start sheet**:

```
Start test
─────────
40 questions · Chemistry
[  Timer   ○ ──●  ]          ← off by default, every single time
Quick pick (appears when on):
[ 10m ] [ 20m ] [ 30m ] [ 45m ] [ custom ]
Estimated pace: 45 s / question (hint only)
[        Start        ]
```

* The timer **starts OFF on every start** and the chosen duration is **discarded** when the attempt ends. Nothing is written to settings, the test, or the pack — so a 20-minute timer you used yesterday can never silently apply today. You must turn it on and set it each time.
* If a pack carries a suggested duration, it only appears as a pre-filled hint inside this sheet; it never auto-enables.
* Custom duration: pick minutes (1–180) with a stepper, or mm:ss for short drills.
* **While running:** a slim countdown chip in the quiz header (turns amber < 5 min, red < 1 min with a gentle pulse at < 30 s), no per-second screen-shake, no sound unless you enable the (optional) warning tick in the sheet.
* **When time runs out:** auto-submit, unanswered questions are marked *Unanswered*, and the result screen labels the attempt "Time up". No data is lost.
* **Background/resume:** the deadline is stored as a wall-clock timestamp for that attempt only. Take a call and come back before the deadline → the clock keeps ticking (honest exam behaviour). Come back after it → the attempt is submitted as-is instead of silently failing.
* **No pause button** (pausing would defeat timing). If you must stop, "Save & exit" discards the timer and keeps your answers for a fresh, timer-free resume.
* Timed attempts show a small ⏱ badge in History so you can tell them apart.

### 5.6 Results
Score ring animates from 0 → X% with count-up, confetti at ≥80%, haptics. Shows correct / wrong / unanswered, time taken, and the **mistakes list**: each question with *your ticked option* (red) and *the correct option* (green), tap to expand full explanation. Bottom: **Show Explanation** → full review. Buttons: Retake (fresh order preserved), Back to test.

### 5.7 Review & explanations
Scrollable list of all questions: correct option highlighted, your answer shown, explanation text, "jump to question" sheet, filter chips *All / Wrong / Unanswered / Flagged*, and search inside the test. This is the "answer key page" of your PDF, but interactive.

### 5.8 History
* Header stats: tests taken, average score, best score.
* List of tests attempted, most recent first, with **best %** and last attempt date, attempt count; tap → that attempt's full result.
* All attempts expandable per test (mini graph of score over time).
* Updates automatically the moment an attempt finishes (derived data, no manual refresh).

### 5.9 Categories
List with color chips, drag-handle reorder, add via FAB, rename via inline edit (double-tap / ⋯), delete with "N tests will move to Uncategorized". Seeded with English, Maths, Physics, Chemistry, Biology + Uncategorized (protected).

### 5.10 Settings
Theme (System / Light / Dark), haptics, text size (S/M/L), reduce motion, backup export/import, storage usage, "About Quizz" (version, format version, credits), reset app with typed confirmation.
**Deliberately absent:** any global timer switch. Timing is chosen per attempt in the Start sheet (§5.5.1) and is never persisted.

---

## 6. Design system

### 6.1 Brand & logo
Concept: **"the spark of a solved question."** A rounded-square app badge with a deep indigo → violet → cyan gradient mesh; negative-space **Q** whose tail resolves into a **checkmark**, and a 4-point spark at the top-right. Plus a compact monogram `Q` for the status bar/notification and an adaptive Android icon (foreground glyph + gradient background + monochrome layer). Wordmark: *Quizz* in Bricolage Grotesque ExtraBold, tight tracking, with the doubled `z` cut as a lightning zigzag. I'll generate and iterate on 2–3 logo directions and show them to you before locking it in.

### 6.2 Typography (bundled offline via `@fontsource`)

| Role | Font | Notes |
|---|---|---|
| Display / logo / big scores | **Bricolage Grotesque** (variable) | Distinctive, modern, a little playful — not a default Roboto. |
| UI / body / questions | **Plus Jakarta Sans** (variable) | Very legible at 15–17 px on cheap screens; friendly geometry. |
| Numbers, scores, question badges | **JetBrains Mono** | Tabular figures so counters don't jitter while animating. |

Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 56. Line-height 1.45 body, 1.15 display. Text respects system font scaling up to 130% without clipping.

### 6.3 Color tokens

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F5F6FB` | `#0A0C12` |
| `--surface` | `#FFFFFF` | `#131725` |
| `--surface-2` | `#EEF0F8` | `#1B2033` |
| `--ink` | `#0E1220` | `#ECEEF8` |
| `--muted` | `#5B6178` | `#9AA1B8` |
| `--primary` | `#5B5BF5` | `#8B8BFF` |
| `--primary-ink` | `#FFFFFF` | `#0A0C12` |
| `--accent` | `#22D3EE` | `#42E8FF` |
| `--success` | `#12A150` | `#3DE0B5` |
| `--danger` | `#E5484D` | `#FF6B70` |
| `--warning` | `#F59E0B` | `#FBBF24` |
| gradient | `#6D5BFF → #22D3EE` | same, +18% saturation |

Radii 14 / 20 / 28; borders 1 px at 8% ink in light, 12% white in dark; shadows soft and low-opacity, replaced by **glow + hairline border** in dark mode. Contrast checked ≥ 4.5:1 for all text.

### 6.4 Motion spec (all springs are interruptible)

| Moment | Motion | Timing |
|---|---|---|
| App launch | Logo ring draws, spark pops, wordmark rises 12 px | 600 ms / 320 ms |
| Screen push | Shared-axis: new screen x +24 px → 0 + fade, old −16 px | 260 ms `cubic-bezier(.32,.72,0,1)` |
| Bottom sheet | Spring up + scrim fade | stiffness 380, damping 34 |
| Button press | scale .97 + shadow compress | 90 ms |
| Option tap | fill accent, tick draw, 180 ms hold, card out/in | 240 ms spring |
| Progress | width + glow | 320 ms |
| Score reveal | ring sweep + number count-up | 900 ms ease-out |
| Confetti | 60 particles, canvas | 1.2 s |
| Theme switch | View-Transition circular reveal from the toggle | 220 ms |
| List entrance | stagger 40 ms, rise 8 px + fade | 320 ms |

`prefers-reduced-motion` / "Reduce motion" turns off parallax, confetti and sweeps; haptics: light on option select, medium on results, double-pulse on success. Everything is GPU-friendly (transform/opacity only), 60 fps target on a low-end phone, no layout thrash.

### 6.5 Feel rules
Lively but never noisy: one hero motion per screen, everything else quiet. No random gradients behind text. Every tap has a response within 100 ms. Offline ⇒ no spinners that spin forever; loading states are skeletal.

---

## 7. Functional rules & edge cases

* **Numbering:** `n` is rendered verbatim; sectioned PDFs (Section A: 1–10, Section B: 1–10) are supported via `groups` and a "Section" label, with internal unique ids but **displayed numbers preserved**.
* **Option order:** never reordered by default. A future "shuffle options" setting defaults to **off** (a shuffled test can't mirror `A = x+1`).
* **Unanswered** count as wrong in the score but are labelled separately in review.
* **5-option and true/false** questions render correctly; `multi` answers supported by the schema (app shows checkboxes) for future PDFs.
* **Long text**: options wrap, question cards scroll internally, no horizontal scroll, safe areas respected.
* **Images/equations** in questions render from embedded assets/KaTeX; if KaTeX fails to load offline it's bundled, not fetched.
* **Import mistakes** never corrupt saved data (transactional import; validate → commit).
* **Accessibility**: semantic buttons, focus rings, screen-reader labels ("Question 12 of 40, option B selected"), 48 dp targets, color-blind safe correct/wrong (icon + color, never color alone).
* **Back-hardware-key**: closes sheets first, then navigates; in quiz it asks before leaving.

---

## 8. QA & testing plan

**Automated**
* Scoring: all-correct, all-wrong, half, unanswered, 5-option, multi-answer, 500-question pack.
* Import: each of the 10 validation rules has a failing fixture + a passing one.
* Persistence: save → reload → content intact; delete source file; export/import backup round-trip; schema migration fixture.
* Dates: Today/Yesterday/7-day grouping across timezones and midnight boundaries.
* History: derived best/last correct after delete/rename/move.

**Manual matrix**
* Screen sizes: 360×640 (low-end), 390×844, 412×915, tablet portrait. Font scale 100% / 130%.
* Themes: light, dark, system switch mid-session, OLED black.
* Interruptions: take a call, kill the app, rotate, background 10 min → resume with answers intact.
* Offline: airplane mode from cold start; pack import in airplane mode.
* Performance: 500-question pack, import < 1.5 s, question advance < 16 ms/frame, memory stable.
* Real device test of every APK build before I report "done".

---

## 9. Milestones

| # | Milestone | Output you can see | Est. |
|---|---|---|---|
| **M0** | Plan approval + your first PDF | This document, format spec, logo directions | now |
| **M1** | Shell, theme system, logo, home, navigation, animations | Live preview on your phone | 1 pass |
| **M2** | `.quizz` format + converter + validator + your first real pack | Pack file + import screen | 1 pass |
| **M3** | Save test, categories, rename/move/delete, sorted lists | Saved Tests fully working | 1 pass |
| **M4** | Quiz play, results, review, explanations, resume | A real test played end-to-end | 1–2 passes |
| **M5** | History, settings, backup/restore, empty states | Complete app on web/PWA | 1 pass |
| **M6** | Polish, accessibility, performance, full QA pass | Release-candidate build | 1 pass |
| **M7** | Capacitor Android project + CI APK + install test on your phone | `Quizz-v1.0.apk` | when you say "compile" |

Each milestone ends with a live preview link and a short "what changed / what to check" note. Nothing is declared done until it works on a phone-sized screen in both themes.

---

## 10. APK / release plan (M7)

1. `npx cap add android` → commit `android/` (Gradle 8, AGP 8, compileSdk 36, minSdk 26).
2. Adaptive icon from the final logo (all densities), splash screen, dark/light `values-night` colors, status bar treated as content.
3. `.github/workflows/android.yml`: Node 22 → npm ci → vite build → cap sync → `./gradlew assembleDebug` (and a release variant signed with a keystore held in repo secrets) → upload APK as artifact + attach to a GitHub Release.
4. `versionCode`/`versionName` bumped per build; changelog in the release notes.
5. You install the APK (allow "install unknown apps"), test offline, and report anything broken; fixes go out as a new build.
6. Signing key: generated once, stored in Actions secrets. If you ever want Play Store, we reuse it.

**Distribution without Play Store:** GitHub Release link (direct APK download), plus the PWA as a fallback that always has the latest version.

---

## 11. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| GitHub Actions not enabled on the repo (I got a 403 from the API) | no cloud APK | I'll verify early in M7; fallback = you build once in Android Studio (project ready), or PWABuilder; app also installs as PWA meanwhile. |
| Messy PDF (scanned images, two columns) | wrong content | Text-layer check first; if the PDF is scanned I tell you and ask for a text-based PDF; every pack validated + spot-checked against the source. |
| Answer key missing/mismatched in your PDF | wrong scoring | Validator blocks import on missing/invalid keys; coverage table shown to you before install. |
| Math symbols lost in extraction | garbled questions | Unicode preserved end-to-end, LaTeX for equations + visual check of every math question. |
| Low-end phone performance | jank | Transform/opacity-only animation, virtualized long lists, 12 MB pack cap, tested at 360×640. |
| WebView quirks on old Android | layout bugs | minSdk 26, safe-area insets, tested on device; Capacitor keeps the shell thin. |
| Data loss on uninstall | lost tests | Export/import backup + pack files are re-importable. |

---

## 12. Repo structure

```
Quizz/
├─ PLAN.md                     ← this document
├─ docs/
│  ├─ quizz-pack.schema.json   ← machine-readable format contract
│  └─ sample-pack.quizz        ← working example
├─ packs/                      ← .quizz files we create from your PDFs (bundled into the APK)
├─ tools/                      ← pdf extract / parse / validate scripts
├─ src/                        ← React app (screens, components, design tokens, store)
├─ public/                     ← icons, splash, manifest
├─ tests/                      ← vitest + playwright
├─ android/                    ← Capacitor native project (M7)
└─ .github/workflows/android.yml
```

---

## 13. Decisions & open questions

### Resolved
1. **Timer** ✅ *Optional, one-time, manual, never saved.* Set it in the Start sheet each time you begin a test; it is discarded when the attempt ends. See §5.5.1.
2. **Build order** ✅ Format + app proceed together; the real PDF calibration happens once you send your first PDF ("normal text PDF" assumed; scanned-image PDFs will be flagged).

### Still open
1. **Instant feedback toggle** — you asked for *no* right/wrong during the test. Should Settings still offer an optional "practice mode" that reveals the answer immediately? Default: not built.
2. **Urdu support** — English-only UI, or bilingual labels?
3. **Logo direction** — I'll show 2–3 options at M1; tell me then which one to keep.
4. **Your adjustments** — you chose "adjust the plan first": tell me what you want changed (design, fonts, screens, feature priorities, storage approach, anything), and I'll amend this document before the first line of app code.

---

*Next step: approve the plan (or tell me what to change), send a PDF, and I start building M1 immediately.*
