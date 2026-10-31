# Quizz — Master Plan v2.0

**An offline Android quiz player that turns AI-generated PDF tests into real, playable exams — with scoring, mistake review and explanations. No AI inside the app. No accounts. No internet.**

Branch `arena/44e5e339-quizz` · 31 Oct 2026 · supersedes v1.0 (this document keeps everything from v1, then upgrades strategy, research, design and QA).

---

## 1. Strategy first

### 1.1 The one-sentence product

> **Quizz turns the test PDF you already have into a tappable exam on your phone, marks it instantly, and shows you exactly where you lost marks — so you never write answers on a register or check an answer key by hand again.**

### 1.2 The real problem (restated honestly)

You are not short of practice questions. AI gives you plenty. The friction is in the **loop between paper and phone**:

1. Test is a PDF → you copy it onto a register by hand (slow, error-prone).
2. You answer on paper → you must then **transcribe** answers back into the PDF mentally.
3. You check each answer against a key at the back → **context switch per question**, no feedback loop, no record of what you got wrong.
4. You have no memory of your score trend across days, so you can't tell if you're improving.

Four frictions, one root cause: **the test lives in a format you can't interact with.** Quizz removes the paper step, automates the marking, and keeps the history.

### 1.3 North-star metric

**Completed attempts per week** (not installs, not screen time). Every design and engineering decision is judged by: *does this help a tired student on a mid-range phone finish one more practice test, and learn from it?*

### 1.4 Definition of "perfect" (acceptance criteria for v1.0)

| Area | Bar |
|---|---|
| **Trust** | Test numbering and option order match the source PDF **exactly**; a wrong answer key is treated as a critical bug. |
| **Data safety** | Zero loss of saved tests or attempts across reboots, app kills, phone calls, updates and source-file deletion. Backup restores 100%. |
| **Speed** | Cold start → home < **1.5 s** on a 360×640, 2 GB RAM device; question-to-question transition < **16 ms/frame** (no dropped frames); import of a 40-question pack < **400 ms**. |
| **Clarity** | Every screen understandable in **3 seconds** without a tutorial; zero dead ends; every empty/error state has an action. |
| **Feel** | Every tap answered within **100 ms**; no spinner ever runs forever; motion on one hero element per screen, never during reading. |
| **Size** | APK < **8 MB**; works in airplane mode from the first launch. |
| **Accessibility** | 4.5:1 text contrast, 48 dp targets, screen-reader labels, colour-blind-safe correct/wrong states, 130% system font scale without clipping. |

### 1.5 Product principles (the tie-breakers)

1. **Content is the product.** A beautiful app with one wrong answer key is worse than a plain app with correct ones. Validation beats polish when they conflict.
2. **Local-first, forever.** Everything is on your phone in an app-owned database. No account, no server, no sync conflicts, no network dependency.
3. **Exam-faithful by default.** Numbers, option order and wording mirror your PDF. No shuffling unless you ask for it.
4. **Feedback where it helps, silence where it distracts.** No right/wrong reveal during the test (as you specified, and it keeps the practice honest); full feedback the moment the test ends.
5. **Boring where it matters.** Storage, imports and migrations are conservative and tested. Personality lives in the design, not in the data layer.
6. **One-hand, one-thumb, one-eye.** Built for a student holding a phone in bed with one hand. Primary actions live in the bottom 60% of the screen.
7. **Fail loudly to me, gently to you.** The converter refuses to produce a bad pack; the app refuses to import one; neither ever half-imports.

### 1.6 Scope (MoSCoW)

| Priority | Feature |
|---|---|
| **Must** | Import `.quizz`, validate, save with custom/default name + category; categories CRUD; test rename/move/delete; saved-tests list sorted by saved date; **Start Test** (one question at a time, no correctness reveal, back/edit, resume); results (score, mistakes, your pick vs correct); **Show Explanation**; History with best & latest scores, auto-updating; dark/light themes; persistent offline storage independent of source file. |
| **Should** | One-time per-attempt timer (never saved); search & filters; flag question; retry only-wrong; backup export/import; haptics; text-size setting; share result summary as text. |
| **Could** | LaTeX-rich math packs; images/diagrams in questions; per-question time analytics; "smart review" queue (spaced repetition); multiple attempts comparison chart; CSV/PDF export of a completed attempt. |
| **Won't (v1)** | Any AI/LLM inside the app; cloud sync; multi-user/teacher mode; online question bank; OCR of scanned PDFs **inside the app**; iOS build; in-app PDF parsing. |

### 1.7 Risks of over-building, and the cut list

The fastest way to ruin this app is to add features that create states. Each addition multiplies edge cases (sync conflict, partial import, timer + resume, category delete + history). So v1 ships **one** correct path per task, with the cuts above. Everything in "Could" is architected for (IDs, schema fields) but not built.

---

## 2. Research: what the evidence and the market actually say

Research was done before design, not after. Four sources of truth: **platform guidance**, **learning science**, **competitor teardowns**, and **type/design craft**.

### 2.1 Platform: Android 15/16 + WebView realities

Findings that change the plan (verified Oct 2026):

* **Edge-to-edge is enforced.** Apps targeting SDK 35+ on Android 15 render behind the status and navigation bars; Android 16 removes the opt-out for targetSdk 36, which is what Capacitor 8 compiles against. → Design must be built *for* edge-to-edge: content flows under the bars, and interactive elements respect insets.
* **`env(safe-area-inset-*)` is not reliable inside Android WebView** on older WebView builds under enforced edge-to-edge; values can be zero while the shell pads the parent view. Capacitor 8 replaced `adjustMarginsForEdgeToEdge` with a **System Bars plugin**, and native padding is applied to the WebView's parent. → **Never design around a single inset source.** Plan: read insets from the native SystemBars plugin → write them into CSS custom properties (`--inset-top/right/bottom/left`) with `env()` as fallback, and add a dev overlay to visualise insets on-device.
* **Capacitor 8 requirements:** Node 22+, JDK 21, AGP 8.13, Gradle 8.14.3, minSdk 24, compile/target SDK 36, Android Studio Otter+. → CI runner must be pinned accordingly; `minSdk 24` (Android 7.0) fits the "old phone" audience but WebView is the real floor (see §2.4).
* **Motion guidance (Material 3 Expressive, 2025):** spring physics with two families — **spatial** (position/size, may overshoot) and **effects** (opacity/colour, never bounce) — plus interruptible, velocity-aware transitions and reduced-motion fallbacks. Legacy easing still applies to screen transitions: emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)` for enter, emphasized-accelerate `cubic-bezier(0.3,0,0.8,0.15)` for exit, standard `cubic-bezier(0.2,0,0,1)` for utility moves. → Adopt this vocabulary as our motion tokens (§8.7) instead of arbitrary durations.

### 2.2 Learning science: what the app should optimise

* **Testing effect / retrieval practice** is one of the most replicated findings in education research: self-testing beats re-reading for long-term retention, with large lab effects and moderate classroom effects (~g=0.50 across 222 studies). → The core loop is right; no need to gamify it into a toy.
* **Feedback is not optional.** Retrieval *without* corrective feedback can harden confident errors. → Explanation review must be one tap from results, and the design should push you there rather than let you admire a score.
* **Spacing beats massing.** Multiple short sessions over days outperform one long cram. → Phase 2: a lightweight "Review again" queue of previously-wrong questions after 1/3/7 days (no algorithm complexity, just honest scheduling). In v1 we ship the *hooks* (attempt history per question) so this can be added without a migration.
* **Desirable difficulty**: harder retrieval is better, so timed mode is a legitimate drill, but shouldn't be the default. → Timer stays optional, manual and never saved (§9.6), exactly as you asked.

**Design consequence:** results screens are not trophies, they are a *study surface*. The score ring is the emotional beat (1 second), and the mistake list with explanations is the payload, placed immediately below and pre-expanded for wrong answers.

### 2.3 Competitors: what to copy, what to avoid

| App | What works | What users complain about | Our decision |
|---|---|---|---|
| **Anki** | Rigorous scheduling, offline, LaTeX, huge control | Dated UI, steep setup, sync conflicts that "wiped a deck" | Copy the *honesty* (offline-first, LaTeX); reject the UI. No scheduling in v1. |
| **Quizlet** | Instant usability, attractive card UI, mobile-first | Paywalling previously free modes, wrong community content, logouts/data loss, AI shoved in | Copy the *frictionless 3-second start*; no paywalls, no accounts, no auto-generated content in-app. |
| **Duolingo** | Celebration cadence, progress visibility, tiny sessions, satisfying micro-motion | Pressure/streak anxiety, content thinness | Copy the *one-celebration-per-completion* discipline; **no streaks/guilt mechanics** — this is a study tool, not a habit trap. |
| **Kahoot** | High-energy colour, clear answer states | Visual noise, not for solo deep work | Reject the loud palette; keep unambiguous correct/wrong encoding. |
| **Google Forms / exam UIs** | Predictable question-per-screen, progress clarity | Bland, no explanation loop, no history | Copy the predictability; add the explanation loop and history they lack. |

**The strategic gap this app fills:** the market is split between *flashcard schedulers* (Anki), *content marketplaces with paywalls* (Quizlet), and *classroom games* (Kahoot). Nobody serves the single student who already has a **PDF test with an answer key** and wants to *sit it* on their phone, offline, for free, with their own content. That is the whole product.

### 2.4 Device & browser reality (design constraints, not excuses)

* Audience phone: Android 10–15, 3–6 GB RAM, 60 Hz, 360–430 dp wide. Some will have WebView several versions behind.
* Therefore: **no CSS View-Transitions dependency** (use JS springs with CSS fallback), **no backdrop-filter as a load-bearing effect** (decorative only, disabled on low-end), **no web fonts fetched at runtime** (bundled, subset to Latin + Urdu later), **no animation on scroll** except one cheap parallax on the home hero.
* `prefers-reduced-motion` **and** a manual "Reduce motion" toggle are both honoured (Android's animation scale is not consistently exposed to WebView).

### 2.5 Typography research

* **Bricolage Grotesque** (Mathieu Triay, SIL OFL, variable: weight/width/optical size) is an "eclectic display grotesque" — deliberately characterful, described by type reviewers as having too much personality for body text. → **Display only**: logo, screen titles, hero numbers. This is exactly the "cool, not simple" font you asked for, used where it shines.
* **Plus Jakarta Sans** (variable) for UI/body: geometric-humanist, excellent at 15–17 px on cheap screens, generous x-height.
* **JetBrains Mono** for numerals that animate (score counters, question badges) so digits don't reflow while counting.
* All three are SIL OFL and bundled locally via `@fontsource-variable`, subset to Latin (+ Latin-Extended), total font payload budget **< 220 KB**.

---

## 3. Product strategy: how this gets built without surprises

### 3.1 Two parallel tracks

```
TRACK A — CONTENT (riskiest, starts first)
  PDF samples → extraction spike → parse rules → validator → reviewed pack
  Exit: 3 different AI-generated PDFs convert with 0 manual fixes after rules settle

TRACK B — APP (starts immediately, in parallel)
  Design tokens → shell/nav → home → library/import → quiz → results → history → polish
  Exit: a real pack played end-to-end on a phone-sized screen in both themes
```

**Why:** content conversion is the only place where "the app is finished but my PDFs don't work" is a real risk. Proving conversion on **three** of your PDFs (not one) before the UI is fully built eliminates that risk early. Meanwhile the app progress stays visible to you.

### 3.2 Feedback loop with you

* Each milestone ends with **(a)** a live preview link, **(b)** a 5-line "what changed / what to check", **(c)** one focused question if a decision is needed.
* You test on your own phone; you report in plain language ("option B feels cramped", "I want the timer to be 25 min quick-pick"). No ticket formats.
* I fix and re-deploy the preview; the APK comes at the end, but the preview is installable as a PWA at any time.

### 3.3 Change control (how we avoid scope drift)

* New ideas during the build go to a **v1.1 list** in this document, not into the current sprint — unless they fix a real usability blocker.
* Schema changes require a migration *and* a test; content changes require a new pack version.

### 3.4 What "done" means per milestone

A milestone is done only when: it works on 360×640 and 412×915, in light and dark, offline, with keyboard/screen-reader basics, and has no console errors. "It renders on my screen" is not done.

---

## 4. User journeys & edge-case map

### 4.1 Primary journey (the 90-second win)

```
Open app → [Continue/Start] → test list → test → Start Test (timer off) →
20 questions × 3 s reading + tap → Finish → score ring + mistakes →
Show Explanation → read 3 explanations → back to test → home
```

Target: **cold start to first question in under 6 seconds**, and **results to first explanation in 1 tap**.

### 4.2 Secondary journeys

* **New test:** PDF arrives in WhatsApp → I convert → `.quizz` file → Open with Quizz → validation report → Save (name + category) → toast → it appears at the top of the category.
* **Catches:** You open a test at 11:58 pm, get interrupted by a call, phone dies at 2 am; next morning the test resumes at question 14 with all answers intact.
* **Correction loop:** You finish, see 13/20, filter "Wrong only", read explanations, hit **Retry wrong only**, and finish the 7 questions in a minute.
* **History check:** You open History, see the test at 65% best, 13/20 latest, 4 attempts — the trend line is going up.

### 4.3 Edge-case map (designed, not discovered)

| Situation | Behaviour |
|---|---|
| Pack has no explanations | "Show Explanation" is disabled with reason + tooltip "This test's PDF didn't include explanations"; review still shows correct options. |
| Answer key references a missing option | Import blocked; report shows question number + what's missing; copy-report button. |
| Same pack imported twice | "Already saved as *Chemistry Ch.3*" → Open / Replace / Save as copy. |
| Duplicate question numbers (sectioned PDF) | Detected at conversion; groups + unique internal IDs; printed numbers preserved. |
| 5 options / true-false / multi-answer | Renders correctly; multi uses checkboxes + "Submit answer". |
| Very long question or options | Card scrolls internally; bottom action bar stays fixed; no horizontal scroll ever. |
| App killed mid-test | Draft autosaved after every tap; resume banner on home + test detail. |
| Timer expires while backgrounded | Attempt submits on return with unanswered marked; no crash, no lost answers. |
| Category deleted | Tests move to protected *Uncategorized*; confirmation states the count; history unaffected. |
| Test deleted with attempts | Confirmation states attempt count; history keeps a "deleted test" row with snapshot name. |
| Clock/timezone change | Dates stored as UTC; grouping computed from local day boundaries on render. |
| Storage full / quota error | Non-blocking error sheet: "Couldn't save — free some space"; the in-memory test stays open so nothing is lost. |
| Corrupt pack / truncated JSON | Clear error with byte position; no partial import; existing data untouched. |
| RTL/Urdu (future) | Layout uses logical properties from day one (`margin-inline`, `padding-block`) so RTL doesn't require a rewrite. |

### 4.4 Error taxonomy (consistent voice)

1. **Blocking** (import invalid, storage full) → inline explanation + one primary recovery action + "copy details".
2. **Recoverable** (resume available, duplicate pack) → choice sheet, never a dead end.
3. **Silent** (haptics unavailable, KaTeX fails on one token) → degrade, log to a local debug buffer, never a toast storm.

---

## 5. Content strategy: PDF → `.quizz` without wrong answers

### 5.1 Why the format is plain JSON

Inspectable by you, diffable by me, transferable over WhatsApp/Drive, no native PDF code on the phone, images embeddable when needed. A `.quizz` is a UTF-8 JSON object (schema: `docs/quizz-pack.schema.json`, example: `docs/sample-pack.quizz`).

**Schema v1.1 additions vs v1** (all optional, backwards compatible): `meta.generator`, `meta.pageRange`, `groups[].instructions`, `question.asset`, `option.asset`, `question.sourceRef` (page + block for traceability), `pack.revision`, `pack.supersedes`.

```jsonc
{
  "format": "quizz-pack", "formatVersion": 1,
  "id": "pck_7f3a91c2", "revision": 1, "supersedes": null,
  "title": "Chemistry — Ch. 3 Chemical Bonding",
  "subject": "Chemistry", "language": "en",
  "createdAt": "2026-10-31T09:12:00Z",
  "instructions": "Attempt all 40 questions. 1 mark each.",
  "source": { "fileName": "chem-ch3.pdf", "pages": 8, "generator": "ChatGPT",
              "checksum": "sha256:9c1f…" },
  "questions": [{
    "n": 7, "type": "single",
    "question": "Which molecule has a triple bond?",
    "options": [{ "key": "A", "text": "O₂" }, { "key": "B", "text": "N₂" },
                { "key": "C", "text": "Cl₂" }, { "key": "D", "text": "H₂" }],
    "answer": ["B"],
    "explanation": "N₂ is N≡N: one sigma and two pi bonds.",
    "sourceRef": { "page": 3, "block": "q7" }
  }],
  "groups": [], "assets": {}
}
```

### 5.2 The pipeline (with confidence, not vibes)

```
0. INTAKE         PDF text-layer check (is it text or a scan?), page count, generator guess
1. EXTRACT        pdfplumber/PyMuPDF → layout-aware lines with x/y + font size/spans
2. SEGMENT        detect zones: header, questions, options, answer key, explanations
3. PARSE          numbering + option markers + wrapped-line joining + math normalisation
4. LINK           answer key → questions (inline / block / table), explanations → questions
5. SCORE          per-question confidence (number present, 2–6 options, answer resolves,
                  explanation found, text not truncated, no duplicate)
6. REVIEW         human pass on every question below 0.98 confidence + random 20% sample
7. VALIDATE       schema + 12 hard rules + LaTeX balance + size caps
8. PACKAGE        .quizz + preview thumbnail + summary report (counts, coverage, warnings)
```

**Parsing rulesets** are pluggable per generator (ChatGPT, Gemini, Claude, generic). Each ruleset is a small config: numbering styles (`1.`, `Q1`, `1)`), option markers (`A)`, `(a)`, `a.`), key markers (`Answer:`, `Ans.`, `Answer Key`, `Correct option`), explanation markers (`Explanation:`, `Solution:`, `Reason:`), and section headers. If a PDF doesn't match, I add a ruleset rather than hand-fixing 40 questions.

**Confidence is not decoration.** Anything below threshold is queued for review, and the app shows a per-pack "quality" line in the import report (e.g. *40 questions · 40 keys · 39 explanations · 0 warnings*).

### 5.3 Quality gates (hard rules)

| # | Gate | Failure |
|---|---|---|
| 1 | Valid header, supported version | Reject with "not a Quizz file" |
| 2 | ≥ 1 question, ≤ 500 | Reject |
| 3 | Unique printed numbers | Reject + list duplicates |
| 4 | 2–6 options, unique keys, non-empty | Reject + question number |
| 5 | Every `answer` key exists | Reject |
| 6 | Single-answer questions have exactly 1 key | Reject |
| 7 | Balanced `$…$`, no unescaped LaTeX | Reject + question |
| 8 | Every question has explanation | **Warning** (app disables explanation CTA) |
| 9 | Option text not duplicated within a question | Warning |
| 10 | Pack < 12 MB, assets < 2 MB each | Reject |
| 11 | Duplicate `id`/checksum | App offers Open / Replace / Copy |
| 12 | **Spot-check vs source PDF** (my manual pass: numbering continuity, key alignment, math symbols, one random question per page) | Human gate before delivery |

### 5.4 Improvements that cut errors before parsing

1. **Ask the AI for a parser-friendly PDF.** I'll give you a copy-paste prompt (Appendix A) that forces `1.` numbering, `A)–D)` options, one answer per line, and an `Answers` + `Explanations` section. Every PDF generated with it converts at ~100% accurately.
2. **Ask for one column, no tables, no answer boxes** (tables and side-by-side layouts are the #1 source of scramble).
3. **Send the same test again if you edit it.** The checksum + `revision` let me produce an update that the app recognises ("Replace existing test?").
4. **Batch conversions:** I keep an intake folder; you can send 5 PDFs and get 5 packs + one report table.

### 5.5 What the converter will not do

* It won't invent answers. If the PDF has no key, the pack is rejected (I'll ask you to regenerate with keys).
* It won't guess a missing explanation; it leaves the field empty and flags it.
* It won't OCR scanned images in v1 (text-layer PDFs only; OCR is a possible v1.1 with Tesseract).

### 5.6 Pack delivery paths

1. **Library tab in *Add New Test*** — packs I build are bundled/served and imported with one tap (best for you).
2. **File** — download `.quizz` → document picker.
3. **Share intent** — WhatsApp/Telegram/Drive → "Open with Quizz".
4. **App update** — packs under `packs/` ship inside the APK.

---

## 6. Data, reliability & performance strategy

### 6.1 Storage model (IndexedDB, versioned)

```
quizz-db (v1)
├── meta        { schemaVersion, installedAt, lastBackupAt, lastOpenedPack }
├── settings    { theme, haptics, fontSize, reduceMotion, sound, lastCategoryId }
├── categories  [{ id, name, colour, order, createdAt }]
├── tests       [{ id, packId, name, categoryId, createdAt, updatedAt, savedDate,
│                  questionCount, sourceFileName, checksum, revision, pack }]
├── attempts    [{ id, testId, testNameSnapshot, startedAt, finishedAt, deadline?,
│                  answers: {n: ["B"]}, order, score, total, marked, mode }]
├── reviews     [{ testId, n, seenAt, correct }]      // hooks for spaced review (v1.1)
└── drafts      [{ testId, answers, index, startedAt }]
```

**Invariants** (each has a test):

1. A saved test carries a **full copy** of its content — deleting the PDF/`.quizz` changes nothing.
2. Attempts store a **name snapshot** and survive test deletion.
3. History is **derived** from attempts — never a duplicate table, so it cannot go stale.
4. Deletes are **soft-confirmed** in the UI and **hard** in storage after confirmation; category delete reassigns, never orphans.
5. Every write is a **single transaction**; imports validate fully before commit.
6. `schemaVersion` migrations are forward-only, idempotent, and run before the UI mounts, with a pre-migration backup snapshot.

### 6.2 Backup & recovery (the thing competitors get wrong)

* **Export backup** → one `.quizzbackup` JSON (settings, categories, tests, attempts, drafts) with a manifest + checksum; share sheet → save to Drive/WhatsApp.
* **Import backup** → preview what's inside, then Merge or Replace.
* **Auto-safety net:** before any destructive migration, write the previous DB snapshot into a `backups` store; keep the last 3. A "Restore previous data" button lives in Settings → Advanced.
* **Corruption guard:** reads are wrapped; if a store fails to parse, the app boots with an error banner and a restore path instead of a white screen.

### 6.3 Performance budgets (measured in CI and on-device)

| Metric | Budget | Technique |
|---|---|---|
| JS bundle (gzip) | < 190 KB | No UI kit, route-level code splitting, KaTeX lazy |
| Fonts | < 220 KB | Variable fonts, subset, `font-display: swap`, preload the display face |
| Cold start (mid device) | < 1.5 s | Pre-render critical shell, defer KaTeX, single DB read, no blocking animation |
| Question advance | < 16 ms frame | Transform/opacity-only, no layout animation on long text, `content-visibility` in long lists |
| Library with 100 tests | scroll at 60 fps | Virtualised list beyond 30 items |
| Memory (500-Q pack) | < 80 MB | Store pack once, derive views, no deep copies per screen |
| Import 40 Q pack | < 400 ms | Single parse + validate + one IDB write |

### 6.4 Security & privacy

* **No INTERNET permission needed** for app function; no analytics SDKs, no telemetry, no ads, no third-party fonts/CDNs at runtime.
* Pack files are treated as untrusted input: schema validation first, text rendered as **text** (never `dangerouslySetInnerHTML`), LaTeX rendered by KaTeX with `trust:false`.
* Assets are limited to image mimes and size-capped; no external URLs are fetched.
* Backup files are user-owned; optional exported file can be password-wrapped later (v1.1).

### 6.5 Accessibility as a build rule (not a pass at the end)

* Semantic landmarks per screen, `aria-live` for progress/score announcements, roving focus in option lists, visible focus rings (keyboard/switch access users exist on Android).
* Correct/wrong encoded with **icon + text + colour** (never colour alone); tested with deuteranopia simulation.
* Dynamic type to 130% without clipping; every fixed-height container has a `min-height` and no `overflow: hidden` on text.
* One-handed reach: primary CTAs within 120 mm of the bottom edge; destructive actions never in thumb's resting zone.

---

## 7. Architecture & engineering strategy

### 7.1 Stack (and why)

| Layer | Choice | Rationale |
|---|---|---|
| UI | React 19 + TypeScript + Vite | Fast iteration, live preview, strong typing for the pack schema. |
| Styling | Hand-written CSS + custom properties (no UI kit) | Total control of the "premium but simple" look; tiny payload; theming is a token swap. |
| Motion | `motion` (Framer) springs + CSS transitions | Interruptible springs, layout animations, reduced-motion handling. |
| State | Zustand (settings/library/attempt) + selectors | Predictable, testable; no provider soup. |
| Storage | IndexedDB via `idb-keyval` (with transaction helper) | Large payloads, async, survives restarts; localStorage only for theme pre-paint. |
| Math | KaTeX (lazy chunk) | Correct math rendering, offline. |
| Native | Capacitor 8 | Real APK, file picker, share-intent, haptics, system bars/insets, splash. |
| Tests | Vitest (logic) + Playwright (flows + visual snapshots) | Scoring/validation/migrations must be provable; visual regressions caught in CI. |

### 7.2 Module map

```
src/
  app/            router, shell, error boundary, boot/migrations, theme provider
  design/         tokens.css, typography.css, motion.ts, primitives (Button, Sheet, Toast…)
  features/
    home/         hero, quick actions, continue-card, stats strip
    import/       dropzone, file read, validate, report, save sheet
    library/      categories, test list, grouping, bulk actions, search
    test/         detail, start-sheet (timer), rename/move/delete
    play/         quiz state machine, question card, progress, timer, draft autosave
    results/      score ring, mistake list, review filters, retry-wrong
    history/      derived stats, attempt list, trend
    settings/     theme, text size, haptics, backup/restore, about, advanced
  lib/            pack schema+validator, scoring, date grouping, storage, share, backup
  types/          pack.ts, store.ts, attempt.ts
```

### 7.3 Quiz state machine (explicit, testable)

```
idle → starting → active ⇄ reviewing_previous
active → paused(draft) → active (resume)
active → finishing → submitted → reviewing ⇄ results
submitted → retake_around
any → discarded (confirm)
```
Every transition has a unit test. The timer is **data on the attempt** (`deadline`), not a background loop — so it survives suspension, reboots and clock drift, and never leaks between attempts.

### 7.4 Testing strategy (layered, CI-enforced)

1. **Unit (Vitest):** scoring matrix (all right/wrong/blank/multi/5-option), validator rule-by-rule fixtures, date grouping across midnight/timezones, migrations v0→v1→v2, backup round-trip, timer deadline maths.
2. **Integration (Vitest + fake IDB):** import → save → rename → move → delete → history rebuild.
3. **E2E (Playwright, mobile viewport):** full journeys (import a pack, play, submit, review, retry wrong), resume after reload, theme switch, category CRUD, backup export/import.
4. **Visual regression:** screenshot every screen in light/dark at 360×640 and 412×915; diff on PR.
5. **Real device:** every APK build installed and smoke-tested on an actual Android phone before I report it (offline, back button, notification interruption, font scale).
6. **Content QA:** every pack validated + spot-checked against the PDF; question count, key coverage, explanation coverage recorded in the delivery report.

### 7.5 CI/CD

* `npm run check` (types + lint + unit) on every push.
* Web build + Playwright + screenshots on every push touching UI.
* Android workflow (M7): Node 22 → build → `cap sync` → Gradle `assembleDebug`/`assembleRelease` → artifact + GitHub Release. Pinned JDK 21, SDK 36, build-tools 36.
* Fallback if Actions is unavailable on the repo (API returned 403): you build once in Android Studio (project pre-configured), or use PWABuilder; the PWA preview remains your daily driver.

---

## 8. Design strategy (deep)

### 8.1 Design brief in one line

> **A study tool that feels like a well-made instrument: calm surfaces, confident type, one moment of delight per action — not a casino.**

### 8.2 Brand concept: "the spark of the solved question"

Two ideas fuse: **Q** (question) and a **check** (solution). The logo is a rounded-square badge where the Q's tail bends into a checkmark, with a 4-point spark escaping the top-right. It reads at 24 px in the status bar and at 512 px on the Play Store listing.

**Logo system**

| Asset | Spec |
|---|---|
| Primary mark | Q + check, deep-space indigo → electric violet gradient, cyan spark |
| Monochrome | Single-colour mark for splash, notifications, watermark |
| Wordmark | *Quizz* in Bricolage Grotesque ExtraBold, tight tracking; the second **z** cut as a lightning zig |
| Adaptive icon (Android) | 108 dp canvas, glyph inside 72 dp safe zone, gradient background layer, monochrome layer for themed icons |
| Splash | Mark draws (600 ms) → wordmark rises → fade to home (total < 900 ms) |
| Clear space / min size | 0.5× glyph height; never below 20 px |
| Do not | Stretch, add outlines, place on busy photos, recolour outside palette |

I'll present **three** logo directions at M1 (mark A: Q-check badge; B: stacked "Qu" ligature; C: spark + stacked cards), and build the winning one into icons/splash.

### 8.3 Design principles

1. **Calm canvas, loud signal.** Neutral surfaces; colour reserved for action, progress, and correct/wrong.
2. **Type does the branding.** No illustrations competing with the question; hierarchy via size/weight/tracking.
3. **One hero motion per screen.** Everything else is 120–200 ms feedback.
4. **Never move text while someone is reading it.** No entrance animations on question/option content; only containers animate.
5. **Depth without mush.** Light: soft shadows on white. Dark: hairline borders + subtle glow, no big blurs.
6. **Feedback before flourish.** Press states, haptics and progress exist to confirm, not decorate.
7. **Respect the thumb and the dark room.** Warm-contrast dark theme, no pure white full-screen flashes, night-friendly at 2 am.

### 8.4 Typography system

| Token | Font / size / weight / tracking | Use |
|---|---|---|
| `display-xl` | Bricolage 40–56 / 800 / −0.03em | Splash, hero score |
| `display-lg` | Bricolage 30 / 800 / −0.02em | Screen titles |
| `title` | Bricolage 22 / 700 | Card titles, test names |
| `question` | Plus Jakarta 19 / 600 / −0.01em / 1.45 | Quiz question text |
| `option` | Plus Jakarta 16.5 / 550 / 1.4 | Answer options |
| `body` | Plus Jakarta 15.5 / 450 / 1.55 | Explanations, descriptions |
| `label` | Plus Jakarta 12.5 / 650 / 0.06em uppercase | Section labels, chips |
| `numeral` | JetBrains Mono 13–56 / tabular | Question badges, scores, timers |

Rules: max 3 font families on screen; body line length 45–70 characters; no text under 12 px; tabular numerals wherever values animate; all sizes scale with the user's font setting (S/M/L = 0.92/1/1.12) clamped to avoid overflow.

### 8.5 Colour system (dark-first, light-parity)

Semantic tokens only — components never reference raw hex.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--bg` | `#F4F5FA` | `#080A11` | App canvas (dark is near-black, not pure, to avoid smearing on OLED) |
| `--surface` | `#FFFFFF` | `#11141F` | Cards |
| `--surface-2` | `#EBEEF7` | `#181D2C` | Inset rows, inputs |
| `--surface-3` | `#E2E6F2` | `#212739` | Pressed/selected |
| `--ink` | `#0C1020` | `#EDEFF8` | Primary text |
| `--ink-2` | `#4C5368` | `#A6ADC4` | Secondary text (≥4.5:1) |
| `--ink-3` | `#7A8199` | `#757D95` | Disabled/hints (non-essential only) |
| `--line` | `rgba(12,16,32,.09)` | `rgba(255,255,255,.10)` | Hairlines |
| `--primary` | `#5A5BF0` | `#8E8DFF` | Brand actions |
| `--primary-soft` | `#ECECFF` | `#1C1E3E` | Tinted backgrounds |
| `--accent` | `#0FB5C9` | `#38E1F0` | Progress, focus, spark |
| `--success` | `#0E9F6E` | `#3BE0B0` | Correct |
| `--danger` | `#D93A46` | `#FF6B76` | Wrong / destructive |
| `--warning` | `#B47407` | `#F5B942` | Timer warnings |
| `--gradient-brand` | `#6D5BFF → #0FB5C9` | `#8E8DFF → #38E1F0` | Hero, ring, wordmark accents |

*Contrast:* all body text ≥ 4.5:1, large display ≥ 3:1, in both themes — verified with an automated contrast test in CI (token pairs), not by eye.
*States:* correct = green + check + "Correct"; wrong = red + cross + "Your answer"; never colour alone. Selected option uses `--primary-soft` + 2 px primary border + filled radio, so it survives greyscale.
*Theming transition:* circular reveal from the toggle using View Transitions where supported, 220 ms cross-fade fallback.

### 8.6 Layout, spacing, elevation

* 8 dp spacing scale (4/8/12/16/20/24/32/40/56), paddings: screen 20 dp, card 16–18 dp, gap between cards 12 dp.
* Radii: 12 (chips), 18 (buttons/inputs), 24 (cards), 32 (sheets/hero). Bottom sheets use 28 top corners.
* Bottom-anchored primary action bar (56 dp) within thumb reach; safe-area padding from `--inset-bottom`.
* Elevation: light `0 1px 2px rgba(12,16,32,.06), 0 8px 24px rgba(12,16,32,.06)`; dark: no shadow, 1 px `--line` + optional 0 0 0 1px primary/8% glow on active cards.
* Grid: single-column on phones; tablets (≥600 dp) get 2-column library and a centered 560 dp reading column for quiz.
* Edge-to-edge: background extends under bars; content scrolls behind a gradient scrim; fixed bars get `padding-top: var(--inset-top)`.

### 8.7 Motion system

**Tokens** (springs are the default; durations only for simple fades/screen transitions):

| Token | Value | Use |
|---|---|---|
| `spring.snappy` | stiffness 900, damping 42 (≈0.9 damping ratio) | Press feedback, chips, toggles |
| `spring.settle` | stiffness 520, damping 34 | Cards entering, option select |
| `spring.sheet` | stiffness 380, damping 34 | Bottom sheets, dialogs |
| `spring.soft` | stiffness 220, damping 28 | Hero/ring reveals |
| `dur.instant` | 90 ms | Press shadow, ripple |
| `dur.fast` | 150 ms | Hover/focus, colour changes |
| `dur.base` | 220 ms | Fades, cross-dissolves |
| `dur.screen` | 260 ms enter / 200 ms exit | Screen transitions |
| `ease.standard` | `cubic-bezier(.2,0,0,1)` | Utility moves |
| `ease.enter` | `cubic-bezier(.05,.7,.1,1)` | Entering elements |
| `ease.exit` | `cubic-bezier(.3,0,.8,.15)` | Exiting elements |

**Choreography (screen by screen):**

| Moment | Motion | Guardrails |
|---|---|---|
| Cold start | mark stroke-draw 600 ms → spark pop 200 ms → wordmark rise 320 ms → home fade | Total ≤ 900 ms; skipped if app resumed < 10 min ago |
| Home entrance | hero + two buttons stagger 40 ms, rise 10 px + fade | Once per launch, never on back-navigation |
| Press | scale .975 + shadow compress, spring.snappy | ≤ 100 ms to visible response |
| Screen push | shared-axis x±24 px + fade, outgoing −16 px | Interruptible; no motion if reduce-motion |
| Bottom sheet | translateY + scrim fade, spring.sheet, drag-to-dismiss with velocity | Backdrop tap + hardware back both close |
| Option tap | fill → checkmark stroke 180 ms → 120 ms hold → card out (y −12, fade) + next in (y +16, fade) | **No** correctness colour; no confetti per answer |
| Progress | width spring + small glow pulse at milestones (25/50/75) | No pulse spam; haptic only at 50% |
| Finish | card collapses → ring sweep 900 ms + count-up (mono digits) | Confetti only ≥ 80%, max 1.2 s, skip if reduce-motion |
| Mistake list | rows stagger 30 ms, expand height spring | Text never animates |
| Theme swap | circular reveal 220 ms (fallback cross-fade) | Persisted before paint to avoid flash |
| Toast | rise 8 px + fade, auto-dismiss 2.6 s, swipe up to dismiss | Max one at a time; queued |
| Loading | skeleton shimmer 1.2 s loop, **never** an infinite spinner on a finite task | Skeletons mirror final layout |

**Delight budget:** exactly four "wow" moments — logo build, score ring + confetti, first-save success, and the perfect-score variant. Everything else is quiet.

### 8.8 Haptics, sound, and physicality

* Haptics via Capacitor: **light** on option select & chip toggle, **medium** on submit/results, **double pulse** on save/success, **heavy** never.
* Sound: **off by default**. Optional quiet tick on option select and a soft chime on results, respecting the phone's silent mode. No music.
* Physicality in type and surfaces: pressed states compress, sheets snap with velocity, long-press reveals selection like iOS/Android native.

### 8.9 Iconography & illustration

* One consistent icon set: 2 px stroke, round caps, 24 px grid (Lucide-style, customised), no mixed metaphors.
* Illustrations: 3 lightweight inline SVGs only — empty library, empty history, "no mistakes" celebration. Flat, 2-tone, brand gradient, no stock art.
* Charts: score trend as a simple sparkline with dots, no axes; readable at a glance.

### 8.10 Content design (microcopy voice)

Voice: **direct, warm, never chirpy**. Short sentences. No exclamation marks except one celebration.

| Where | Copy |
|---|---|
| Home greeting | "Ready when you are." / "2 tests waiting." |
| Primary buttons | "Add new test", "Saved tests", "Start test", "Show explanation" |
| Import success | "Saved to Chemistry" |
| Import failure | "This file can't be imported. Question 12's answer key points to option E, which doesn't exist." + "Copy report" |
| Resume | "Continue where you left off — question 14 of 40" |
| Timer on | "20 minutes · this timer won't be saved" |
| Time up | "Time's up. Your answers are saved." |
| Results heading | Tiered: "Solid." (≥80), "Getting there." (50–79), "Worth another look." (<50) — never shaming |
| Empty history | "Attempts show up here. Start a test to see your first score." |
| Delete test | "Delete *Chem Ch.3*? 4 attempts will stay in History." |

### 8.11 Screen-by-screen design intent

| Screen | Job | Signature element |
|---|---|---|
| Splash | Reassure, brand | Logo build animation |
| Home | 3-second orientation, two big choices | Hero card + gradient primary button + stats strip |
| Add New Test | Zero-friction import | Dropzone that morphs into a validation report |
| Save sheet | Name + category in one thumb reach | Inline category chips + "New" chip |
| Saved Tests | Find a test fast | Category pill row + date-grouped cards with best-score badges |
| Test detail | Decide to start or read | Best-score ring, two primary actions |
| Start sheet | Choose one-time timer | Segmented switch + duration chips |
| Quiz | Focus, momentum | Progress rail, big question type, options as tactile rows |
| Results | Emotional beat + action | Score ring, then mistakes immediately |
| Review | Learn | Filter chips, your-answer vs correct, explanations |
| History | Proof of progress | Sparkline + best/last/attempt counts |
| Categories | Structure | Colour dots, drag reorder, inline rename |
| Settings | Control, trust | Grouped rows, backup/restore, storage usage |

### 8.12 Design QA checklist (run before every milestone handoff)

- [ ] 360×640 and 412×915, light and dark, font scale 100% and 130%
- [ ] No text under 12 px, no clipped labels, no horizontal scroll
- [ ] Contrast: automated token-pair test passes; manual spot-check in greyscale
- [ ] Correct/wrong distinguishable without colour
- [ ] Every screen has an empty, loading, error and (where relevant) success state
- [ ] Every tap gets feedback in < 100 ms; every destructive action has a confirm with consequences
- [ ] Reduce-motion path checked; no animation > 1.2 s except logo
- [ ] Hardware back closes sheets before navigating; quiz exit asks first
- [ ] Kill app mid-session → resume works; airplane mode from cold start → no errors
- [ ] Screen-reader pass on Home, Quiz, Results

---

## 9. Feature specifications (the details that make it feel finished)

### 9.1 Home
Logo, greeting, theme toggle, **History** (top-right, icon + label pill). Two large buttons: **Add new test** (gradient, primary) and **Saved tests** (surface, secondary), equal height, staggered entrance, pressed states. Below: resume card (if a draft exists), stats strip (tests saved · attempts · best %). Long-press on a button does nothing (no hidden gestures in a utility app).

### 9.2 Add New Test
Tabs: **File** | **Library**. File: dropzone + "Choose file" (`.quizz`, `.json`); pasting raw JSON is also accepted (debug convenience). Library: packs I built, with title, subject, question count, "quality" line. After picking: progress → **validation report** (title, subject, count, explanation coverage, warnings, errors) → **Save sheet** (name field pre-filled, default name = pack title, category chips + New) → save → success toast + navigate to the saved test. Errors never produce a half-saved test.

### 9.3 Saved Tests
Category pill row (`All` + categories with counts) → list grouped by saved date (Today / Yesterday / Last 7 days / Earlier). Card: name, category dot, "40 questions", best %, last attempt. Tap = test detail. `⋯` = Rename / Move / Duplicate / Delete. Search icon filters by name. Bulk mode via long-press: move/delete selected. Empty state → "Add your first test".

### 9.4 Categories
Seeded: English, Maths, Physics, Chemistry, Biology, Uncategorized (protected, cannot be renamed/deleted). Add via FAB; rename inline; delete with "N tests will move to Uncategorized"; reorder by drag with haptics. Counts update live.

### 9.5 Test detail
Cover: name, category, question count, saved date, source file name (informational only — never a dependency). Best score ring + attempt count + last attempt. Primary: **Start test**; secondary: **Show explanation** (disabled with reason if no explanations). `⋯`: Rename / Move / Delete / Share pack? (v1.1).

### 9.6 Start sheet + one-time timer
Sheet shows test facts and a **Timer** switch, **OFF every time the sheet opens**. Turning it on reveals quick chips (10 / 15 / 20 / 30 / 45 / 60 / custom) and a pace hint. Nothing is stored as a preference; the duration lives on the attempt as `deadline` only. Timer chip in the quiz header turns amber < 5 min, red < 1 min, pulses at < 30 s. Time up → auto-submit, unanswered marked, "Time's up" label. No pause. "Save & exit" keeps answers, drops the deadline.

### 9.7 Quiz play
One question per screen. Header: close (confirm), progress "12 / 40" + rail, optional timer chip, flag icon. Question number badge **matches the PDF**. Options keep their PDF order and letters. Tap selects; no correctness; 120 ms, then advance. Back arrow returns with selection intact. Last question → "Finish test" (never auto-finish on tap). Autosave every tap. Hardware back → previous question, then exit confirm. Long question scrolls; options remain full-width.

### 9.8 Results
Ring + percentage (count-up, mono), tiered heading, correct/wrong/unanswered, time taken, timed-emblem if applicable. **Mistakes section directly below** (collapsed for correct): each row = question, your option (red, "Your answer"), correct option (green, "Correct answer"), explanation (expanded by default for wrong answers). Actions: **Show explanation** (full review), **Retry wrong only** (new attempt with only wrong questions, same numbering preserved), **Retake full test**, Done.

### 9.9 Review & explanations
All questions, filter chips (All / Wrong / Unanswered / Flagged), search, jump-to-question sheet. Correct option highlighted; your pick shown even if wrong; explanation text with LaTeX; per-question "Flag for later" and "Copy question". Works without an attempt (Test detail → Show explanation).

### 9.10 History
Header stats: attempts, average %, best %. List grouped by test, most recent first: name, attempts, **best %**, last attempt date + score, sparkline. Tap a test → its attempts list → tap an attempt → that attempt's results (read-only, with correct answers; explanations available). Deleted tests remain as "Deleted test" rows with snapshot name. Updates the instant an attempt is submitted.

### 9.11 Settings
Theme (System/Light/Dark), text size, haptics, sound, reduce motion, backup export/import, restore snapshot, storage usage, About (version, pack format, licences), Reset app (typed confirm). No timer preference by design.

---

## 10. Milestones with exit criteria

| # | Milestone | Deliverable | Exit criteria |
|---|---|---|---|
| **M0** | Plan v2 + format contract | This doc, JSON Schema, sample pack | You approve the direction (or send changes). |
| **M1** | Design system + shell + home | Logo directions, tokens, theme switch, home, navigation, motion, placeholders | Looks intentional on 360×640 in both themes; 60 fps; splash < 900 ms. |
| **M2** | Content pipeline | Converter + validator + first real pack from your PDF; 3-PDF calibration | 3 PDFs convert with all keys/explanations; spot-check passes; report delivered. |
| **M3** | Import + library | Add New Test, validation report, save sheet, categories CRUD, grouped list, rename/move/delete, persistence | Save → kill app → reopen → test intact with source file deleted. |
| **M4** | Quiz core | Start sheet + timer, quiz play, autosave/resume, results, mistakes, explanations, retry wrong | Full test played end-to-end; numbering/options match PDF; interrupt/resume works. |
| **M5** | History + settings | Derived history, trend, backup/restore, settings, empty states | Best/last correct after every scenario; backup round-trip 100%. |
| **M6** | Polish + QA | Motion audit, a11y, performance, visual regression, real-device pass | Definition-of-perfect table (§1.4) all green. |
| **M7** | APK | Capacitor project, icons/splash, CI build, signed APK, install doc | APK installs and runs offline on your phone; splash/icon correct; upgrades preserve data. |

**Sequencing logic:** M1 proves the feel; M2 removes content risk; M3–M4 deliver the actual value; M5 closes the loop (history); M6 makes it feel expensive; M7 makes it an app.

---

## 11. APK / release strategy (M7 detail)

* **Shell:** Capacitor 8, `android/` committed, minSdk 24 / target+compile 36, AGP 8.13 / Gradle 8.14.3, JDK 21, Node 22.
* **Native integrations:** Filesystem + Share (import/export), Haptics, Splash Screen, Status Bar/System Bars plugin for insets and bar styling, App (back button, resume), optional Keep Awake in quiz.
* **Config:** locked portrait (quiz is single-column), `adjustResize` keyboard behaviour, `configChanges` incl. density, no cleartext, no INTERNET permission unless required.
* **Icons/splash:** adaptive foreground + background + monochrome, all densities; light & dark splash; `values-night` colours so cold start never flashes white in dark mode.
* **CI:** `.github/workflows/android.yml` — build web → `cap sync` → `assembleDebug` (artifact) and signed `assembleRelease` when secrets exist → attach to GitHub Release with version notes.
* **Signing:** keystore generated once, stored as Actions secrets; `versionCode` auto-increment; release notes list pack changes.
* **Install guide you get:** download APK → "Install unknown apps" permission for the browser → install → open (offline) → import first pack. Screenshots included.
* **Updates:** installing a new APK over the old one keeps IndexedDB (same package id + signing key) — data survives; verified in M7.
* **Fallback:** PWA install (Add to Home Screen) gives offline use with the same codebase if APK delivery is blocked.

---

## 12. Risk register

| Risk | Likelihood | Impact | Mitigation | Early signal |
|---|---|---|---|---|
| PDF structure varies wildly | High | Wrong content | Prompt template (§Appendix A), per-generator rulesets, confidence scoring, manual spot-check | First conversion has >2 unresolved warnings |
| Answer key mismatch in source PDF | Medium | Wrong scoring | Keys validated + cross-checked against key block; I flag anomalies (e.g. 5 same answers in a row) | Validator anomaly report |
| GitHub Actions unavailable | Medium | No cloud APK | Build in Android Studio fallback; project ready; PWA meanwhile | Workflow 403 at M0 check (already seen on API) |
| Edge-to-edge/inset bugs on Android 15+ | Medium | UI under bars | System Bars plugin → CSS vars → `env()` fallback → device test + inset debug overlay | Content clipped in first device test |
| Low-end jank / memory | Medium | Bad feel | Transform/opacity-only motion, virtual lists, size caps, budgets in CI, test on 360×640 | Dropped frames in Playwright traces |
| Data loss (uninstall, corruption) | Low | Trust destroyed | Backup/restore, pre-migration snapshots, export prompt after 10 attempts | Any failed IDB transaction test |
| Scope creep | High | Delay | MoSCoW + v1.1 list + change control | New feature asked mid-milestone |
| Font/asset bloat | Low | APK > 8 MB | Subset fonts, inline SVG icons, lazy KaTeX | Bundle report > budget |
| Timezone/date grouping bugs | Low | "Wrong dates" | UTC storage, local-day grouping, tests at midnight | E2E date fixture failure |
| Accessibility gaps | Medium | Unusable for some users | Build-time rules + checklist + automated contrast | Contrast test fails |

---

## 13. Decision log

| # | Decision | Why | Reversible? |
|---|---|---|---|
| D1 | Web core + Capacitor 8, not native Kotlin | Preview on your phone from day one; no local SDK; real APK at the end | Hard (rewrite) |
| D2 | `.quizz` = plain JSON, not ZIP/binary | Inspectable, portable, safe, no device PDF code | Yes (v2 format + migration) |
| D3 | PDF parsing happens on my side, never on-device | Quality control, no heavy native deps, APK stays small | Hard |
| D4 | Full content copy stored per test | Your "saved stays saved" requirement | No |
| D5 | History derived from attempts | Cannot go stale or desync | Yes |
| D6 | Timer per attempt, never persisted | Your explicit requirement; prevents surprise timing | No |
| D7 | No correctness feedback during test | Your explicit requirement; mirrors real exams | Yes (setting later) |
| D8 | Dark-first design with light parity | Evening study use, battery, modern expectation | Yes (tokens) |
| D9 | Option order/numbering never shuffled by default | Matches PDF, avoids math mapping errors | Yes (opt-in) |
| D10 | No accounts, no AI, no telemetry | Trust, offline, privacy, simplicity | Yes (would need backend) |
| D11 | Bricolage display + Jakarta body + JetBrains numerals | Distinctive without hurting readability | Yes (tokens) |
| D12 | Manual review of every generated pack | Correctness is the product | No |

---

## 14. Open questions

1. **Logo direction** — three options at M1; you pick.
2. **Practice mode** (instant feedback) — still not built; say the word and it becomes a Start-sheet option.
3. **Urdu/bilingual UI** — English-only for v1 unless you want labels in Urdu.
4. **Your PDFs** — send 2–3 typical ones at M2 so I can calibrate; the prompt template (Appendix A) is optional but improves accuracy.

---

## Appendix A — Prompt to give the AI that generates your test PDF

Paste this **before** your topic request. It makes the PDF convert at near-100% accuracy:

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

---

## Appendix B — Format quick reference

* File: UTF-8 JSON, extension `.quizz`, max 12 MB, 1–500 questions.
* Required: `format`, `formatVersion`, `id`, `title`, `createdAt`, `questions`.
* Per question: `n`, `type`, `question`, `options[]`, `answer[]`; optional `explanation`, `group`, `asset`, `tags`, `difficulty`, `sourceRef`.
* Validation: `docs/quizz-pack.schema.json` · example: `docs/sample-pack.quizz`.
* Numbers and option order are **authoritative** — the app never renumbers or reorders.

---

## Appendix C — Research references

Platform & motion
* Material 3 Expressive motion (spring physics, spatial vs effects, reduced motion) — https://saglitz.com/design/material-3
* M3 motion tokens & transition easings — https://www.getclaudeskills.com/skills/material-design-3-hamen
* Material 3 motion implementation checklist — https://lobehub.com/skills/shelbeely-shelbeely-agent-skills-material-design-3-motion
* Android 15 edge-to-edge enforcement / WebView safe-area behaviour — https://github.com/ilkyeong-gn/learn-safe-area/issues/4
* Capacitor 8 requirements (SDK 36, JDK 21, Node 22, SystemBars) — https://capgo.app/blog/upgrade-capacitor-app-to-capacitor-8/
* Capacitor 8 migration notes (Gradle/AGP, configChanges) — https://capawesome.io/blog/how-to-upgrade-your-capacitor-app-to-capacitor-8/

Learning science
* Testing effect, feedback and spacing (Roediger & Karpicke 2006; meta-analyses) — https://recallify.ai/evidence-for-active-recall-and-spaced-repetition/
* Retrieval practice vs re-reading, effect sizes — https://hiperformanceculture.com/learning/trend-active-recall/
* Feedback is non-optional for retrieval — https://whats-your-iq.com/en/articles/learning-strategies/spaced-repetition-active-recall-science

Market & competitors
* Quizlet vs Anki user complaints (sync loss, paywalls, wrong content) — https://unstar.app/blog/quizlet-anki-brainscape-knowt-studysmarter-flashcard-study-apps-ranked-2026
* Quizlet vs Anki feature comparison — https://www.coursebox.ai/blog/quizlet-vs-anki
* Quiz UI conventions (timer placement, answer states) — https://uidesignprompts.com/prompts/quiz-app-ui

Design trends & typography
* Micro-interactions, dark-first, motion as instruction — https://www.designveloper.com/blog/mobile-app-design-trends/
* UI animation trends (springs, haptics, low-power motion) — https://booleaninc.com/blog/the-evolution-of-ui-animation-in-mobile-apps/
* Bricolage Grotesque (display-only rationale, OFL, axes) — https://fontpair.co/fonts/google/bricolage-grotesque
* Bricolage Grotesque licence & variable axes — https://fontalternatives.com/fonts/bricolage-grotesque/

---

*Next: your approval of v2 (plus any changes), then M1 — logo directions, design system, home screen, live preview on your phone.*
