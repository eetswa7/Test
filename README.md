# Nightwatch: AC-130

A rebuilt version of the original Night Watch prototype, made for iPhone Safari and desktop browsers. The game runs entirely on the device. No accounts, purchases, third-party assets, analytics, or game servers are required by the game itself. A privately hosted copy may require its host's sign-in.

## Play

Open the hosted link in Safari. For a standalone view, choose Share → Add to Home Screen. Both portrait and landscape are supported. The game shell can work offline after it has loaded and its service worker has installed successfully.

- Drag the battlefield to move the sensor, or use the left thumb stick. Tap a contact to centre on it.
- Hold FIRE with your other thumb. Each pointer is tracked independently.
- Pinch to zoom, or use the zoom button. Tap the tactical map to reposition. FIND locates a priority or threatening contact.
- Cyan contacts are friendly; amber contacts are civilians. Red markers identify hostiles. Weapon blast circles help avoid collateral damage.
- The 25 mm has unlimited reserves but overheats. The 40 mm is for lighter vehicles, the 105 mm for armour and groups, and the guided missile requires a completed target lock.
- On desktop: WASD or arrows pan, Space fires, 1–4 switch weapons, E changes sensor, Q zooms, F finds a target, Escape pauses.

## Operations

| Operation | Objective |
| --- | --- |
| Broken Arrow | Defend Viper for 90 seconds |
| Long Road | Escort at least one vehicle to the eastern exit |
| Blackout | Destroy three command relays while avoiding civilians |
| Last Light | Protect the rescue team through helicopter extraction |
| Endless Night | Survive escalating waves with periodic resupply |

Each completed mission offers a choice of cooling, ammunition or ground-team health for the next sortie. Personal bests, medals, career points, kit selection and settings are saved locally on that browser. A sortie pauses on backgrounding; a page reload returns to mission selection.

## Development

The root `index.html` redirects into `dist/`. Serve the repository using any static HTTP server, or serve `dist/` directly. Modules require HTTP or HTTPS; opening files directly from a file manager is not supported.

No dependencies or build step are required. The authored `dist/` assets are the deployable game.

```sh
python3 -m http.server 8080
node --test tests/*.test.mjs
node --check dist/game.js
node --check dist/engine.js
node --check dist/sw.js
```

- `dist/engine.js`: seeded game simulation, missions, damage, projectiles, enemy attacks and scoring.
- `dist/game.js`: cached Canvas 2D world, touch/keyboard input, sound, effects, menu and local saves.
- `dist/styles.css`: responsive interface and safe-area handling.
- `dist/sw.js`: same-origin game-shell caching with redirect checks.

The engine tests cover aiming, locks, ammo, cooling, collateral damage, pause, mission outcomes, enemy attacks, survival limits and full campaign simulations. Input regression tests exercise concurrent pointers and interruptions using a lightweight DOM fixture. No physical iPhone performance measurements or real Safari browser tests have been performed in this environment.
