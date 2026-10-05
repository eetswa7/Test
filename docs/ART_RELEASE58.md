# Release 58 art production checkpoint

This is a usable, visually reviewed checkpoint of the complete art library, not a claim that Breachline has reached the commercial reference games' production quality. The screenshot comparisons show the actual game renderer; they are not concept renders. Further replacement of weak hero props, anatomy and first-person assets remains necessary.

## What is implemented

All 16 arenas use the new Blender surface library, authored architecture kit, individual PBR texture sets and baked ground illumination. All 30 weapon rigs have native receiver and handguard geometry, preserved animated components, new first-person cloth and glove geometry, and higher resolution weapon finishes. Operators use folded clothing profiles, revised armour and equipment, with the existing animation and gameplay joints retained. Blacksite opens as the default showcase, with roof structure, utility lighting, equipment and signage.

The texture pipeline uses full mip chains of real ASTC on supporting hardware and local WebP fallbacks. Geometry remains instanced and uses near/far meshes. Static Cycles illumination is baked onto the ground of every map; raised surfaces use an approximate bounce field and live lighting. This is not full lightmapping of every wall or prop. World, operator and weapon shader programs now have distinct cache keys, fixing erroneous shared lighting and material inputs.

The original audio bank contains 286 AAC recordings generated from original pressure, mechanical, granular and noise designs. It includes all weapons, reload actions, surface footsteps, impacts and explosions. Playback has positional panning, distance filtering, wall occlusion, shared room reverberation and a 24-voice limit with priority for player actions. These are synthesised sound designs, not field recordings.

## Evidence and limits

- [Actual Release 57 / 58 camera comparisons](art-release58/blacksite-comparison.webp)
- [Blacksite interior](art-release58/blacksite-interior.webp), [approach](art-release58/blacksite-approach.webp), [weapon](art-release58/weapon-close.webp) and [operator](art-release58/operator-close.webp)
- [All 16 maps](art-release58/map-library.webp) and [all 30 weapons](art-release58/weapon-library.webp)
- [53-view render validation](validation-release58-visual.json)
- [Offline benchmark and JSON export validation](validation-release58-benchmark-browser.json)
- [Native audio decoding and polyphony validation](validation-production-audio-browser.json)
- [Gameplay source preservation](validation-release58-gameplay.json)
- [Asset provenance and licences](ART_PROVENANCE.md)

The checkpoint passes 281 Node regression tests, checks 76 JavaScript modules, and compiles/links 35 generated shader variants with Mesa GLES. Headless Chromium renders all maps and weapons without page or shader errors. Its unavailable Linux gamepad hardware backend is disabled only in the benchmark test fixture. Gamepad support in the game is unchanged. Offline boot, local recording, saved reports, actual JSON download, stress-test cancellation and zero automatic report uploads are verified.

The downloadable runtime art banks occupy approximately 82 MiB before HTTP compression: 13.4 MB geometry and compatibility textures, 69.2 MB production textures/lightmaps, and 3.6 MB audio. The production texture estimate is approximately 79 MiB including auxiliary renderer textures. Decoded audio is approximately 32 MiB. These estimates are not measured Safari process memory.

At the high-quality Blacksite approach camera the sampled frame submits about 317,000 triangles and 266 draws including a scheduled shadow update. The corresponding Release 57 view submitted about 153,000 triangles and 232 draws. Shadow update phase varies; these are scene complexity observations, not comparable GPU frame timings. The additional cost requires physical-device validation and continued LOD optimisation.

The real Release 57 iPhone 16 Pro reference remains approximately 57.4 average FPS, 29 FPS at the 1% low, 17.4 ms frame time and 1,315 stuttering frames, with no Safari GPU timing. The adaptive quality system no longer treats low CPU time without GPU measurements as proof of spare GPU capacity. Manual quality controls, dynamic resolution, Benchmark Mode and offline export remain available. No desktop FPS measurement is presented as iPhone performance, and 60 FPS on the revised art is not established.

## Recovery and authoring

The `release57-baseline` branch preserves the previous release. The `art-production-overhaul` branch provides recoverable production checkpoints. Native `.blend` data is stored in repository parts and reconstructed with `npm run source:blender`. See [the Blender workflow](../authoring/blender/README.md) and [the audio workflow](../authoring/audio/README.md) for editable sources and rebuild commands. Runtime assets are local repository/deployment files and require no external asset service during play.
