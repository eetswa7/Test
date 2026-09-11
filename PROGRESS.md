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
