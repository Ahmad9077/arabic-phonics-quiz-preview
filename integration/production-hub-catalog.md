# Deferred Quizzes Hub Integration

This file is an approval-gated handoff. None of these production steps are run by the preview
deployment.

## Preconditions

1. Obtain explicit approval for the preview and its Arabic audio cues.
2. Refresh `/Users/macserver/Documents/quizzes-hub` from the real remote `main` and inspect all
   incoming changes before editing; the local checkout observed during development was behind the
   live branch.
3. Confirm the standalone production repository will publish at
   `https://ahmad9077.github.io/arabic-phonics-quiz/`.
4. Review `integration/seed-arabic-phonics.sql` before applying it.

## Catalog entry

Add this object to the current `quizCatalog` in the refreshed Hub `script.js`:

```js
{
  id: "arabic-phonics",
  title: "صدى الحروف",
  icon: "أ",
  color: "#efe8ff",
  url: "https://ahmad9077.github.io/arabic-phonics-quiz/"
}
```

Then bump the existing `script.js?v=...` query in the Hub HTML so browsers receive the updated
catalog. Preserve every unrelated remote and local change.

## Database seed

Apply the generated SQL in a reviewed Supabase migration. It upserts one quiz and exactly 78
adaptive question profiles. It deliberately creates **zero assignments**.

After application, verify:

```sql
select count(*)
from public.question_difficulty_profiles
where quiz_id = 'arabic-phonics';
```

The result must be `78`. Assign the quiz only to explicitly selected child profile IDs in a
separate, reviewed step after the user chooses those profiles.

## Live acceptance

- Normal launch enforces the Hub access guard and assigned difficulty.
- A 15-question round records one adaptive attempt batch, with aggregate progress only as fallback.
- Challenge launch uses the shared question key and permits one submission per turn.
- All 28 production MP3 files return `200` and the preview ribbon is absent.
- The Hub and existing quiz links remain unchanged except for the approved addition.
