# Feature Specification: Arabic Phonics Letter Quiz

**Feature Branch**: `001-arabic-phonics-quiz`

**Created**: 2026-08-14

**Status**: Approved for production integration on 2026-08-14

**Input**: Create a child-friendly multiple-choice quiz for the existing Quizzes Hub.
Each question is audio-only and pronounces an Arabic letter as a phonics sound. The child
chooses the matching letter from four Arabic glyphs. Questions vary between isolated,
initial, and final joining forms. Deliver a separate online preview for approval, without
registering, assigning, or publishing the quiz in the production Hub before approval.

**Approval decision**: The user approved audio treatment B: two natural-speed short-fatha
takes, a brief pause between them, preserved consonant onset, and no time stretching. The user
also explicitly approved production publication and Unified Hub integration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hear and identify a letter sound (Priority: P1)

As a young learner, I can hear one short Arabic phonics sound and choose the matching
letter from four large options, so I practice connecting sounds to written letters.

**Why this priority**: This is the core learning loop and delivers the quiz's primary value.

**Independent Test**: Start a standalone round, play the first prompt, choose an option,
and verify that the first answer is recorded once with clear visual and spoken-independent
feedback before advancing.

**Acceptance Scenarios**:

1. **Given** the start screen, **When** the learner starts a round, **Then** the first short
   phonics cue plays and no written target or letter name reveals the answer.
2. **Given** an unanswered question, **When** the learner presses the sound control,
   **Then** the exact same cue replays without changing the choices.
3. **Given** four visible choices, **When** the learner selects one, **Then** the answer locks,
   correctness is shown with a symbol and text as well as color, and repeated taps do not
   alter the recorded attempt.
4. **Given** a locked answer, **When** the learner continues, **Then** exactly one new question
   appears and its audio is ready to replay.

---

### User Story 2 - Recognize Arabic joining forms (Priority: P2)

As a learner, I practice the same base letters in valid isolated, initial, and final forms,
so I recognize a letter even when its shape connects to a neighboring stroke.

**Why this priority**: The requested learning difference is recognition across Arabic
joining forms, not only recognition of isolated alphabet cards.

**Independent Test**: Generate a complete 15-question round and verify that it contains
five isolated, five valid initial, and five valid final questions, with all four options in
each question using the same display mode.

**Acceptance Scenarios**:

1. **Given** a target such as ع in isolated mode, **When** its question appears, **Then** the
   correct option is ع and all distractors are different base letters in isolated mode.
2. **Given** a target that can connect on both sides, **When** an initial-form question appears,
   **Then** the correct option uses the pattern عـ and all options are valid initial forms.
3. **Given** any core letter with a valid preceding connection, **When** a final-form question
   appears, **Then** the correct option uses the pattern ـع and all options use final form.
4. **Given** a letter such as ا، د، ذ، ر، ز، or و, **When** rounds are generated, **Then** it is
   never shown with an invalid left-joining initial form.

---

### User Story 3 - Finish, review, and repeat a round (Priority: P3)

As a learner and parent, we can see a concise result, review missed letters, replay their
sounds, and start a fresh round, so practice can continue with useful feedback.

**Why this priority**: Results and review turn individual answers into a repeatable learning
session and match the existing quiz conventions.

**Independent Test**: Complete all 15 questions with a mixture of correct and incorrect
answers, then verify the score, answer review, replay controls, and fresh-round behavior.

**Acceptance Scenarios**:

1. **Given** the fifteenth locked answer, **When** the learner continues, **Then** a result out
   of 15 and a positive Arabic message appear.
2. **Given** at least one missed question, **When** the review opens, **Then** it shows the
   selected glyph, correct glyph, joining mode, and a replay control for the cue.
3. **Given** a completed round, **When** the learner chooses to play again, **Then** a newly
   shuffled valid round starts without duplicating prior attempt state.

---

### User Story 4 - Use the established Hub pathways safely (Priority: P4)

As the parent operating Quizzes Hub, I can later launch the approved quiz with assigned
difficulty, progress tracking, adaptive question preference, and challenge mode, while the
approval preview remains usable without changing live child data.

**Why this priority**: Compatibility is required for eventual inclusion in the unified site,
but production activation is deliberately deferred until approval.

**Independent Test**: Run the preview without Hub services, then run contract stubs for
access, adaptive preferences, progress recording, and challenge turns; verify both paths
start and finish without a production write.

**Acceptance Scenarios**:

1. **Given** the separate preview URL, **When** it opens without Hub globals, **Then** the quiz
   starts in preview mode and clearly identifies itself as a preview.
2. **Given** valid Hub access context in a future production launch, **When** a round completes,
   **Then** attempts use the established quiz progress and adaptive contracts once.
3. **Given** a challenge turn with a known question key, **When** the active learner answers,
   **Then** the answer is submitted once and both players see the same deterministic choices.
4. **Given** this pre-approval delivery, **When** the preview is published, **Then** the live Hub
   catalog, production assignments, and live adaptive records remain unchanged.

### Edge Cases

- Browser autoplay is blocked after navigation or the device is muted.
- A bundled audio asset is missing, corrupt, slow to decode, or replayed rapidly.
- The learner double-taps two choices before visual feedback finishes.
- Adaptive preferences contain unknown, duplicate, or too few question keys.
- The requested distractor family cannot supply three distinct letters for a difficulty.
- A right-joining-only letter is selected for a form it cannot display correctly.
- A glyph font renders joining strokes differently while the underlying answer remains valid.
- Hub readiness never resolves, Hub reporting rejects, or the preview is opened offline.
- Challenge state changes while an audio cue or feedback animation is active.
- The viewport is 320 pixels wide, short in height, zoomed, or uses reduced motion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The quiz MUST include all 28 core Arabic letters as learnable base letters.
- **FR-002**: Every base letter MUST have one curated short-fatha phonics cue; the cue MUST
  teach the sound (for example بَ) rather than the formal letter name (باء).
- **FR-003**: Each normal round MUST contain exactly 15 questions with 15 distinct base
  letters, unless an independently verified challenge turn supplies one question.
- **FR-004**: Every normal question MUST show exactly four shuffled choices containing one
  correct answer and three distinct base-letter distractors.
- **FR-005**: The written question area MUST NOT reveal the target letter, its formal name,
  its transliteration, or a word beginning with it before the learner answers.
- **FR-006**: The learner MUST be able to replay the current bundled cue at any time before
  or after answering without creating another attempt.
- **FR-007**: The first selected choice MUST lock the question and MUST be the only recorded
  response for that question.
- **FR-008**: Correctness feedback MUST use Arabic text and a non-color symbol, and an
  incorrect response MUST reveal the correct glyph.
- **FR-009**: Every normal round MUST contain exactly five isolated, five initial, and five
  final display-mode questions.
- **FR-010**: All four choices in one question MUST use the same display mode.
- **FR-011**: Initial-form questions MUST use only letters that connect to a following
  character; letters ا، د، ذ، ر، ز، and و MUST be excluded from initial form.
- **FR-012**: Isolated forms MUST follow the visible pattern ع, initial forms the pattern عـ,
  and final forms the pattern ـع, generalized to each eligible base letter.
- **FR-013**: Difficulty MUST tune distractor similarity: easy favors dissimilar shapes,
  medium mixes families, and hard includes close visual families while retaining one answer.
- **FR-014**: Round generation MUST honor valid adaptive preferred keys first, then fill any
  remaining slots with valid diverse questions without delaying standalone startup.
- **FR-015**: At round completion, the quiz MUST show the score out of 15, a positive Arabic
  summary, and a review of all attempts.
- **FR-016**: Each review item MUST show selected and expected glyphs, correctness, joining
  mode, and a cue replay control.
- **FR-017**: Starting another round MUST reset prior state and generate a newly shuffled
  valid set of questions and choices.
- **FR-018**: The quiz MUST remain fully usable in a standalone preview when Hub access,
  adaptive, progress, and challenge services are absent.
- **FR-019**: When launched through the Hub, the quiz MUST accept easy, medium, or hard
  assignment difficulty and preserve the established progress and adaptive attempt shapes.
- **FR-020**: Challenge mode MUST derive stable choices from the quiz id, question key, and
  turn index and MUST submit an answer no more than once per turn.
- **FR-021**: Audio playback failure MUST show a short Arabic retry message while retaining
  the replay control and answer choices.
- **FR-022**: All interactions MUST support touch, pointer, and keyboard, with visible focus,
  RTL reading order, and reduced-motion behavior.
- **FR-023**: The active question and all four choices MUST remain visible without page
  scrolling at 390 x 844 pixels and remain operable at 320 pixels wide.
- **FR-024**: Pre-approval delivery MUST publish only a clearly labeled separate preview;
  it MUST NOT modify the live Hub catalog, live assignments, live adaptive profiles, or the
  production routes of existing quizzes.
- **FR-025**: Every approved production cue MUST contain two clearly separated takes of the
  same short-fatha phonics sound at playback speed `1.0`, preserve the consonant onset, and
  MUST NOT use time stretching or turn the fatha into a long vowel.
- **FR-026**: Post-approval publication MUST deploy the `production-hub` build at the stable
  `/arabic-phonics-quiz/` route, register the stable `arabic-phonics` id and all 78 adaptive
  profiles in the Hub, and preserve every existing quiz catalog entry and assignment.

### Key Entities

- **Arabic Letter**: A core letter with a stable key, base glyph, formal Arabic name,
  short-fatha phonics cue, joining capability, and visual-family classification.
- **Question Variant**: One Arabic letter shown in one valid display mode, with a stable
  adaptive key and a reference to the base letter's audio cue.
- **Round**: An ordered set of 15 valid question variants balanced across display modes.
- **Attempt**: One locked selection containing question key, selected base letter and glyph,
  expected base letter and glyph, display mode, and correctness.
- **Audio Asset**: A bundled cue associated one-to-one with a base letter and validated for
  availability, duration, and playback format.
- **Hub Report**: A best-effort summary or adaptive attempt list produced only in a valid Hub
  context; it contains no private child profile data in the static quiz bundle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can start a round and hear the first cue using no more than two
  intentional actions from page load.
- **SC-002**: All 28 base letters have playable cues, and 100% of generated questions map the
  cue, correct answer, visible glyph, review glyph, and analytics key to the same base letter.
- **SC-003**: In 1,000 generated rounds, every round has 15 distinct targets, a 5/5/5 mode
  split, four unique choices per question, and zero invalid joining forms.
- **SC-004**: A complete 15-question round can be finished with no hidden choices or required
  page scrolling on a 390 x 844 viewport, and every control remains operable at 320 pixels.
- **SC-005**: Rapid repeated selection produces exactly one attempt in 100% of automated and
  browser interaction checks.
- **SC-006**: Keyboard-only users can start, replay, answer, advance, review, and restart the
  quiz with visible focus and without encountering a focus trap.
- **SC-007**: Standalone preview startup succeeds within two seconds when every Hub service is
  absent or unresolved, excluding the time required to download the page on a slow network.
- **SC-008**: Audio files remain individually under 80 KB, begin the first useful cue within
  260 ms, contain exactly two separated natural-speed takes, and have phone-safe signal level.
- **SC-009**: Preview verification confirms zero changed files, records, or assignments in the
  production Quizzes Hub and its backend before explicit approval.
- **SC-010**: After approval, the production quiz URL, all 28 MP3 assets, normal Hub launch,
  challenge launch, and the updated Hub catalog succeed from the public internet while the
  preview ribbon remains absent from the production build.

## Assumptions

- The learner is an early Arabic reader who can tap one of four large letter choices.
- Phonics cues use the short fatha sound for a consistent first version; formal letter names
  may appear only in post-answer review or parent-facing metadata.
- Each option set uses one joining mode so the task tests sound-to-letter recognition rather
  than comparing incompatible presentation modes.
- The established Hub convention of 15 questions and easy, medium, and hard assignment
  levels remains current and will be re-verified before production integration.
- The separate preview was approved on 2026-08-14. Live Hub registration, adaptive seeding,
  and production release are now authorized; assignment changes remain limited to the intended
  child profile(s) and MUST preserve all unrelated assignments.
- The preview contains no child identity or credential and does not require authentication.
