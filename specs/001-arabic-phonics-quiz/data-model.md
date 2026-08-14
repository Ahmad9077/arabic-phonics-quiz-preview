# Data Model: Arabic Phonics Letter Quiz

## ArabicLetter

| Field | Type | Rules |
|---|---|---|
| `id` | stable ASCII string | Unique; used in filenames and analytics keys |
| `glyph` | one Arabic base character | One of the 28 core letters |
| `nameAr` | string | Formal Arabic letter name; hidden before answer |
| `cue` | vocalized Arabic string | Short-fatha phonics cue; one per base letter |
| `joining` | `dual` or `right` | Matches Unicode Joining_Type |
| `family` | stable string | Visual skeleton family for distractor tuning |
| `audioFile` | relative asset path | Unique MP3 present in audio manifest |

### Validation

- Exactly 28 records and 28 distinct `id`, `glyph`, `cue`, and `audioFile` values.
- `right` is used exactly for ا، د، ذ، ر، ز، و.
- Every record supports `isolated` and `final`; only `dual` supports `initial`.
- The cue for displayed ا is أَ; all other cues combine the base letter with fatha.

## QuestionVariant

| Field | Type | Rules |
|---|---|---|
| `key` | string | `${letter.id}:${mode}` and globally unique |
| `letterId` | ArabicLetter id | Required |
| `mode` | `isolated`, `initial`, `final` | Must be valid for the letter |
| `glyph` | rendered string | Base, base+tatweel, or tatweel+base |
| `audioFile` | relative asset path | Inherited from the base letter |

### Cardinality

- 28 isolated variants.
- 22 initial variants.
- 28 final variants.
- 78 total variants.

## QuizQuestion

| Field | Type | Rules |
|---|---|---|
| `variant` | QuestionVariant | Correct target |
| `choices` | four QuestionChoice values | Same mode; distinct base letters |
| `difficulty` | easy/medium/hard | Determines visual similarity only |

The correct choice occurs exactly once. Easy avoids the target family where possible;
medium includes at most one same-family distractor; hard prefers up to three available
same-family distractors and safely fills from other families.

## Round

| Field | Type | Rules |
|---|---|---|
| `questions` | ordered QuizQuestion list | Exactly 15 for normal play |
| `difficulty` | easy/medium/hard | Normalized from preview or Hub access |
| `source` | preview/hub/challenge | Determines reporting behavior |

### Round invariants

- Five questions per display mode.
- Fifteen distinct base letters.
- Adaptive preferred keys are sanitized before selection.
- The final question order is shuffled after quotas are satisfied.

## Attempt

| Field | Type | Rules |
|---|---|---|
| `questionKey` | QuestionVariant key | Required |
| `selectedLetterId` | ArabicLetter id | First selection only |
| `selectedGlyph` | string | Presented choice glyph |
| `expectedLetterId` | ArabicLetter id | Target base letter |
| `expectedGlyph` | string | Target glyph in the question mode |
| `mode` | display mode | Matches question |
| `correct` | boolean | Selected id equals expected id |

### State transition

`unanswered -> locked(correct|incorrect) -> reviewed`

There is no transition from one locked choice to a different locked choice.

## AudioManifestEntry

| Field | Type | Rules |
|---|---|---|
| `letterId` | ArabicLetter id | One-to-one with ArabicLetter |
| `cue` | string | Matches ArabicLetter cue |
| `file` | string | Existing same-origin MP3 |
| `durationMs` | integer | Positive and within configured bounds |
| `bytes` | integer | Greater than zero and at most 80 KB |
| `sha256` | lowercase hex | Reproducibility and corruption check |

## HubAttempt and HubProgress

- Adaptive attempt: `{ question: { key }, correct }` for each Attempt.
- Fallback progress: quiz id, score, total, level label, and non-private answer details.
- Preview mode creates neither shape at runtime.
- Challenge submission sends selected glyph as `answerText` and correctness as `isCorrect`.
