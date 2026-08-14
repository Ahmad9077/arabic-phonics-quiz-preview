# Tasks: Arabic Phonics Letter Quiz

**Input**: Design documents from `specs/001-arabic-phonics-quiz/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by the feature specification and project constitution. Story tests are
written before the matching implementation and verified red before green.

**Organization**: Tasks are grouped by user story and executed in dependency order.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the standalone static app and reproducible quality tooling.

- [x] T001 Initialize Git and create safe Node/project ignore rules in `.gitignore`
- [x] T002 Create runtime and development dependency scripts in `package.json`
- [x] T003 [P] Configure TypeScript and Vite preview/production modes in `tsconfig*.json` and `vite.config.ts`
- [x] T004 [P] Configure ESLint, Vitest, and Playwright in `eslint.config.js`, `vitest.config.ts`, and `playwright.config.ts`
- [x] T005 [P] Create the RTL document shell, metadata, and root mount in `index.html` and `src/main.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared types, deterministic randomness, and the visual foundation.

- [x] T006 Create quiz, letter, round, attempt, and Hub shared types in `src/domain/types.ts`
- [x] T007 [P] Implement deterministic seeded random helpers in `src/domain/seededRandom.ts`
- [x] T008 [P] Add bundled Arabic font imports and design tokens in `src/styles/tokens.css`
- [x] T009 Implement the responsive RTL application surface and reusable states in `src/styles/app.css`
- [x] T010 [P] Create inline accessible icon primitives in `src/components/icons.tsx`

**Checkpoint**: Shared types, rendering tokens, and tooling are ready.

---

## Phase 3: User Story 1 - Hear and identify a letter sound (Priority: P1) 🎯 MVP

**Goal**: A learner starts a round, hears a bundled cue, chooses one of four letters, and the
first response locks with clear Arabic feedback.

**Independent Test**: Start preview, replay the cue, select once, double-tap another option,
and confirm one locked attempt and one next action.

### Tests for User Story 1

- [x] T011 [P] [US1] Write failing audio-manifest completeness and mapping tests in `tests/unit/audio-manifest.test.ts`
- [x] T012 [P] [US1] Write failing core listen/select/lock browser flow in `tests/e2e/quiz-flow.spec.ts`

### Implementation for User Story 1

- [x] T013 [US1] Curate all 28 Arabic letters, names, fatha cues, joining types, and families in `src/data/letters.ts`
- [x] T014 [US1] Create reproducible Majed/FFmpeg generation and validation tools in `scripts/generate-audio.sh` and `scripts/validate-audio.mjs`
- [x] T015 [US1] Generate and validate 28 bundled cues and metadata in `public/audio/*.mp3` and `public/audio/manifest.json`
- [x] T016 [US1] Implement reusable preload, replay, concurrency, and failure handling in `src/audio/audioPlayer.ts`
- [x] T017 [P] [US1] Build the Echo Portal sound control in `src/components/EchoPortal.tsx`
- [x] T018 [P] [US1] Build the four-choice accessible answer grid in `src/components/AnswerGrid.tsx`
- [x] T019 [US1] Build start and active question screens in `src/components/StartScreen.tsx` and `src/components/QuizScreen.tsx`
- [x] T020 [US1] Wire start, replay, first-answer lock, feedback, and advance state in `src/App.tsx`

**Checkpoint**: The listen-and-identify MVP works with real bundled Arabic audio.

---

## Phase 4: User Story 2 - Recognize Arabic joining forms (Priority: P2)

**Goal**: Every round uses 15 distinct letters with exactly five isolated, five valid initial,
and five valid final questions; options share a mode and respect joining rules.

**Independent Test**: Generate 1,000 rounds and prove all quotas, choice uniqueness, adaptive
sanitization, difficulty behavior, and invalid-initial exclusions.

### Tests for User Story 2

- [x] T021 [P] [US2] Write failing 28-letter and 78-variant joining-rule tests in `tests/unit/letters.test.ts`
- [x] T022 [P] [US2] Write failing 1,000-round invariant and difficulty tests in `tests/unit/question-engine.test.ts`

### Implementation for User Story 2

- [x] T023 [US2] Implement glyph formatting and valid variant expansion in `src/domain/questionEngine.ts`
- [x] T024 [US2] Implement preferred-key sanitization and exact 5/5/5 distinct-letter round selection in `src/domain/questionEngine.ts`
- [x] T025 [US2] Implement easy/medium/hard same-mode distractors and seeded challenge choices in `src/domain/questionEngine.ts`
- [x] T026 [US2] Integrate valid round generation, form labels, progress, and next-audio preload in `src/App.tsx` and `src/components/QuizScreen.tsx`

**Checkpoint**: All requested Arabic forms are correct and mechanically proven.

---

## Phase 5: User Story 3 - Finish, review, and repeat a round (Priority: P3)

**Goal**: Completion shows an Arabic score summary, full answer review with cue replay, and a
fresh valid round.

**Independent Test**: Complete a mixed-score round, inspect every review field, replay a missed
cue, start again, and confirm no prior attempt state survives.

### Tests for User Story 3

- [x] T027 [P] [US3] Extend failing results, review replay, and clean restart flows in `tests/e2e/quiz-flow.spec.ts`

### Implementation for User Story 3

- [x] T028 [US3] Build score, positive messaging, answer review, and replay actions in `src/components/ResultsScreen.tsx`
- [x] T029 [US3] Integrate fifteenth-answer completion, immutable attempt details, and fresh-round reset in `src/App.tsx`

**Checkpoint**: A full 15-question practice session is independently complete.

---

## Phase 6: User Story 4 - Established Hub pathways with preview isolation (Priority: P4)

**Goal**: Keep the deployed approval link write-free while fully preparing access, adaptive,
fallback progress, and deterministic challenge contracts for post-approval integration.

**Independent Test**: Preview makes zero Hub/Supabase requests; production-mode stubs accept
access/difficulty, preferred keys, one report path, and one submission per challenge turn.

### Tests for User Story 4

- [x] T030 [P] [US4] Write failing Hub bridge unit/contract tests in `tests/unit/hub-contract.test.ts`
- [x] T031 [P] [US4] Write failing preview isolation and Hub/challenge stub flows in `tests/e2e/hub-contract.spec.ts`

### Implementation for User Story 4

- [x] T032 [US4] Define global access, adaptive, progress, and challenge interfaces in `src/hub/contracts.ts`
- [x] T033 [US4] Implement compile-mode client loading, access timeout, and preview isolation in `src/hub/bootstrap.ts`
- [x] T034 [US4] Implement best-effort adaptive/fallback reporting and one-submit-per-turn challenge bridge in `src/hub/bridge.ts`
- [x] T035 [US4] Integrate normalized difficulty, preferred keys, reporting, waiting/reveal challenge states, and recovery in `src/main.tsx` and `src/App.tsx`
- [x] T036 [P] [US4] Create and schema-check Hub-compatible metadata in `public/quiz-manifest.json`
- [x] T037 [P] [US4] Generate but do not apply 78 adaptive profiles and catalog instructions in `scripts/generate-hub-seed.mjs`, `integration/seed-arabic-phonics.sql`, and `integration/production-hub-catalog.md`

**Checkpoint**: Preview is isolated and all future Hub flows are contract-ready.

---

## Phase 7: Polish, Accessibility, Deployment, and Independent Verification

**Purpose**: Enforce the complete quality floor and publish only the separate preview.

- [x] T038 [P] Write keyboard, focus, reduced-motion, and automated accessibility checks in `tests/e2e/accessibility.spec.ts`
- [x] T039 [P] Write 320-pixel operability and 390 x 844 no-scroll visual checks in `tests/e2e/mobile.spec.ts`
- [x] T040 Add CI and preview-only Pages artifact workflows in `.github/workflows/ci.yml` and `.github/workflows/deploy-preview.yml`
- [x] T041 Add setup, content, preview boundary, and deferred production notes in `README.md`
- [x] T042 Run lint, typecheck, unit/property, audio, preview-build, and full Playwright gates and fix every failure
- [x] T043 Capture and visually review desktop/mobile start, quiz, feedback, and results screenshots in `artifacts/screenshots/`
- [x] T044 Obtain an independent Test Automation Engineer review and resolve all reproducible blocking findings
- [x] T045 Initialize the preview repository, commit the reviewed tree, and push only the standalone preview code
- [x] T046 Enable GitHub Pages Actions, wait for deployment success, and verify the public preview URL, audio assets, and no-write network boundary
- [x] T047 Re-check the live Hub remote head, local Hub worktree, existing quiz worktrees, and production URLs to prove no pre-approval production mutation
- [x] T048 Mark every task complete and run the quickstart validation exactly as documented in `specs/001-arabic-phonics-quiz/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup must complete before foundational work.
- Foundation blocks all user stories.
- US1 supplies the audio and answer loop used by US2 and US3.
- US2 supplies stable question keys and deterministic choices required by US4.
- US3 depends on US1 attempts and US2 glyph variants.
- US4 can finish after US2 and before final polish.
- Final verification and deployment require all four stories.

### Parallel Opportunities

- T003-T005, T007-T010, and the paired test tasks affect different files.
- Echo Portal and Answer Grid can be built independently after audio/player contracts exist.
- Accessibility and mobile suites can be authored in parallel after the core screens stabilize.
- Manifest and deferred SQL generation do not modify the same files as the runtime bridge.

### Independent Test Criteria

- **US1**: real cue replay plus one locked response under rapid repeated taps.
- **US2**: 1,000 rounds with exact quotas, 15 unique targets, four unique choices, and no
  right-joining-only letter in initial mode.
- **US3**: accurate result/review and state-free replay of a new round.
- **US4**: no preview Hub/Supabase traffic plus successful access/adaptive/progress/challenge
  stubs in production mode.

## Implementation Strategy

Complete US1 as the audible MVP, then add form correctness, results, and the deferred Hub bridge.
Do not deploy until all automated gates and the independent test review pass. Deployment is a
preview deliverable only; production activation remains a separate post-approval task.

## Format Validation

All 48 tasks use the required checkbox, sequential ID, optional `[P]`, story label where
applicable, concrete action, and explicit file path format.

---

## Phase 8: Approved B Audio and Production Hub Release

**Purpose**: Execute the explicit post-approval release without weakening the preview boundary
or altering unrelated Hub data.

- [x] T049 Record treatment-B and production approval in `spec.md`, `plan.md`, `research.md`, and `quickstart.md`
- [x] T050 [P] Add failing two-take audio, natural-speed, cache-revision, and production-build tests in `scripts/validate-audio.mjs` and `tests/`
- [x] T051 Generate and process all 28 approved Layla carrier-phrase cues in `public/audio/*.mp3` and `public/audio/manifest.json`
- [x] T052 Update the runtime audio revision, quiz semantic version, README, and remove the obsolete A/B-only page in `src/audio/audioPlayer.ts`, `public/quiz-manifest.json`, and `README.md`
- [x] T053 Make the Pages workflow deploy preview mode from `arabic-phonics-quiz-preview` and production mode from `arabic-phonics-quiz` in `.github/workflows/deploy-preview.yml`
- [x] T054 [P] Add the reviewed Hub catalog, schema seed, cache bump, and migration in `/Users/macserver/Documents/quizzes-hub/`
- [x] T055 Run lint, typecheck, unit/property, audio, both builds, and full desktop/mobile browser gates and resolve every failure
- [x] T056 Obtain an independent Test Automation review of audio, normal Hub, challenge, and production deployment paths
- [ ] T057 Create and deploy the `arabic-phonics-quiz` production repository and verify the production build, 28 live MP3s, and absent preview marker
- [ ] T058 Apply the reviewed Supabase migration and verify exactly one quiz row and 78 adaptive profiles without changing unrelated assignments
- [ ] T059 Assign only the intended child profile(s), deploy the refreshed Hub catalog, and verify the cache-busted live Hub
- [ ] T060 Complete live normal-launch, adaptive/progress, challenge, and existing-quiz smoke tests and record final evidence
