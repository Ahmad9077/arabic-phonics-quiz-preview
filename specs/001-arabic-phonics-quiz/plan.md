# Implementation Plan: Arabic Phonics Letter Quiz

**Branch**: `001-arabic-phonics-quiz` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-arabic-phonics-quiz/spec.md`

## Summary

Build a standalone RTL React application that teaches the 28 core Arabic letters through
short-fatha audio cues and four-choice glyph recognition. Keep round generation, joining
rules, seeded challenge choices, and Hub reporting in testable domain modules. Bundle and
validate one normalized MP3 per letter. After the 2026-08-14 approval, replace each cue with
treatment B (two natural-speed takes with a short pause and preserved onset), retain the
isolated preview build, deploy the `production-hub` build to its stable repository, and
activate the already-tested Hub bridge and reviewed seed artifacts.

## Technical Context

**Language/Version**: TypeScript 6.0.3, React 19.2.8, Node.js 26.5.0

**Primary Dependencies**: React 19.2.8, React DOM 19.2.8, Vite 8.2.1,
`@fontsource-variable/noto-sans-arabic` 5.3.0, and
`@fontsource-variable/noto-kufi-arabic` 5.3.0

**Storage**: In-memory round state; static JSON/audio assets. Existing Quizzes Hub/Supabase
contracts are best-effort production integrations only and are disabled in preview mode.

**Testing**: Vitest 4.1.10 for domain and contract tests; Playwright 1.62.1 for desktop,
mobile, keyboard, audio, reduced-motion, Hub stubs, and preview network isolation

**Target Platform**: Static GitHub Pages preview; current Safari, Chrome, Firefox, and
mobile WebKit/Chromium with a minimum 320-pixel layout width

**Project Type**: Single static web application with no backend

**Performance Goals**: Interactive start screen within two seconds after static assets arrive;
question transition below 150 ms; current and next audio decoded or ready without blocking
answer input; active 390 x 844 question screen requires no document scroll

**Constraints**: 15 questions and four options; exact 5/5/5 form balance; 28 audio assets
under 80 KB each; two natural-speed takes per cue with no time stretching; RTL and keyboard
accessibility; no browser speech-synthesis dependency; production changes only after explicit
approval and with unrelated catalog entries and assignments preserved

**Scale/Scope**: 28 letters, 78 valid form variants (28 isolated + 22 initial + 28 final),
15 attempts per normal round, four user-facing screens, one preview deployment, and one
deferred production-integration package

## Constitution Check

*GATE: Passed before research and passed again after Phase 1 design.*

- **Child-First Learning**: PASS. The core loop is one cue, four large options, locked
  feedback, and short Arabic copy; the round length matches the established 15-question norm.
- **Arabic Accuracy**: PASS. Unicode joining types drive eligibility; all generated rounds
  and glyph/audio/key mappings are mechanically validated.
- **Deterministic Audio**: PASS. All cues are bundled, normalized, preflighted, replayable,
  and covered by missing/corrupt-asset tests.
- **Accessible RTL Interaction**: PASS. The component and browser test plan covers RTL,
  visible focus, keyboard use, touch sizes, reduced motion, 320-pixel width, and 390 x 844 fit.
- **Safe Hub Integration**: PASS. Preview and production are separate compile modes; preview
  contains no client-loader execution and network tests fail on Hub/Supabase requests.
- **Quality Gates**: PASS. Lint, typecheck, unit/property, audio, production build, browser,
  live preview, and untouched-production checks are explicit tasks.

## Project Structure

### Documentation (this feature)

```text
specs/001-arabic-phonics-quiz/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── hub-contract.md
│   └── quiz-manifest.schema.json
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
public/
├── audio/
│   ├── manifest.json
│   └── *.mp3
├── favicon.svg
└── quiz-manifest.json

src/
├── audio/
│   └── audioPlayer.ts
├── components/
│   ├── AnswerGrid.tsx
│   ├── EchoPortal.tsx
│   ├── QuizScreen.tsx
│   ├── ResultsScreen.tsx
│   └── StartScreen.tsx
├── data/
│   └── letters.ts
├── domain/
│   ├── questionEngine.ts
│   ├── seededRandom.ts
│   └── types.ts
├── hub/
│   ├── bootstrap.ts
│   ├── bridge.ts
│   └── contracts.ts
├── styles/
│   ├── app.css
│   └── tokens.css
├── App.tsx
├── main.tsx
└── vite-env.d.ts

scripts/
├── generate-audio.sh
├── generate-hub-seed.mjs
└── validate-audio.mjs

integration/
├── production-hub-catalog.md
└── seed-arabic-phonics.sql

tests/
├── e2e/
│   ├── accessibility.spec.ts
│   ├── hub-contract.spec.ts
│   ├── mobile.spec.ts
│   └── quiz-flow.spec.ts
└── unit/
    ├── audio-manifest.test.ts
    ├── letters.test.ts
    └── question-engine.test.ts

.github/workflows/
├── ci.yml
└── deploy-preview.yml
```

**Structure Decision**: A single static application keeps the child experience and preview
deployment simple. Pure domain/audio/Hub boundaries make the orthographic rules, deterministic
challenge behavior, and no-write preview contract testable without introducing a backend.

## Complexity Tracking

No constitution violations require exceptions. The production approval gate was satisfied by
the user's explicit approval on 2026-08-14; Phase 8 performs the gated release checks.
