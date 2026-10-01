# Blender asset source

Run `npm run source:blender` to restore `breachline-assets.blend`, then open it
in Blender. The Asset gallery collection displays
the weapons, modular world kit, operator pieces and distant landscapes. The
Runtime meshes collection contains the exact exported geometry; it is hidden
in the gallery. Original albedo images and the baked texture atlases are packed
into the file. Meshes use metres, with axes converted to the game's Y-up space
during glTF export.

Blender authors assets. Three.js renders them in the existing Safari game;
collision, movement, scoring, controls, save data and weapon animation still
belong to the original simulation.

## Rebuild

Requirements: Node 20+, Blender with its glTF exporter, and NumPy available to
Blender's Python. This export was verified using Blender 4.0.2 and Cycles CPU
baking. The committed game assets require no local Blender installation to play.

From the repository root:

```sh
npm run assets:blender
npm test
npm run check
npm run profile:blender
```

Set `BLENDER_BIN` if Blender is not on your PATH. The build can take several
minutes. It exports `rig-input.json` directly from all 30 existing weapon models
and 15 maps, runs `build_assets.py`, then losslessly compresses the GLB. The input
includes stable component indices, exact transforms and moving-joint tags.
Neither source extraction nor runtime asset loading edits gameplay data.

The editable source and runtime assets are stored in bounded lossless segments.
Reassembly verifies the source hash. Segmenting changes file transport only;
the GLB, PNG and `.blend` bytes remain identical to the native Blender outputs.

The builder uses Blender's evaluated bevel/weighted-normal modifiers, deterministic
BVH ambient occlusion and native Cycles NORMAL/EMIT texture baking. It emits:

- `source/`: exact editable `.blend` bytes, restored by `npm run source:blender`.
- `dist/assets/blender/breachline-library.part*.bin`: losslessly compressed
  indexed GLB with near/far variants and merged weapon cores. Raw intermediates
  are ignored by git.
- Four 1024 × 1024 normal and packed surface PNG atlases, stored in segments.
- `dist/assets/blender/manifest.json`: rig bindings, mesh budgets and SHA-256
  asset integrity metadata.

Vertex colours store linear base colour and baked occlusion. Weapon cores carry
roughness/metalness in `TEXCOORD_1`; the local loader binds it as `breachMaterial`.
The secondary channel is material data, not a lightmap. The runtime reuses existing
albedo atlases, lighting, animation, attachments and exact muzzle/sight transforms.

To keep a change reproducible, edit the construction/bake definitions in
`build_assets.py`, then rebuild. Regeneration replaces the source `.blend` and
exports, so manual gallery edits must be incorporated into the builder before
running it. Changes to weapon core membership require a new export; the loader
rejects stale rig bindings instead of silently dropping components.

## Mobile budgets and checks

The current library contains 169 meshes. Compressed geometry plus the four new
atlases total 7,167,330 bytes, about 6.84 MiB. The uncompressed GLB is 25.93 MiB;
this is a transfer/CPU buffer figure, not measured driver memory. Atlas tiles use
the previous runtime sizes: 256 px for world surfaces and 512 px for weapons.
Near/far geometry shares materials and is instanced, with quarter-second world
LOD selection and hysteresis. No extra full-screen render pass is introduced.

`tests/blender-assets.test.mjs` reads the real exported buffers and checks every
map, weapon joint and attachment combination, native/fallback gzip decoding,
asset hashes, collision invariance and first-person draw/triangle budgets.
`scripts/export-shader-check.mjs` includes both original and Blender material
variants for the optional Mesa compiler gate documented in `docs/GRAPHICS.md`.
Scene counts and software rendering do not establish iPhone FPS or AAA fidelity.
