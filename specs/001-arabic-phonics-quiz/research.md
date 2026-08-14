# Phase 0 Research: Arabic Phonics Letter Quiz

## Decision 1: Derive forms from Unicode joining behavior

**Decision**: Store each letter once as its base Unicode character and a `joining` value of
`dual` or `right`. Render isolated as the base glyph, initial as `glyph + U+0640 TATWEEL`,
and final as `U+0640 TATWEEL + glyph`. Offer initial variants only for the 22 dual-joining
letters; offer isolated and final variants for all 28.

**Rationale**: Unicode classifies ALEF, DAL, THAL, REH, ZAIN, and WAW as right-joining and
the remaining core letters used here as dual-joining. TATWEEL is join-causing. This produces
contextual glyphs using normal shaping instead of presentation-form code points.

**Alternatives considered**:

- Precomposed Arabic Presentation Forms: rejected because Unicode advises against them for
  general interchange and they make comparison and accessibility brittle.
- CSS-drawn strokes: rejected because they would no longer be authentic font glyphs.
- Adding medial `ـعـ`: deferred because the user requested exactly the three patterns ع، عـ، ـع.

**Primary references**:

- `https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-9/`
- `https://www.unicode.org/Public/UCD/latest/ucd/ArabicShaping.txt`

## Decision 2: Teach one short-fatha cue per base letter

**Decision**: Use one concise, fully vocalized cue per base letter: أَ for the displayed base
letter ا, then بَ through يَ. The same cue serves all valid forms of that base letter. Formal
names such as باء appear only after answering and in parent-facing review metadata.

**Rationale**: A consonant cannot be naturally voiced in complete isolation; the short fatha
keeps the phonics pattern consistent and distinct from formal letter-name recall.

**Alternatives considered**:

- Formal letter names: rejected because the brief prioritizes phonics.
- Three vowel cues per letter: valuable later but triples content and changes the requested
  first-version learning objective.
- Example words: rejected because they would reveal extra semantic and orthographic clues.

## Decision 3: Bundle generated audio rather than use browser speech

**Decision**: Generate 28 source cues with the installed macOS Arabic voice `Majed`, then use
FFmpeg to trim leading/trailing silence, apply a short fade, normalize loudness, convert to
mono MP3, and validate size/duration/signal onset. Commit the resulting files and manifest.

**Rationale**: The configured HeyGen TTS skill requires `HEYGEN_API_KEY`, which is not present.
The installed Arabic system voice provides deterministic local generation without adding a
credential or a runtime network dependency. Bundled audio avoids device-to-device voice drift.

**Alternatives considered**:

- HeyGen Starfish: unavailable without the required credential; no authentication action is
  authorized for this task.
- Web Speech API: rejected because Arabic voice availability and pronunciation vary by device.
- Runtime audio API: rejected because it adds cost, latency, credentials, and child-facing
  failure modes.

**Quality boundary**: Automated checks can prove completeness, loudness range, onset,
duration, and format. Human phonetic approval remains part of preview acceptance, so every
review row includes a replay button.

## Decision 4: Use a pure round engine with seeded challenge choices

**Decision**: Put letter data, variant validity, mode quotas, adaptive-key sanitization,
distractor selection, and seeded shuffling in pure functions. Normal rounds use a supplied
random source; challenge choices use a stable seed of quiz id, question key, and turn index.

**Rationale**: The Hub offers every assigned quiz in Challenge Mode and does not expose a
capability flag. Both players must therefore derive identical choices from identical state.
Pure functions also make 1,000-round invariant testing cheap and deterministic.

**Alternatives considered**:

- Store generated choices in component state only: rejected because challenge clients would
  disagree across browsers.
- Disable challenges: impossible without a production Hub behavior change outside scope.

## Decision 5: Compile explicit preview and production modes

**Decision**: Default all local and deployed builds to `preview`. Preview never loads Hub
config/access/progress/adaptive/challenge scripts and never calls their globals. A future
`production-hub` mode may dynamically load the verified clients in order. Browser tests fail
if preview makes any request to the Hub client paths or Supabase endpoints.

**Rationale**: A runtime query flag is too easy to remove accidentally. Vite mode values are
statically replaced at build time, giving the deployment a reviewable separation boundary.

**Alternatives considered**:

- One build that decides from hostname: rejected because both preview and production project
  sites can share the `ahmad9077.github.io` origin.
- Load Hub clients but suppress writes: rejected because access and adaptive clients can still
  make live reads and the boundary would be harder to prove.
- Modify the live Hub for a hidden preview tile: rejected by the approval constraint.

**Primary reference**: `https://vite.dev/guide/env-and-mode`

## Decision 6: Deploy a separate GitHub Pages preview repository

**Decision**: Publish the approved build artifact to a new public repository named
`arabic-phonics-quiz-preview` using the official Pages artifact workflow. The page and
repository stay clearly labeled Preview. Do not edit `quizzes-hub`, Supabase, or existing quiz
repositories.

**Rationale**: GitHub authentication is already available and the existing family of quizzes
uses project Pages. A separate repository creates the requested internet link without changing
production routing or assignments.

**Alternatives considered**:

- Push a branch to `quizzes-hub`: rejected because the repo has no preview environment and its
  local checkout is behind the live remote.
- Temporary local tunnel: rejected because it would require a persistent Mac process and would
  not be a stable approval link.
- Vercel/Netlify/Cloudflare preview: their CLIs are not installed or authenticated here.

**Primary reference**:
`https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages`

## Decision 7: Visual direction is “Echo Portal”

**Subject / audience / single job**: Arabic sound-to-glyph recognition for an early reader;
the page's one job is to make listening and choosing feel obvious and delightful.

**Token plan**:

- Ink Plum `#271C50`: primary text and the echo chamber.
- Paper Lavender `#F7F3FF`: quiet page surface.
- Saffron `#FFC857`: primary action and listening focus.
- Echo Teal `#2FC9B7`: correct state and progress.
- Coral `#F57572`: incorrect state paired with an icon and text.
- Iris `#8B7CF6`: secondary accents and form chips.
- Display/letter role: bundled Noto Kufi Arabic Variable.
- Body/utility role: bundled Noto Sans Arabic Variable.

**Layout sketches considered**:

```text
Echo Portal (selected)          Calligraphy Desk (rejected)
┌────────────────────┐          ┌────────────────────┐
│ progress      ٣/١٥ │          │ ink title          │
│     ╭──────╮       │          │ paper clue         │
│  َ  │ sound│  ُ    │          │ cards in a row     │
│     ╰──────╯       │          │ tiny sound control │
│ [ glyph ][ glyph ] │          └────────────────────┘
│ [ glyph ][ glyph ] │
│ feedback     next  │
└────────────────────┘
```

**Signature**: A single arched “echo portal” around the replay button, with fatha, damma,
and kasra marks orbiting only while audio plays. The rest of the interface stays disciplined.

**Self-critique and revision**: The first idea used generic pastel gradients and floating
stars. Those elements could belong to any children's app. They were replaced with an arch,
calligraphic joining strokes, and moving Arabic vowel marks tied directly to listening. Motion
is confined to this one event and disabled under reduced motion.

## Decision 8: Use current static-web tooling but minimize runtime dependencies

**Decision**: Use React 19, TypeScript 6, Vite 8, Vitest 4, and Playwright 1.62 with locally
bundled Arabic font packages. Keep icons as small inline SVG components rather than adding an
icon library.

**Rationale**: The live package registry and peer ranges were checked on 2026-08-14. TypeScript
6.0.3 is the newest release accepted by the current TypeScript ESLint peer range. The stack supports a pure
static build, exact type contracts, fast invariant tests, and browser-level verification while
shipping only React and fonts at runtime.

**Alternatives considered**:

- Vanilla JavaScript: smaller runtime but weaker compile-time protection around 78 variants,
  Hub globals, and challenge state.
- A UI framework: rejected because the custom visual system needs only a few components.
