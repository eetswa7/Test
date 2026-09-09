# BREACHLINE

An original, playable HTML first-person shooter for landscape iPhone screens. Choose a mode, map and loadout, fight bots, finish the match, earn local XP and play again. All game assets are included or generated locally. There are no CDN, engine download, account or asset-service dependencies.

## Play

Serve the `dist/` directory over HTTP or HTTPS. For local development, use Node 20 or newer:

```sh
npm run dev
```

Open the address printed by the server. The authored HTML, CSS and ES modules are the production build, so no dependency installation or bundling step is required. Opening `index.html` directly through a `file:` URL is not supported because browsers restrict ES module loading.

On iPhone, open the hosted game in Safari and rotate to landscape. Safari's Share menu can add BREACHLINE to the Home Screen for a standalone experience. Versioned module URLs prevent stale installed copies mixing old controls with new graphics. The service worker caches the complete game and its textures after its first successful HTTPS load; offline availability depends on browser storage and host authentication. Saved progress stays in that browser on that device.

This is the **HTML / web-app implementation requested in the follow-up**, not a signed native iOS binary.

## Controls

| Action | Touch | Keyboard / mouse |
| --- | --- | --- |
| Move | Left joystick | WASD |
| Aim | Swipe right side | Mouse |
| Fire and track target | Hold and drag AIM + FIRE (auto ADS) | Left mouse |
| Aim down sights | AIM, tap or hold; drag to track | Right mouse |
| Reload | Reload | R |
| Sprint | Push stick fully forward (automatic) | Left Shift |
| Crouch / jump | Tap JUMP / hold JUMP to crouch | C / Space |
| Switch primary / sidearm | Swap | Q |
| Equipment | Grenade | G |
| Plant / defuse | Hold Interact near site | Hold E |
| Melee | Advanced controls profile | V |
| Pause / scoreboard | Pause | Escape / Tab |

The default two-thumb profile combines aiming and firing on one drag pad, automatically sprints and reloads empty magazines, and shows interaction only near an actionable objective. Hold-to-fire repeats semi-automatic shots at the weapon’s actual cadence. Separate sprint, crouch and melee buttons remain available in the Advanced profile. Existing saves migrate to the simpler controls while retaining progression and loadouts.

Movement, looking and firing use independent pointer tracking. Settings include button repositioning, size, opacity, left-handed layout, hip and ADS sensitivity, optional acceleration, horizontal field of view, camera motion and permission-based gyroscope aiming. Standard controllers are supported through the Gamepad API. Controller and gyro hardware still need device validation.

## Content

Seven fully simulated player-versus-bot modes:

| Mode | Rules |
| --- | --- |
| Team Deathmatch | 4 vs 4, 40 eliminations, respawns, 6-minute limit |
| Free For All | Eight combatants, first to 20, respawns, 6-minute limit |
| Sabotage | Plant at A or C, defend or defuse, one life per round, first to four rounds, teams switch sides every three rounds |
| Domination | Capture and contest A, B and C, hold sites to reach 150 points |
| Gun Game | One elimination advances the weapon, 13 stages ending with a blade kill |
| Hardpoint | Rotate zones every 45 seconds; uncontested occupation scores towards 150 |
| Kill Confirmed | Collect enemy tags for points, recover allied tags to deny; first to 30 |

Six original maps: **Old Quarter**, **Foundry**, **Dustline**, **Relay**, **Breakwater** and **Citadel**. Breakwater adds a harbour and drydock routes; Citadel adds a covered courtyard, comms tunnel and radar overlook. Each has authored routes, cover, objective sites, safe spawns, indoor and outdoor areas and navigable elevation changes.

The arsenal contains three assault rifles, two SMGs, two shotguns, a bolt-action sniper, a marksman rifle, an LMG, two pistols and a field blade. Weapons have individual damage, cadence, recoil, spread, handling, ammo and procedural sound profiles. Shotguns use pellets and per-shell loading where appropriate. Gunplay includes head and limb multipliers, range falloff, wood penetration, ADS, recoil that changes actual aim, dry firing, interrupted reloads, viewmodel animations, impacts and kill feedback.

Primary-weapon attachments change real stats: optics, suppressor, compensator, extended magazine, foregrip, laser and stock options. Frag, smoke and flash equipment are functional. Local career records XP, level, weapon XP, unlocked guns, results and statistics. Attachments are available immediately to keep loadout experimentation accessible.

Bots use sight and gunshot awareness, last-known positions, navigation, cover and flanking choices, bursts, reloads, range preferences, retreat and grenade reactions. Difficulty changes reaction, accuracy and aggression rather than health. Allies participate in objectives. Team modes disable friendly fire.

## Rendering and performance

The primary renderer is **Three.js r180**, with instanced world chunks, physically based standard/physical materials, generated normal and roughness maps, image-based environment reflections, alpha-tested wind-animated foliage, throttled directional soft shadows, contact shadows, interior lighting, ACES tone mapping and a separate first-person weapon scene. The previous custom WebGL renderer is removed. Effects use bounded pools. A simpler textured Canvas2D compatibility renderer runs the same simulation if WebGL2 cannot initialise. It reduces geometry and foliage density and does not represent GPU performance. Both paths use the same true 4× scope projection and remove the viewmodel from the scope’s clear sight picture.

Rendering targets 60 frames per second during combat, 30 in the menu and 10 while paused. Automatic quality and dynamic render scaling reduce cost; shadows update at 15 or 24 Hz according to quality. The fixed 60 Hz gameplay simulation is independent of display refresh. AI updates are throttled, navigation is baked per map, geometry is batched, and generated audio buffers are reused. Backgrounding pauses the match and audio. Low, Medium and High quality options are available.

These are performance budgets and engineering measures, **not measured iPhone frame-rate guarantees**. The browser environment used for this build did not provide a WebGL2 context. The high-quality shader path, actual iPhone GPU and thermal behaviour, safe-area values from physical devices, spatial audio perception, motion sensors and controllers require hardware testing. The compatibility renderer does not reproduce the WebGL lighting and effects.

Visuals use original procedural 3D geometry with rounded weapon parts, hollow optics, detailed hand and character models, authored map dressing, and four original generated texture atlases/environment images. Asset prompts are included in `dist/assets/asset-prompts.json`; no reference-game assets are shipped. Audio is original synthesis. They are replaceable through the geometry, material and audio modules. This release does not include photoreal production character assets, motion-captured animation, native iOS haptics or online network multiplayer. Vibration is optional and only runs where the browser implements it.

## Architecture

| Module | Responsibility |
| --- | --- |
| `engine.js` | Fixed-step simulation, actors, movement, damage, projectiles and match lifecycle |
| `weapons.js` | Arsenal, attachment modifiers, reload and weapon state |
| `modes.js` | Scoring, rounds, captures, planting, defusing and completion |
| `maps.js`, `navigation.js`, `spawns.js` | Authored worlds, collision, connected spawn pockets, threat scoring and A* routes |
| `ai.js` | Perception, tactics, movement and bot actions |
| `three-renderer.js` | Three.js scene, physical materials, lighting, batched geometry and pooled effects |
| `weapon-models.js`, `geometry.js`, `meshes.js` | Distinct firearm mechanisms, animated hands, actors and geometry |
| `combat-identity.js` | Player-relative ally/enemy uniforms, labels and visibility rules |
| `boot.js`, `sw.js` | Complete-release installation before importing the game |
| `compatibility-renderer.js` | CPU projection fallback using the same map and actor data |
| `textures.js`, `world-detail.js` | Packaged surface/foliage images, environment and map dressing |
| `aim.js` | Shared scope magnification and aligned first-person sights |
| `input.js` | Touch, pointer lock, keyboard, controllers and gyro |
| `ui.js`, `main.js` | Menus, HUD, lifecycle and platform integration |
| `audio.js`, `save.js` | Generated spatial sound and defensive local persistence |

Input commands and simulation events are separated from presentation. This provides a starting boundary for future networking; transport, server authority and reconciliation are not implemented.

## Validation and developer tools

```sh
npm test
npm run check
```

The regression suite covers ballistics, cover, attachments, ammunition, movement and stairs, simultaneous touch input, tap firing, ADS modes, cancellation, configurable layouts, grenades, death and respawns, every mode's completion conditions, saves, all map navigation and bot-driven Gun Game completion across all six maps. New regressions cover clear 4× scopes and centred hits, combined aim/fire, ADS dragging, jump/crouch holds, semi-auto repeat and auto-reload, cancellation and finite controller input. The static check validates local module imports, packaged assets, mesh winding, complete offline shell and the landscape Home Screen manifest.

Browser checks exercised launch, loadout persistence, deployment, touch actions, pause, match completion, results, restart, menu return and the layout editor. Layouts were inspected at 667 × 375, 844 × 390 and 932 × 430; switching to 390 × 844 displayed the rotation guard. These checks used compatibility graphics. The final revision’s browser recheck was blocked by the cloud browser URL policy; the final 48-test regression suite and static validation passed. Additional simulations reached completed TDM, Sabotage and Domination matches on Foundry, Dustline and Relay.

Tap the BREACHLINE logo five times quickly, or press F3, to open developer tools. They provide god mode, unlimited ammo, unlock everything, spawn enemy, FPS / position / active actor overlay and restart. Normal progression does not prevent testing the full arsenal.

The preview server exposes `/__qa/viewport.html` for real-game responsive checks. The harness only changes the iframe viewport and enables touch controls; it does not inject game state and is excluded from the deployed `dist/` assets.

## Three.js expansion

All twelve firearms and the blade have rebuilt original geometry: distinct receivers, stocks, magazines, barrels, optics, controls, grips and hands. Cached animation moves slides, bolts, pump actions, magazines, belts, feed lids and support hands without replacing parts every frame. Firing sounds use unique attack, mechanical, body and tail profiles. Optics retain correct centred aim and magnified scopes clear the viewmodel.

Cyan diamonds and ALLY labels distinguish teammates from red triangles and ENEMY labels. Arm and vest identifiers use the same player-relative colours, including Free For All. Labels respect occlusion, smoke, death and flash blindness. Objective HUD, radar, kill feed and scoreboard use consistent relations. The simpler two-thumb input remains intact.

Official Three.js 0.180.0 modules are included under `dist/vendor/`, with the MIT licence and version/hash metadata. No CDN fetch is needed at runtime. The package lock pins the same version. See [Three.js installation](https://threejs.org/manual/en/installation.html). Authored modules and the offline cache advance together to release 10; boot waits for a complete update before starting the game.

Verification for the current release: 100 regression tests, including native touch release recovery, corner-camper avoidance on every map, all-map spawn connectivity, real Three geometry/material/instance tests, all thirteen weapon models, mode completion and saving. The previous expansion also completed a 42-combination headless map/mode matrix. These are simulation and scene-construction checks, not browser GPU rendering tests. No new visual browser session or physical iPhone measurement was available during this expansion. Commercial AAA asset fidelity, GPU shader compilation and sustained iPhone frame rate remain unverified.

## iPhone reliability and visual refinement

The joystick has independent window-level pointer release and native touch-contact reconciliation. It recovers from failed capture, interrupted touches, reused pointer IDs and page backgrounding without pausing the match. Native TouchLists are accessed by index; release handling preserves the other thumb's held fire/aim and does not time out a stationary held stick. A small dead zone removes accidental thumb drift.

Respawns use 95–144 connected ground pockets per map. Threat scoring prefers shelter, avoids nearby enemies, recent deaths, repeated positions, occupied pockets and live grenades, and lets team spawn regions move when the fight shifts. Round starts preserve team separation. All six maps gain freestanding sightline screens with multiple escape directions; Foundry and Relay gain side loading doors. Static clearance is baked once, and at most 24 shortlisted pockets receive visibility checks per respawn. Container measurements across maps were 0.96–2.10 ms median and 1.46–3.47 ms p95; these are not iPhone timings.

A new original ultra-realistic 2×2 material atlas provides anodised metal, sand ceramic coating, woven gloves and stippled polymer. The model material system derives normal and roughness detail and preserves colour/wear contrast. Weapon lighting follows world sunlight and dims reflections indoors. Reloads now distinguish tactical and empty magazines, top-loading mechanisms, empty pistol slides, pump shells and LMG feed covers. Smooth stride integration avoids viewmodel snapping when speed changes; fully aimed sights stay centred. Audio reserves voices for the player's weapon and hit confirmations.

Rendering reuses unchanged instance transforms, sends occupied buffer ranges and skips idle weapon uploads. Actor bevel triangles fall 75%, world bevel triangles 43.75%; distant actor detail and overlapping smoke layers are reduced. Shadow projection snaps to texels. These savings are measured geometry and buffer costs, not FPS claims. All gameplay, six maps, seven modes, equipment, loadouts, local progression and two-thumb controls are retained.

Each deployment advances the complete offline release using `node scripts/release.mjs <number>` before static validation, committing and publishing. This prevents an installed copy combining assets from different checkpoints. Touch handling follows [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) and the native [TouchList interface](https://developer.mozilla.org/en-US/docs/Web/API/TouchList).


## Release 11: DualSense controller support

Standard-mapped Bluetooth DualSense controllers use left stick movement, right stick aiming, L2 ADS, R2 fire, Cross jump, Circle crouch, Square reload or objective interaction, Triangle weapon switch, L1 grenade, R1/R3 melee, L3 sprint and Options pause/resume. D-pad navigates menus and adjusts settings; Cross confirms. Touch controls remain available. Controller sensitivity, ADS sensitivity, radial dead zone and inverted vertical aim are saved independently. Disconnecting pauses the match; neutral rearming prevents stale movement or shots after interruption.

Pair the controller using iPhone Bluetooth settings, open the game and press a controller button. Release the controls after connection or resume to arm gameplay. Initial game launch and audio may require a screen tap. Uses the browser standard Gamepad mapping; adaptive triggers and controller gyro are not implemented.

Validation: 107 automated tests passed, including seven controller regressions; static validation passed. Physical Bluetooth DualSense testing on iPhone remains required.
