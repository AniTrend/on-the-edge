# Series contract alignment guidance

This note documents the current gaps between the TypeScript contract exposed by `src/series/types.ts` in **on-the-edge** and the Python data schemas in `media/data/schemas.py` within the `AniTrend/anitrend` repository. Use it as a checklist when updating the Python layer so that both sides remain type-safe and compatible.

## 1. Nullability and required fields
- Treat every property that is declared without `| null` in TypeScript as required in Python.
  - `SeriesId.shoboi` is **required** (`number`), whereas the Python schema currently makes it optional.
  - `SeriesScheduleEpisode` fields such as `name`, `overview`, `airDate`, `episodeNumber`, `productionCode`, `runtime`, `seasonNumber`, and `tmdbId` are required in TypeScript but marked optional in Python.
  - `SeriesSchedule.firstAirDate` and `SeriesSchedule.lastAirDate` are non-nullable `Instant` values in TypeScript and must be required integers in Python.
  - `SeriesNetwork.isPrimary` is required in TypeScript but optional in Python.
  - `SeriesImageAttributes.height`, `SeriesImageAttributes.width`, and `SeriesImageAttributes.type` must be required to match the TypeScript definition.
  - `Media.banner`, `Media.fanart`, `Media.description`, and other fields already allow `null` in TypeScript, so using `Optional[...]` in Python is correct.
- For properties that are nullable (`| null`) in TypeScript, the Python schema should continue using `Optional[...]`. Avoid defaulting to an empty container when the TypeScript side may emit `null`.

## 2. Collection defaults
- When TypeScript types specify `string[] | null` (for example `SeriesTitle.synonyms`), Python should allow `None` to be stored as-is instead of silently substituting an empty list. Prefer `Optional[List[str]]` with `default=None` unless there is a guaranteed non-null invariant.
- Lists that are always present in TypeScript (e.g. `Media.images: SeriesImageAttributes[]`) should default to empty lists in Python to preserve parity with an empty array payload.

## 3. Enumerations and literal unions
- Ensure Python `Literal[...]` declarations cover the exact value set:
  - `MediaKind` → `"ANIME" | "MANGA"`
  - `SeriesImageAttributes.type` → `"BACKDROP" | "POSTER" | "LOGO"`
  - `SeriesNetwork.category` → `"DISTRIBUTION" | "PRODUCTION"`
- If additional enum members are added in TypeScript, replicate them immediately in Python to prevent validation drift.

## 4. Temporal fields (`Instant`)
- `Instant` in TypeScript is defined as a numeric epoch (`number`). Mirror this using `int` (or `datetime` conversions) in Python. Do not coerce these to optional strings; treat them as required integers wherever `Instant` lacks `| null`.
- If you need richer date handling on the Python side, perform conversions at the application boundary while keeping the raw contract aligned.

## 5. Media union structure
- The TypeScript contract models media as a discriminated union: `Media` (base), `Media & AnimeMetadata`, and `Media & MangaMetadata`. The Python schema currently flattens everything into `MediaEntity` with many optional fields. Either:
  1. Split the Python models into `Media`, `AnimeMedia`, and `MangaMedia` dataclasses with the correct required metadata, or
  2. Keep a single dataclass but document that anime/manga metadata fields are only optional because the union collapses. If this option is chosen, add runtime validation to enforce that `AnimeMetadata` fields are present when `kind == "ANIME"` and vice versa.

## 6. Theme songs and trailers
- `AnimeMetadata.themeSongs` is required and defaults to an empty array in TypeScript; match this by defaulting to an empty list (not `None`) in Python.
- `SeriesTrailer.thumbnail` is optional (`?`), which aligns with `Optional[str]` in Python.

## 7. Future-proofing
- Automate contract generation (e.g. generate JSON Schema from TypeScript or run Quicktype) so Python models stay synchronized. Add a CI check in both repositories to fail when schemas diverge.
- Document any intentional deviations locally in both codebases so future contributors understand why a field differs.

Follow this checklist whenever `src/series/types.ts` changes or when updating the Python contract to keep the TypeScript and Python definitions in lockstep.
