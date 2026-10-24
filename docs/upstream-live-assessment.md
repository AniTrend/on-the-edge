# Public upstream live assessment

**Observed:** On 2026-10-24, this assessment made 15 direct upstream GET
attempts without credentials, plus three Notify website discovery requests.
It used the current code on `fix/upstream-resource-schema-audit`.
No application code was changed for this assessment.

This is a one-off assessment, not a scheduled or committed live test suite.
Public URLs do not imply anonymous access, and successful samples do not
guarantee compatibility with every resource or future response.

## Actual results

| Provider      | Public request and result                                                                              | Code exercised and outcome                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARM           | AniList 300 and MyAnimeList 1 ID lookups: both HTTP 200                                                | Current schema, service parser, series transformer, base-media output validation and finite-number checks passed                                  |
| AnimeThemes   | MAL 37521 with the consumed filters/includes: HTTP 200                                                 | Resource schema and series normalization/output checks passed; four themes, four entries, eight videos                                            |
| TheXem        | TVDB 73141 and unknown ID 99999999: both HTTP 200                                                      | Success contained 404 rows without AniDB IDs; both mapping builders passed. The second body explicitly reported failure, not successful emptiness |
| Otakumode RSS | News feed: HTTP 200                                                                                    | Exact live bytes passed the actual RSS service pipeline through a local transport adapter, then news transformation/output validation; ten items  |
| GitHub        | Public release list and tagged version file: both HTTP 200                                             | 65 releases parsed and normalized; actual selection chose `1.13.0`; tagged file parsed code `1013000000`. No drafts were visible                  |
| Skyhook       | Consumed v1 show 81189: HTTP 200                                                                       | Current schema, numeric finiteness, actual series transformation and `SeriesContract` passed; rating remained string `"9.5"`                      |
| Jikan         | Anime 1 full/base: two Deno timeouts; one alternate curl IPv4 request also timed out during connection | No HTTP body, schema or consumer evidence. Remaining resources were skipped, not passed                                                           |
| TMDB          | Movie 550 without a key: HTTP 401 JSON                                                                 | API key explicitly required; successful-resource compatibility untested                                                                           |
| Trakt         | Full Breaking Bad show without credentials: HTTP 403 HTML                                              | Blocked; cannot distinguish API-key rejection from edge/WAF blocking. Successful-resource compatibility untested                                  |
| Notify        | Candidate anime ID `1`: HTTP 404                                                                       | ID was not verified. Three bounded public-page requests found no usable anime ID; successful-resource compatibility untested                      |

Of the 15 direct attempts, nine returned HTTP 200, including the explicit
TheXem failure envelope. Three returned 401/403/404 and three timed out.
None of those six blocked attempts was counted as schema-compatible.

## Actual-service replay checks

Captured live bodies were retained with SHA-256 digests. Local adapters then
replayed those bodies through actual service methods without network
permission, production caches, databases, application bootstrap or credentials.

- **TheXem:** Actual success handling returned 404 mappings, wrote once to an
  isolated in-memory cache with TTL 86400, and reused that cache on repetition.
  Actual failure handling returned `[]`, warned, and made zero cache writes.
- **GitHub:** Actual `fetchReleases()` accepted the captured 65-release list
  and selected `1.13.0`; no Authorization header was present. The mapping-lane
  replay passed 15 assertions, including digest and finiteness checks.
- **TMDB, Trakt and Notify:** Actual public service methods received local
  rejection envelopes carrying the captured status/body. Each returned
  `undefined`, warned and leaked no exception. These test the service catch
  paths, not the production HTTP client's response/error construction.
- **Jikan:** An injected `AbortError` exercised actual full-to-base fallback
  and the final catch. This was a synthetic transport-error replay, not a
  captured Jikan response or successful live-resource test.

Numeric finiteness was checked before serialization where normalized outputs
were produced, so JSON serialization could not hide `NaN` as `null`.

## Inspect and reproduce

Local evidence, scripts and public response samples are under:

- `/tmp/opencode/upstream-live-mapping/report.json`
- `/tmp/opencode/upstream-live-mapping/service_replay_report.json`
- `/tmp/opencode/upstream-live-metadata/report.json`
- `/tmp/opencode/upstream-live-metadata/service-replay-report.json`
- `/tmp/opencode/upstream-live-metadata/README.md`

These are local scratch artifacts, not portable repository deliverables. The
JSON reports/README contain the exact live commands, URLs, limits and sample
paths. Replaying saved evidence requires no new upstream requests:

```sh
deno run --no-lock --cached-only --node-modules-dir=manual \
  --config deno.json \
  --allow-read=src,node_modules,/tmp/opencode/upstream-live-mapping \
  --allow-write=/tmp/opencode/upstream-live-mapping \
  /tmp/opencode/upstream-live-mapping/service_replay.ts

deno run --no-lock --cached-only --node-modules-dir=manual \
  --config deno.json \
  --allow-read=deno.json,src,node_modules,/tmp/opencode/upstream-live-metadata \
  --allow-write=/tmp/opencode/upstream-live-metadata \
  /tmp/opencode/upstream-live-metadata/service_replay.ts
```

## What this does not establish

- All Jikan resource variants, authenticated TMDB/Trakt success responses,
  valid Notify resources, episode aggregation and every cross-provider
  combination remain outside this live evidence.
- No live GitHub draft or singleton RSS item was observed. Those cases have
  deterministic regression coverage, not live confirmation here.
- No historical cached documents or production persistence were validated.
- The initial mapping report has a batch timestamp and per-request elapsed
  times, not absolute timestamps for each request.
- Deno was 2.8.0, while CI pins 2.9.7. Initial metadata imports initialized
  entries in a pre-existing ignored `node_modules` cache; its exact delta is
  unknown. Tracked sources, dependency manifests, lockfiles and environment
  files were not changed by the probes.

**Conclusion:** These results establish compatibility and safe failure handling
for the exercised samples and paths only. They do not establish a general
runtime-safety guarantee. Closing the remaining gaps requires Jikan reachability,
authorized authenticated success tests, a verified Notify resource, and broader
resource/adversarial coverage. A repeatable opt-in suite is a possible next step,
not part of this one-off assessment.
