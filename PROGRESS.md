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


## Release 20: continuous texture mapping and calibrated roughness

Fixed cylinder UVs that repeated the entire tile on every segment, sphere UVs collapsed to one texel, and discontinuous tube mapping. Static per-face UV metrics replace bevel-normal axis switching and remove the oversized minimum repeat on tiny weapon parts. No additional fragment texture samples or draw calls. Roughness variation is centred on authored values; painted blue metal, rust and plaster retain dielectric responses. Regression checks cover circumference continuity, rounded-face metrics and shader composition.


## Release 21: interior hero reflections and physical bevels

A small static room PMREM replaces blue outdoor reflections on the first-person weapon indoors. Selection has doorway hysteresis and uses the existing environment sampler, with no live captures; this is a generic room approximation, not local geometry reflection. First-person hemisphere direction now stays upright in world space. Hard weapon parts retain a maximum 2.5 mm physical bevel under non-uniform scaling, preserving their outer bounds and existing geometry count. Soft gloves retain their rounded silhouette. Focused lighting, surface and weapon regressions run before this checkpoint.


## Release 22: aged surfaces, connected shadows and thin foliage

World material shading adds restrained instance variation and a damp/dirt band at ground-level wall bases, reusing the existing world coordinates with no new texture samples. Shadow bias now scales with texel size; the cadence accumulator preserves fractional time, fixing High's 24 Hz budget previously slipping to 20 Hz at 60 FPS. Leaves receive a capped sky-transmission approximation in their existing PBR pass. Focused shader-composition and temporal-cadence checks run before checkpointing. GPU tuning still requires real device comparisons.


## Release 23: connected animation, specular stability and final profile

Completed the ten-point renderer audit with connected two-bone leg posing, alternating foot lift, forward knee bend, crouch continuity and perturbed-normal specular anti-aliasing using Three's existing derivative operations. Corrected the CPU fixture to match production cylinders. Compared release 18 and 23 across eight maps. All sampled world and default-weapon triangle counts are unchanged; world batches decrease on five maps and the default rifle remains 15,240 triangles in 10 batches.

Light-field optimisation preserves byte-identical results across all eight maps. Destruction rebuilding now checks a 0.65 ms soft deadline per 16 texels, at most 128 texels per frame, with a complete-texture swap. The ranked fixes, explicit costs and raw timings are in docs/RENDERER-AUDIT.md and docs/profile-release18.json / profile-release23.json. Final verification passes 142 automated regressions plus static release/geometry/assets checks. The browser URL policy blocked the final preview, so no new browser GPU/visual or iPhone FPS claim is made.

Pushed checkpoints on main: release 19 2d83f69564a38b3a10e8fa377458f34e86fa53c7; release 20 8d300035b443109b4f9462c9550ba252c451407d; release 21 c71f2b4745f9db1d5c2e9bec8e6c88761ee6a0f5; release 22 0c1754442a4dc447d38b67ff977384883a83e3df. Release 23 follows after combined validation.


## Release 24: coherent map weather and exterior shade

The visible sky now shares the same generated HDR source as the map reflection probe, including sun direction and overcast weather. Broad cloud structure is extracted once from the original asset; its unrelated mountain horizon no longer appears over the harbour and every other map. A 512 × 256 HDR source replaces the 2048 × 1024 uploaded panorama. Exterior indirect occlusion now survives at player eye height; only actual roof texels restore sky access above roof level. No additional light, draw pass or fragment lookup. New field/cloud regressions and static checks run before checkpointing. Browser preview remains blocked; physical iPhone visual output is unverified.


## Release 25: surface placement and believable dressing

Removed duplicate room floor finishes and generic mechanical units from narrow Citadel gallery roofs. Random weeds now stay out of covered interiors and broad paved finishes. Thin ground-level decorative slabs become layered receiving planes instead of shadow-casting boxes; collision blocks, raised paths and stairs remain intact. This removes needless floor caster work and gives floor layers stable depth ordering. Map-by-map scene invariants and the existing gameplay/navigation suite verify the change before checkpointing.

## Release 26: contained interior bulbs and continuous camera stride

Room lights use soft interior bounds to prevent unshadowed bulbs illuminating exterior wall faces and roof tops. The shader reuses the light-field world position: three bounded bulbs, no extra texture sample, shadow cube or render pass. This is a room approximation; small props do not acquire point-light shadows. Bounds follow lamp selection at 5 Hz and clear when a roof is destroyed. Camera stride now integrates travel instead of multiplying elapsed time by changing speed, settles after stopping, freezes while paused and stays centred at full ADS.

All-map room-boundary and motion regressions pass. An optional offline Mesa EGL gate compiles and links 11 material shader variants, including patched lighting, foliage, physical glass, weapon bevels, normal maps and ACES. This validates shader syntax/composition, not images, browser behaviour or iPhone GPU speed. Raw CPU/scene measurements are in docs/profile-release26.json; shader results are in docs/shaders-release26.json. Releases 24 and 25 are already pushed to main.

Release 26 verification: 149/149 automated regressions and static validation passed (43 JavaScript modules). All 11 offline material shader variants compile and link on Mesa GLES.

## Release 27: water response, visible contacts and floor batching

Breakwater's flat glass slab and rigid white foam strips become one opaque PBR water plane with water's 1.333 IOR, restrained crossed ripple normals and pixel-footprint filtering at distance. It uses the existing PMREM; no reflection capture, transparency target, extra texture or wave geometry. Twelve offline material shader variants now compile and link.

Spatially indexed visual floor heights keep contact shadows and ground bullet marks above decorative finishes without altering collision heights. Small floor planes batch across spatial chunks; architecture retains its culling chunks. Inspection also caught an overly broad release 25 conversion: shallow steel rail heads and wooden sleepers now retain their 3D silhouettes. New checks cover all-map finish heights, rotated strips, contact/impact placement, water material cost and Switchyard rails. Full regression and static gates run before pushing.

Release 27 verification: 153/153 regressions, static validation (44 modules) and 12/12 offline GLSL ES compile/link variants passed. CPU and scene counts are recorded in docs/profile-release27.json.


## Release 28: momentum movement, tactical bots and Mako 7

Sprint plus crouch starts a short directional slide with preserved momentum, lowered stance and a 1.25-second recovery window. Touch, keyboard and controller instructions describe the new input. Bots can lob their carried frag at a visible enemy from medium range, with a bounded cooldown. The Mako 7 adds a semi-automatic long-range marksman rifle with its own model, handling, weapon progression and Gun Game tier. The release script now sources its offline texture list from the renderer's texture manifest, preventing a release from silently omitting atlas URLs.

Validation: 156/156 automated tests and JavaScript syntax checks passed, including movement cooldown, bot grenade and 16-weapon model/save/attachment checks. The offline shell retains all four authored texture URLs. The packaged-asset checker cannot complete in this local workspace because the image blobs are not available here; the existing remote assets are unchanged. Slide feel and performance still need a physical iPhone check.

## Release 29: Frostline and Iron Quarry

Frostline adds an alpine listening post, snow terrain, patrol cabins and a beacon-lit centre. Iron Quarry adds a stone extraction site, loading shelters and conveyor trestles around a low crusher apron. Both include three objectives, authored cover and accessible ground routes. Vegetation and distant silhouettes match each setting; terrain colour, sky and fog differ by map. Navigation, all-spawn objectives, map scenery budgets, rendering, and bot-driven match completion are checked across the expanded roster before pushing.

Release 29 verification: 157/157 automated regressions and JavaScript syntax checks passed. `npm run check` could not reach its packaged-asset checks because `dist/icon-192.png` is absent from this local repository handoff; the existing remote image assets were left unchanged. The offline-release regression confirms all four authored texture URLs remain in the service-worker shell.

## Release 30: Capture the Flag and grounded objective routing

Capture the Flag adds team flag bases, touch pickup and return, death drops, a 25-second automatic return, captures only while your own flag is home, and a three-capture limit. Bots carry, escort, recover and return to base. The radar, objective strip, capture feed, per-player capture table and both renderers show flag state; the Three.js renderer adds animated, team-coloured cloth. A navigation nearest-node fix keeps ground actors from snapping onto a nearby room roof when an occupied grid cell has only an upper-floor node.

## Release 31: wind-driven map weather

Frostline now has sparse wind-blown snow and Iron Quarry has drifting grit. A shared deterministic camera-space weather field feeds Three.js billboards and small, depth-sorted Canvas particles, with roof-aware shelter and counts tuned to graphics quality. The effect uses the existing particle pool and adds no textures, GPU passes or unbounded objects. README map/mode counts were corrected to the current ten battlegrounds and eight modes.

Release 31 verification: 165/165 automated regressions and JavaScript syntax checks passed. Weather tests cover deterministic motion, quality limits, finite view-local positions, map selection and roof shelter. Packaged static checks remain blocked in this handoff because `dist/icon-192.png` is missing; remote image assets were not changed.

## Release 32: surface-aware footstep sound

Frostline and Iron Quarry now use distinct synthesized snow-crunch and stone-grit step profiles for player and NPC movement. Indoor routes on both maps keep the harder enclosed-room sound; the other map profiles are unchanged. A focused routing regression checks alpine snow, quarry grit, indoor hard surfaces and forest soft ground.

The routing regression also exposed Canopy's existing `FOREST BASE` tag mismatch, which sent its outdoor footsteps to the gravel profile. Forest routes now select the soft-ground sample. Release 32 verification: 166/166 automated tests and JavaScript syntax checks passed after advancing the offline shell. The packaged static checker still requires the missing local icon image to run.

## Release 33: coordinated NPC firing lanes

Team bots now check the space between their muzzle and a visible enemy for allied operators. If a teammate blocks that lane, the bot takes a short side route and holds fire until the lane opens, conserving ammunition and avoiding repeated fire into a teammate. Free For All has no allied firing restriction. A focused regression covers the blocked lane, flank goal and resumed fire after the ally moves; full match simulations across all maps and modes follow before publication.

Release 33 verification: 167/167 automated tests passed, including all-map objective bot matches; JavaScript syntax checks passed. The local packaged-asset checker remains blocked by its missing icon image.

## Release 34: continuous distant terrain

The distant skyline now uses one textured, irregular 384-triangle terrain ring in nine maps, with trees placed at its foot. Breakwater retains its harbour. Both renderers share the geometry; the ring stays outside gameplay collision and is excluded from shadow casting. This creates a continuous landscape without adding a render pass, texture or runtime terrain update.

Seeded High-quality scene profiles across all ten maps show 1,544 → 1,302 world batches, 189,156 → 175,874 frustum-visible world triangles and 203,704 → 151,120 shadow-caster triangles. These are container scene counts, not iPhone GPU/frame measurements. Raw profiles are in `docs/profile-release33.json` and `docs/profile-release34.json`. Release 34 verification: 169/169 automated tests and JavaScript syntax checks passed, including geometry seams, winding, complete map construction and Canvas fallback geometry. The packaged checker remains blocked by the missing local icon image.

## Release 35: height-toned landscape

Nine distant ridges now use vertex colours for dark foothills, light peaks and Frostline's snow cap. Dustline sandstone and Iron Quarry stone receive separate palettes. The Canvas fallback shares the same height ramp. Geometry, batch and shadow counts are unchanged; each ridgeline adds a static 13.5 KiB colour buffer and a separate material variant. Release 35 verification: 170/170 automated tests and JavaScript syntax checks passed. iPhone GPU time and appearance still require a device check.
