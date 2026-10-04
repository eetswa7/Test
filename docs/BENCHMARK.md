# Benchmark Mode, release 56

This release adds measurement infrastructure. Rendering quality, geometry,
assets, weapons, physics, simulation, AI and existing optimisations are preserved.
The offline module graph and cache advance together to release 56.

## Use after initial setup

1. Open the updated game in Safari on your iPhone in landscape.
2. Settings > Benchmark Mode ON.
3. Deploy and play normally, including different maps/modes if desired, for about
   10 minutes. A top-right indicator shows recording, active time and current FPS.
4. Pause > BENCHMARK OFF, or return to Settings and switch it off.

The report is saved locally before upload. `Upload Successful` means the server
acknowledged a GitHub report commit. `Upload Failed` means it was retained and a
retry is pending, or setup/storage needs attention. Uploads are deferred during
active gameplay. Retry and export controls are in Settings. Reopening the game,
returning online or stopping another session resumes pending uploads.

Recording is OFF after reload. Pauses, menus, loading and hidden pages do not
produce gameplay frame measurements. An interrupted recording recovers its most
recent checkpoint, marked `interrupted`; up to 60 seconds before an abrupt crash
may be absent. Safari storage eviction/clearing and private browsing cannot be
guaranteed against. Storage errors are shown and the latest report stays available
for export while the page remains open. Pending reports are never pruned. To
prevent unbounded queues, 20 pending recordings must be uploaded before
starting more. Ten acknowledged reports remain locally available.

## One-time automatic upload setup

The existing host is static. GitHub credentials must not be put in the static
game, service worker, URL, repository, local storage or browser setup form.
The repository implements a Cloudflare Worker with one SQLite Durable Object,
but deploying that service and supplying its server secrets requires your account.
The service has **not** been deployed or verified against live GitHub credentials
by this implementation. Unit tests mock GitHub's HTTP responses; they are not a
claim that production uploads work.

1. Create a Cloudflare Workers project and deploy the code from
   `server/benchmark/wrangler.jsonc`. From the repository root, use the official
   Wrangler CLI, sign in, and edit `BENCHMARK_ALLOWED_ORIGIN` to the exact HTTPS
   origin where you play, with no path or trailing slash. For example, the existing
   host's origin is `https://breachline.eetswa.chatgpt.site`. Keep the repository
   fixed to `eetswa7/Test`; `BENCHMARK_BRANCH` defaults to `main`.
2. Create a fine-grained GitHub token restricted to **only eetswa7/Test**, with
   repository **Contents: Read and write**. No administration, workflows or account
   permissions are needed. Use an expiry you can maintain; a GitHub App installation
   token can also be supplied by server-side operational tooling. Branch protection
   must allow this credential to create report commits. Never disable protection
   broadly to make uploads work; use a permitted dedicated results branch if needed.
3. Set three **Worker secrets**, using Wrangler's interactive prompts:

   ```sh
   npx wrangler secret put BENCHMARK_GITHUB_TOKEN --config server/benchmark/wrangler.jsonc
   npx wrangler secret put BENCHMARK_AUTH_SECRET --config server/benchmark/wrangler.jsonc
   npx wrangler secret put BENCHMARK_PAIRING_CODE --config server/benchmark/wrangler.jsonc
   npx wrangler deploy --config server/benchmark/wrangler.jsonc
   ```

   `BENCHMARK_AUTH_SECRET` must contain at least 32 characters of cryptographically
   random secret material. `BENCHMARK_PAIRING_CODE` must contain at least 24 random
   characters and is consumed for one browser key. Generate them in a password
   manager. Do not paste secrets into chat, committed files or command arguments.
4. Publish the pushed release-56 `dist/` to your existing static game host using
   its normal deployment process. Pushes to GitHub do not independently prove that
   a separate host has deployed the new game. Keep the existing audience/access.
5. On the iPhone, Settings > UPLOAD SETUP: enter the deployed Worker's HTTPS base
   URL and the **one-time pairing code**, then Pair This Browser. Do not enter the
   GitHub token. Use the same Safari origin thereafter. A non-extractable P-256
   signing key and a public certificate are retained in IndexedDB. The code is
   cleared from the form. No third-party cookies are required.
6. Record a short real test and turn recording off. Confirm `Upload Successful`
   and the new JSON file under `benchmarks/YYYY/MM/` in GitHub. Open the file and
   verify `session.id`, schema, release, `build.commit`, context and actual sample
   counts. This is the production verification step. Then record the 10-minute
   baseline. Do not call the deployment verified until the real file exists.

If the pairing response is lost, entering the same code again with the retained
pending key recovers its certificate. A different browser/key requires a fresh
one-time code set on the Worker. Rotating `BENCHMARK_AUTH_SECRET` revokes existing
certificates. Rotating only the pairing code keeps paired browsers working.
Clearing Safari's storage also requires a fresh pairing code.

The Worker CORS allowlist accepts exactly one game origin. Unknown keys are
rejected throughout the report. Requests require a signed certificate, proof of
its private key and a fresh timestamp; changing the report breaks its signature.
Reports never include keys/certificates, tokens, account names, player names,
coordinates, IP addresses, full user-agent strings, device IDs or advertising IDs.
Only generic masked WebGL strings are read; unmasked GPU fingerprinting is not
used. Safari does not reliably reveal the exact iPhone model, so the JSON marks
that unavailable. You know that your test device is an iPhone 16 Pro externally.
Worker body size and pairing/upload rates are bounded. A singleton Durable Object
serialises GitHub writes, and receipts plus create-only paths make retries
idempotent across process restarts and lost responses. An existing different
report is never overwritten. Origin checks are additional defence, not a
replacement for authentication.

## Build provenance

Before each source checkpoint:

```sh
node scripts/release.mjs 56
node scripts/benchmark-build.mjs
npm test
npm run check
```

`benchmark-build.mjs` hashes all distributed files except its own manifest. It
records the source commit used to produce the build. Static source cannot embed
the SHA of a commit that has not been created yet. Accordingly a local report's
`build.commit` is null with `pending_server_verification`. The upload server
matches the content fingerprint and release to the committed manifest's history
and supplies the actual repository commit. It refuses an unrecognised build.
The server searches the most recent 100 manifest commits; recordings from older
builds require an operational lookup/backfill of the `build:<fingerprint>` cache
or manual export. A deployment build with `GITHUB_SHA` can stamp that SHA directly;
uploads still verify it through repository history. Content fingerprints remain
useful offline and prevent incorrectly using the latest repository HEAD as the
identifier of a stale cached game.

## What the measurements mean

| Field | Meaning |
| --- | --- |
| Average FPS | Count divided by the sum of active submitted-render intervals. Exact from the collected intervals. |
| Median FPS / 1% low | Histogram estimates. 1% low is the reciprocal of the mean of the slowest ceil(1%) intervals. |
| Frame-time percentiles | Fixed histogram estimates: 0.125 ms bins below 64 ms, 0.5 ms below 256 ms, 2 ms below 512 ms, exponential bins above. All frames contribute, including long stalls. |
| CPU frame | Main-thread wall time for input, simulation, events, HUD and renderer submission. Does not represent CPU utilisation. |
| CPU render | Existing profiler's wall time around world/viewmodel render submission. Does not include all renderer preparation. Canvas fallback reports it unavailable. |
| GPU | Fresh, unsmoothed asynchronous WebGL2 timer results from the existing every-12-frame query schedule. The query's original context and warm-up phase accompany it. Unsupported and disjoint results remain unavailable. No blocking waits, `gl.finish()` or GPU readback. |
| Draw calls, triangles, textures, geometries | Three.js counters sampled once per second after the frame. Texture counts are allocated objects, not bytes. Canvas draw operations are a separate field; no fake WebGL counts. |
| Main rendering passes | Instrumented world/viewmodel calls. Shadow draw calls are separate; total shadow pass count remains unavailable. |
| Memory | Existing owned-texture byte estimate and optional `performance.memory` JS heap estimate. Not process memory or total VRAM. Safari normally provides no heap value. |
| Resolution / graphics | Actual framebuffer dimensions, browser DPR, rendering scale, configured and renderer caps, requested/effective quality, FOV and camera-motion setting. DRS adjustments create distinct contexts. |
| Combat and environment | Observed event counters; overlapping gunfight/explosion/movement/smoke/interior/dead labels. Population and interior checks are sampled at 1 Hz. No personal player details. |
| Long-session change | First/last thirds of steady-play windows; an estimate with confounders. Not a thermal-throttling detector. Temperature/battery/refresh rate remain unavailable. |
| Raw observations | Bounded, uniformly selected reservoir of 4,096 actual frame observations, sorted by time, plus up to 4,096 sampled GPU results. Histograms include all observed frames even after raw storage fills. |

Each match has 15 active seconds of warm-up; steady data is separate. Frames that
cross the warm-up boundary use the phase at interval start. Pausing primes the
clock on resume instead of measuring a hidden-page gap as a render stall. A
significant spike exceeds max(50 ms, twice the FPS-cap budget); a stutter exceeds
1.5 frame budgets. Safari requestAnimationFrame/render submission cannot prove
that every frame was displayed by the screen compositor.

Limits: 64 map/settings contexts, 720 timeline windows and rendering samples,
512 transitions and spikes, and two active hours per recording. Overflow is
counted and labelled. Raw reservoirs are independent of the game's RNG. All
frame statistics include timing overhead; `instrumentation` reports measured
recorder overhead and checkpoint processing. No statistics sorting or network
requests run per frame. Disabled mode attaches no GPU listener and does no frame
recording; pending uploads can still finish while idle.

## Repeatable stress test

Start from the menu with normal recording OFF and press AUTOMATED STRESS TEST.
It creates a separate seeded TDM simulation on the selected map, difficulty and
loadout. The original game object is retained and restored when the test ends or
is cancelled. Career progress is not awarded. The original AI/physics/weapon
behaviour runs unchanged. The fixed-step input sequence covers warm-up, camera
sweeps, movement, combat, then actual rendering of scripted cosmetic events.
These scripted effects are clearly declared workloads, not fabricated FPS data.
The sequence is 180 simulation seconds; slow devices take longer in wall time.
Match completion can end it early, which is explicitly marked incomplete.
Pausing/backgrounding suspends it. OFF or Main Menu cancels it safely.

Compare matching scenario version, seed, map, difficulty, loadout, cap and graphics.
Do not combine scripted and manually played sessions. The real simulation can
branch on gameplay outcomes; check completion/ticks/activity before comparison.

## Comparisons and validation

```sh
node scripts/compare-benchmarks.mjs baseline.json candidate.json
node --test tests/benchmark.test.mjs tests/benchmark-server.test.mjs
```

The comparison command keeps recordings independent, excludes warm-up, and
matches contexts by map, mode, population, quality, cap, framebuffer, DPR, scale
and FOV. It reports FPS, frame percentiles, percentage changes, unmatched contexts
and cap-limited results. Assess context combat/timeline data as well. A steady
60 FPS cap does not establish how much additional graphical load the device can
handle. Use multiple matching sessions and consistent test conditions for that.

Implementation tests use synthetic timestamps and mocked GitHub HTTP responses.
They verify statistics, bounded buffers, privacy validation, unsupported metrics,
signature rejection, pairing, CORS, retry state, immutable history, serial writes
and restarts. They are not real-device benchmarks.

Release-56 validation passed all 279 Node tests, the 72-module/asset/offline checks,
and a Wrangler deployment dry run. The desktop Chromium browser check exercised
the toggle/watermark, real rendered-frame recording, report validation, failed-upload
retention, reload recovery, offline startup and isolated stress-test cancellation.
Its metadata is in `docs/validation-release56-benchmark-browser.json`; software
WebGL and a mobile viewport do not represent iPhone performance or Safari validation.
No test report was placed in `benchmarks/`, and live GitHub uploads remain unverified.

To repeat the browser check with Playwright installed, run
`node scripts/check-benchmark-browser.mjs`. Optional `BENCHMARK_TEST_BROWSER`
selects a local Chromium executable; `BENCHMARK_TEST_ORIGIN` selects an existing
preview, otherwise the script starts and stops its own preview server.

Primary API references: [GitHub Contents API](https://docs.github.com/en/rest/repos/contents),
[WebGL timer queries](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query),
[CryptoKey extractability](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey/extractable),
[Durable Objects](https://developers.cloudflare.com/durable-objects/api/state/),
and [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
