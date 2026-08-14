<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles: child-first learning; Arabic accuracy; deterministic audio;
  accessible RTL interaction; safe Hub integration and approval gate
- Added sections: Product and Technical Constraints; Delivery and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->
# Arabic Phonics Quiz Constitution

## Core Principles

### I. Child-First Learning
Every interaction MUST be understandable to a young Arabic learner without adult
explanation. Questions MUST focus on one learning objective, controls MUST use short
Arabic labels, feedback MUST be immediate and encouraging, and a wrong answer MUST
never use shaming language. A round MUST remain short enough to sustain attention.

### II. Arabic Orthographic and Phonetic Accuracy
The 28 core Arabic letters, their phonics cues, and their displayed joining forms MUST
be curated and mechanically validated. The interface MUST NOT present an impossible
left-joining form for a non-left-joining letter. A question's audio target, accepted
answer, visible glyph, analytics key, and review label MUST always refer to the same
base letter.

### III. Deterministic Audio (NON-NEGOTIABLE)
Every playable question MUST have a bundled, pre-generated Arabic audio asset that is
usable without relying on the device's speech-synthesis voice. Audio MUST be short,
level-normalized, and replayable. The app MUST preload or validate the next required
asset and MUST provide a clear retry path if playback is blocked or fails.

### IV. Accessible RTL Interaction
The experience MUST be RTL-first, keyboard operable, and responsive at a 320-pixel
viewport. Each answer target MUST remain comfortably tappable, visible focus MUST be
preserved, color MUST NOT be the sole carrier of correctness, and motion MUST respect
the user's reduced-motion preference. The active question MUST fit within a typical
phone viewport without hiding any answer.

### V. Safe Hub Integration and Approval Gate
The quiz MUST preserve the existing Quizzes Hub progress and adaptive contracts while
also starting independently when those globals are absent or slow. Preview deployment
MUST remain separate from the production Hub. Production catalog, database assignment,
adaptive seed, and public production route changes MUST NOT occur before explicit user
approval of the preview.

## Product and Technical Constraints

- Each normal round MUST contain 15 questions and four shuffled choices per question.
- The first selected answer MUST lock; repeated taps MUST NOT change the recorded result.
- A round MUST sample all requested display modes over time: isolated, connected on the
  left, and connected on the right, subject to real Arabic joining rules.
- The same base letter MUST NOT appear twice among one question's four choices, even if
  glyph presentation differs.
- Audio files, question-bank metadata, and build output MUST contain no credentials or
  private child data.
- Runtime dependencies MUST be minimal and suitable for static hosting.

## Delivery and Quality Gates

1. Write and validate the feature specification before implementation.
2. Validate the letter bank, joining rules, audio manifest, and unique answers with
   automated tests.
3. Pass lint, unit tests, production build, and browser checks on desktop and mobile.
4. Verify keyboard focus, reduced motion, replay behavior, answer locking, round results,
   and standalone startup.
5. Publish only a clearly labeled preview URL before approval; do not modify the live Hub
   repository, Supabase data, or production quiz assignments at this stage.
6. After approval, production integration requires a fresh diff review, cache-busting
   verification, and live URL checks.

## Governance

This constitution governs all specification, planning, implementation, review, and
deployment artifacts in this project. Any exception MUST be documented in the technical
plan with its user impact, mitigation, and explicit approval. Amendments require a written
rationale, a semantic-version change, and revalidation of affected artifacts. Reviews
MUST treat violations of a MUST statement as blocking.

**Version**: 1.0.0 | **Ratified**: 2026-08-14 | **Last Amended**: 2026-08-14
