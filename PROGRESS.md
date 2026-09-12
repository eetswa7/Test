# Graphics and controls revision — 2026-09-06

Implemented: original texture/foliage/sky assets, detailed weapon and character models, map dressing, WebGL lighting and postprocessing, textured compatibility graphics, corrected 4× scopes, simpler two-thumb controls, context interactions, automatic empty reloads and safe control placement.

Release verification: 42 regression tests pass. Static checks validate 21 modules, mesh winding, assets and complete offline shell. ES modules and CSS use release URLs; service-worker v6 preloads all game modules and textures.

Prior browser checks covered menus, touch actions, loadouts, scoped view, responsive layouts and match flows using compatibility graphics. Final browser recheck was blocked by the environment URL policy. WebGL shader runtime, physical iPhone FPS/thermals, gyro and controllers still require device validation. No measured 60 FPS or commercial-game visual parity is claimed.

This repository retains the original five bot modes, four maps, twelve firearms plus blade, equipment, local progression, developer tools, and complete match/replay flow. No missing external assets or native build dependency is introduced.

## Fast follow-up — 2026-09-07

Checkpoint 1: fixed recoil recovery at vertical aim limits, respawn first-shot state, disabled-storage launch, corrupt saved control positions, and release of completed spatial-audio nodes.

Checkpoint 2: dynamic instance-buffer sizing, lighter character bevels, reduced redundant AI sight checks, adaptive shadow fallback, per-frame scope overlay alignment, soft billboard smoke/fire and impact dust, map-tinted ambient light and material weathering.

Checkpoint 3: soft character contact shadows, scalable reload/swap controls, explicit asset-download retry, lower results-screen work, wake-lock cleanup on replay/results, and corrected objective handover/FFA awareness.

Final verification: six focused regressions added for recoil, respawn accuracy, inaccessible/corrupt saves, audio cleanup and instance capacity. Release URLs and offline cache advance to v7. Full suite: all 48 tests passed. Static validation passed for all 21 modules, geometry, assets and offline shell. Physical iPhone/WebGL runtime validation remains outstanding.

## Three.js expansion

Checkpoint: player-relative ALLY/ENEMY HUD labels with different shapes and colours, line-of-sight gating, explicit scoreboard team labels, dynamic map counter, and fallback projection support. Renderer, arsenal and additional content are being prepared independently for integration.

Checkpoint: integrated the 13 rebuilt weapon models and animated mechanisms, individual synthesized audio, Breakwater and Citadel maps, Hardpoint and Kill Confirmed with bot objectives, relative-team uniforms, and objective HUD. Pinned and vendored official Three.js 0.180.0 with its MIT licence. Renderer integration and release-cache migration follow.

Checkpoint: Three.js is the sole GPU renderer. Real Three scene tests cover six maps, every weapon, clear magnified scopes, team colours, dynamic buffer growth and destruction without rebuilding the world. Home Screen release 8 uses a complete-cache activation handshake; wrong-release modules are never substituted. Legacy WebGL implementation is removed.

Final expansion validation: all 75 tests and static validation passed (25 JavaScript modules). Content agent also completed 42/42 map/mode simulations. Scope, touch, saving, objectives and match lifecycle regression coverage is retained. GPU rendering and physical iPhone performance are not measured here. Publishing follows successful combined verification.

## iOS upgrade checkpoints — 2026-09-08

Release 9: joystick capture/release repair, native touch reconciliation, recycled pointer IDs, interruption handling, independent thumbs and dead zone. Passed 23 focused input/cache tests plus static checks. Saved on GitHub as 23546c66a6e14cf014e3fe8b5d01a1d5e447c64f and deployed to the existing Site as version 5. Source checkpoint: 68009e52eeb9adfbfbc5083f60d1ae45c6e8b491.

Release 10: integrated 95–144 distributed ground spawn pockets per map, threat/history/grenade scoring, bounded visibility work, additional escape routes/screens, generated weapon-finish atlas, richer reload mechanisms/audio, world-relative weapon light, finer material detail, texel-stable shadows and reduced GPU upload/geometry costs. TouchList indexing additionally covers native array-like lists.

Combined verification: all 100 tests passed; static validation passed for 26 JavaScript modules and all local assets. Current tests include all-map corner-camper escape, repeated spawn variety, navigation, bots completing Gun Game/Hardpoint/Kill Confirmed, scope alignment, touch recovery, saving and renderer cache invariants. Native GPU visuals and sustained iPhone performance remain unmeasured. All original content retained. The next operation is source/GitHub checkpoint and deployment of release 10.


## Release 11: DualSense controller support

Standard-mapped Bluetooth DualSense controllers use left stick movement, right stick aiming, L2 ADS, R2 fire, Cross jump, Circle crouch, Square reload or objective interaction, Triangle weapon switch, L1 grenade, R1/R3 melee, L3 sprint and Options pause/resume. D-pad navigates menus and adjusts settings; Cross confirms. Touch controls remain available. Controller sensitivity, ADS sensitivity, radial dead zone and inverted vertical aim are saved independently. Disconnecting pauses the match; neutral rearming prevents stale movement or shots after interruption.

Pair the controller using iPhone Bluetooth settings, open the game and press a controller button. Release the controls after connection or resume to arm gameplay. Initial game launch and audio may require a screen tap. Uses the browser standard Gamepad mapping; adaptive triggers and controller gyro are not implemented.

Validation: 107 automated tests passed, including seven controller regressions; static validation passed. Physical Bluetooth DualSense testing on iPhone remains required.


## Release 12 checkpoint: traversal and spawn flow

Added capsule sweeps between navigation nodes, bounded bot path requests, collision bucket acceleration, local bot separation, stuck replanning, spread capture positions, buffered jumps and coyote time, smoother acceleration/braking, predicted rushing-enemy spawn risk and precomputed spawn facing toward clear exits. Collision queries fall back safely when developer tools replace geometry.


## Release 13: Switchyard, Canopy and expanded arsenal

Eight maps now include SWITCHYARD (offset freight cars, depot crossovers, raised signal platform) and CANOPY (four-exit cabins, covered courtyard and observation deck). HARROW B3 is a three-round-burst rifle; MARTEN 45 is a slower, heavier SMG. Both have original first-person models, recoil, attachments, handling and synthesized sound. Stable weapon IDs preserve saved careers. Gun Game has 15 stages including the final blade. All 114 tests passed, including traversal, new maps and burst behaviour.


## Release 14 final checkpoint

Eight maps, fourteen firearms plus blade, fifteen Gun Game tiers and seven modes. Added static prop contact shading, baked interior ambient shading, subtle surface variation, material dithering, sharper weapon finishes, bounded framebuffer size, continuous bot animation and controller/touch HUD switching. Hidden diagnostics include draw calls and render size.

Checkpoint release 12 pushed as b654876846069a3a61b6510567de7cede7383a8e; release 13 pushed as 6aaf80b0cf1515ae9bcc1c0c71a1a05cdfa1c20b. Both are on GitHub main. Latest Sites publication may lag until the final push finishes. All assets are original or vendored with their licenses. No native iPhone profiling was available.

Final validation: 117/117 tests passed after all gameplay changes; 28 JavaScript modules, local assets and complete release 14 offline shell validated. GitHub Pages deployment and existing private Sites deployment are checked after the final push.


## Release 15: measured graphics budgets

Continued from GitHub main eb1908e7e72a2046fe16bbe76a12755ee2a02c2d. Source files were checked against the remote blob identities before editing. Added independent graphics-quality and graphics-profiler systems, LOW/MEDIUM/HIGH/ULTRA, measured promotion/demotion with hysteresis, CPU-aware scene reductions and bounded dynamic resolution. Automatic starts at Medium and earns higher tiers during active gameplay. Menus and resume gaps do not train it. Optional disjoint GPU timer queries never block; unsupported timing displays unavailable. Diagnostics include CPU, GPU, frame p95, draw calls, triangles, estimated texture memory, shader programs and shadow resolution/cadence. High shadow coverage narrows from 68 m to 56 m for finer near-player detail at unchanged map size.

Validation: 122 automated tests and static validation passed. Cloud browser launch/settings checks use Canvas compatibility because its WebGL driver is disabled. GPU shader output and physical iPhone FPS/thermals remain unverified. No gameplay, map, arsenal, controller or save functionality removed.


## Release 16: indirect lighting and physical surface detail

New independent lighting-field, environment-probes and material-detail modules. Each map bakes a 64 × 64 (16 KiB) height-aware indirect-light field for roofed interiors, local warm bounce and ground contacts. It modifies indirect illumination rather than multiplying sunlight or surface albedo. Destroyed roofs rebake the field. A map-specific original HDR radiance dome provides sun-aligned PMREM reflections with 128 px cube faces. Viewmodel reflections remain fixed to world orientation; a nearby, visibility-checked lamp lights hands and weapons. Packed cavity/roughness/metal variation reuses the roughness sample. MSAA alpha-to-coverage improves foliage edges; double-sided billboard particles use one pass.

All 127 regressions and static checks passed. Container light-field baking took 19.8–57.7 ms per map; HDR source generation 18.5–42.7 ms, both only at map load (field also after destruction). These are CPU timings, not GPU or iPhone timings. Browser confirmed launch, quality options, deployment and touch HUD in an 844 × 390 viewport using the existing Canvas fallback. The cloud driver disables WebGL, so the new shader appearance and physical device performance still require device checks.


## Release 17: stable detail and lower spike cost

Completed the modular graphics pass with shadow-system, render-pipeline, particles, decal-system and scene-lod modules. Tiny non-structural decoration uses screen-size culling with hysteresis and cached instance uploads. Actor LOD responds to ADS magnification and no longer removes distant combatants according to quality tier. Bullet marks are surface-aligned, irregular alpha-tested two-triangle decals in one bounded batch. High/Ultra reuse the particle pool for sparse dust by interior fixtures. Small turning inertia and landing motion preserve fully centred ADS.

Profiling identified whole-map light rebakes on destruction as an avoidable frame spike. Replacements now bake two rows per frame and swap only once complete. Shadow diagnostics count actual caster draws. Map changes reset quality warmup. All imports and the offline shell advance together to release 17.

Validation: 134/134 regressions passed; static checks validated 38 JavaScript modules, geometry, local assets and the complete offline release. The real-game browser harness confirmed launch, Ultra selection, deployment, touch HUD, pause/scoreboard, return to menu and portrait rotation guard using Canvas compatibility. WebGL is disabled in the cloud driver; the new GPU shader appearance, sustained iPhone frame rate and thermals remain unverified.

Repeatable container profiling and raw results are included in docs/GRAPHICS.md, docs/graphics-profile.json and scripts/profile-graphics.mjs. At seeded High-quality spawns across eight maps, world batches total 105–185 and the default rifle remains 15,144 triangles in 10 batches. Actor preparation medians were 0.065–0.134 ms. Complete light bakes took 16.2–49.6 ms; two-row slices had 0.47–1.05 ms medians. These are CPU/scene measurements, not GPU or iPhone FPS claims. The graphics guide documents texture budgets, current uncompressed GPU storage, post-processing tradeoffs and the TSL work needed before a measured WebGPU rollout.

GitHub checkpoints: release 15 at 4b8dcac30c2653d104c4d9f9177befdb7802b8f2; release 16 at c94ce6ffa046da7ca85af7c0a78316e7f3896f62. Release 17 follows both on main. Further costly effects require physical-device visual and timing comparisons; no unmeasured GPU benefit is claimed.


## Release 18: visible game version

Settings now ends with BREACHLINE · VERSION 18. The label reads the boot release constant, which scripts/release.mjs updates with every release, so no separate display number needs manual maintenance. Static validation passed.


## Release 19: doorway daylight and weapon sun occlusion

Renderer audit starts from release 18. The first fix replaces uniform roof shading with visibility-tested doorway daylight gradients in the existing 16 KiB field. First-person indirect illumination samples that same field continuously; sun visibility checks at 5 Hz prevent the gun keeping a sun highlight behind solid cover. No extra GPU light, texture lookup or render pass. Focused lighting/renderer regressions and static validation run before checkpointing. GPU appearance and iPhone timings remain unverified.
