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

Five fully simulated player-versus-bot modes:

| Mode | Rules |
| --- | --- |
| Team Deathmatch | 4 vs 4, 40 eliminations, respawns, 6-minute limit |
| Free For All | Eight combatants, first to 20, respawns, 6-minute limit |
| Sabotage | Plant at A or C, defend or defuse, one life per round, first to four rounds, teams switch sides every three rounds |
| Domination | Capture and contest A, B and C, hold sites to reach 150 points |
| Gun Game | One elimination advances the weapon, 13 stages ending with a blade kill |

Four original maps: **Old Quarter**, **Foundry**, **Dustline** and **Relay**. Each has authored routes, cover, objective sites, safe spawns, indoor and outdoor areas and navigable elevation changes.

The arsenal contains three assault rifles, two SMGs, two shotguns, a bolt-action sniper, a marksman rifle, an LMG, two pistols and a field blade. Weapons have individual damage, cadence, recoil, spread, handling, ammo and procedural sound profiles. Shotguns use pellets and per-shell loading where appropriate. Gunplay includes head and limb multipliers, range falloff, wood penetration, ADS, recoil that changes actual aim, dry firing, interrupted reloads, viewmodel animations, impacts and kill feedback.

Primary-weapon attachments change real stats: optics, suppressor, compensator, extended magazine, foregrip, laser and stock options. Frag, smoke and flash equipment are functional. Local career records XP, level, weapon XP, unlocked guns, results and statistics. Attachments are available immediately to keep loadout experimentation accessible.

Bots use sight and gunshot awareness, last-known positions, navigation, cover and flanking choices, bursts, reloads, range preferences, retreat and grenade reactions. Difficulty changes reaction, accuracy and aggression rather than health. Allies participate in objectives. Team modes disable friendly fire.

## Rendering and performance

The primary renderer uses WebGL2, instanced geometry, original generated surface textures, alpha-tested foliage, directional soft shadows, a photographic mountain sky, haze, physically based surface lighting, anti-aliasing and a separate first-person weapon pass. Effects use bounded pools. A simpler textured Canvas2D compatibility renderer runs the same simulation if WebGL2 cannot initialise. It reduces geometry and foliage density and does not represent GPU performance. Both paths use the same true 4× scope projection and remove the viewmodel from the scope’s clear sight picture.

Rendering targets 60 frames per second during combat, 30 in the menu and 10 while paused. Automatic quality and dynamic render scaling reduce cost; shadows update at 30 Hz. The fixed 60 Hz gameplay simulation is independent of display refresh. AI updates are throttled, navigation is baked per map, geometry is batched, and generated audio buffers are reused. Backgrounding pauses the match and audio. Low, Medium and High quality options are available.

These are performance budgets and engineering measures, **not measured iPhone frame-rate guarantees**. The browser environment used for this build did not provide a WebGL2 context. The high-quality shader path, actual iPhone GPU and thermal behaviour, safe-area values from physical devices, spatial audio perception, motion sensors and controllers require hardware testing. The compatibility renderer does not reproduce the WebGL lighting and effects.

Visuals use original procedural 3D geometry with rounded weapon parts, hollow optics, detailed hand and character models, authored map dressing, and three original generated texture atlases/environment images. Asset prompts are included in `dist/assets/asset-prompts.json`; no reference-game assets are shipped. Audio is original synthesis. They are replaceable through the geometry, material and audio modules. This release does not include photoreal production character assets, motion-captured animation, native iOS haptics or online network multiplayer. Vibration is optional and only runs where the browser implements it.

## Architecture

| Module | Responsibility |
| --- | --- |
| `engine.js` | Fixed-step simulation, actors, movement, damage, projectiles and match lifecycle |
| `weapons.js` | Arsenal, attachment modifiers, reload and weapon state |
| `modes.js` | Scoring, rounds, captures, planting, defusing and completion |
| `maps.js`, `navigation.js` | Authored world data, collision, spawn evaluation and A* routes |
| `ai.js` | Perception, tactics, movement and bot actions |
| `renderer.js`, `shaders.js`, `geometry.js`, `meshes.js` | WebGL2 scene, lighting, models and pooled visual effects |
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

The 48 regression tests cover ballistics, cover, attachments, ammunition, movement and stairs, simultaneous touch input, tap firing, ADS modes, cancellation, configurable layouts, grenades, death and respawns, every mode's completion conditions, saves, all map navigation and bot-driven Gun Game completion across all four maps. New regressions cover clear 4× scopes and centred hits, combined aim/fire, ADS dragging, jump/crouch holds, semi-auto repeat and auto-reload, cancellation and finite controller input. The static check validates 21 JavaScript modules, local asset references, outward mesh winding the complete offline shell and the Home Screen manifest.

Browser checks exercised launch, loadout persistence, deployment, touch actions, pause, match completion, results, restart, menu return and the layout editor. Layouts were inspected at 667 × 375, 844 × 390 and 932 × 430; switching to 390 × 844 displayed the rotation guard. These checks used compatibility graphics. The final revision’s browser recheck was blocked by the cloud browser URL policy; the final 48-test regression suite and static validation passed. Additional simulations reached completed TDM, Sabotage and Domination matches on Foundry, Dustline and Relay.

Tap the BREACHLINE logo five times quickly, or press F3, to open developer tools. They provide god mode, unlimited ammo, unlock everything, spawn enemy, FPS / position / active actor overlay and restart. Normal progression does not prevent testing the full arsenal.

The preview server exposes `/__qa/viewport.html` for real-game responsive checks. The harness only changes the iframe viewport and enables touch controls; it does not inject game state and is excluded from the deployed `dist/` assets.

## Performance and polish pass — 7 September 2026

Initial per-batch instance storage falls from 4096 to 64 entries (98.4% less reserved instance memory before demand-driven growth). Buffers grow without dropping objects. Character bevels use 44% fewer vertices; weapon detail is retained. Bots avoid redundant firing visibility queries during cooldown/reload. Sustained slow frames can now disable expensive shadows; pause and results screens do not bias adaptive quality.

Graphics add soft billboard smoke, muzzle vapour, impact dust, ground contact shadows, map-tinted ambient light and subtle material weathering. Scope overlays now update with every simulation frame. Reload/swap sizing respects the control-size slider. Recoil at vertical aim limits, first-shot state after respawn, inaccessible storage, malformed saved layouts, audio-node cleanup, objective handover and FFA awareness are repaired. Missing assets show a retry flow. Results reduce frame rate and release the wake lock.

Six additional regressions exercise the repaired behaviour and dynamic instance growth. WebGL runtime and physical iPhone performance remain unverified in this environment. Browser QA was not repeated in this focused pass.
