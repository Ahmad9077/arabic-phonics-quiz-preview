# Quickstart and Validation Guide

## Prerequisites

- Node.js 26 or a compatible current LTS release
- npm
- macOS `say` with the `Majed` voice only when regenerating audio
- FFmpeg and FFprobe only when regenerating or deeply validating audio

No Supabase credentials, Hub login, or production repository access is required for preview.

## Install and run preview

```sh
npm install
npm run dev -- --host 127.0.0.1
```

Open the printed local URL. Expected outcome: a visible `نسخة للمعاينة` marker, an RTL Arabic
start screen, and no request to Quizzes Hub or Supabase.

## Regenerate bundled audio

```sh
npm run generate:audio
npm run validate:audio
```

Expected outcome: 28 MP3 files and a manifest with unique ids, matching cues, bounded sizes,
durations, hashes, and no leading-silence violation.

## Run automated quality gates

```sh
npm run lint
npm run typecheck
npm test
npm run build:preview
npm run test:e2e
```

Expected outcome:

- 1,000 generated rounds preserve 15 distinct targets and a 5/5/5 form split.
- All 78 valid variants and no invalid initial forms are generated.
- First-answer locking, replay, results, fresh rounds, keyboard flow, reduced motion, and
  320/390-pixel layouts pass.
- Hub stub tests pass for access, adaptive, fallback progress, and challenge turns.
- Preview network tests observe zero Hub client or Supabase requests.

## Inspect the production artifact

```sh
npm run preview:dist -- --host 127.0.0.1
```

Open the printed URL after `npm run build:preview`. Verify Arabic fonts and all audio work with
the network disabled after the first load.

## Deferred production validation

Do not run a production-Hub deployment before approval. The future release checklist is in
`contracts/hub-contract.md` and requires a refreshed Hub checkout, reviewed migration, live
challenge check, assignment confirmation, and cache-buster verification.
