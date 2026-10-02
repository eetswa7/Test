# Blender art source

Run `npm run source:blender` to restore `breachline-assets.blend` and open it in
Blender. The Asset gallery contains the shared kit and weapon rigs. The hidden
Complete levels / metres collection contains all 15 map assemblies. Enable one
map collection to inspect its geometry. Runtime meshes remain hidden in the
gallery. Material graphs, original texture inputs and all nine native bakes are
packed into the source project.

Blender authors the graphics; Three.js draws the exported library in Safari.
The existing simulation owns collision, movement, combat, input, objectives,
weapon transforms and saves. Its map layouts and behaviour are preserved.

## Rebuild

Requirements: Node 20+, Blender 4.0+ with its glTF exporter and NumPy, and Python
with Pillow/WebP support. This pipeline is verified with Blender 4.0.2, Cycles
CPU baking and lossless WebP compression. The game requires no Blender install.

```sh
npm run assets:blender
node scripts/release.mjs 52
npm test
npm run check
npm run profile:blender
```

`BLENDER_BIN` and `PYTHON_BIN` can select installed executables. Construction is
in `build_assets.py` and `art_geometry.py`; native material graphs and Cycles
bakes are in `materials.py`. Rebuilding replaces the saved source and exports,
so incorporate manual asset edits into these definitions before regenerating.
`export-blender-input.mjs` extracts exact original rig transforms, moving tags,
hand bindings and unchanged visual map assemblies.

For geometry iteration after restoring a current native project, use
`npm run assets:blender -- --reuse-bakes`. This restores the exact nine packed
PNG bakes and editable shader graphs, then atomically saves the updated source.
Run a full build when changing materials. An older project without all nine
bakes requires a full build first.

The source builder produces profiled receivers with native Boolean vents,
tapered magazines and grips, smooth articulated hand groups, operator anatomy
and equipment, facade modules, machinery, props, vegetation and terrain.
Vertex colours carry base colour and cavity occlusion. A second UV channel
carries roughness/metalness for rigid groups and mixed-material props. It is
physical data, not a lightmap. Identical hand shapes are deduplicated across
weapons. Existing optics, grips, muzzles, reloads and sight alignment remain live.

All surface albedo, normals and physical data; cutout foliage; cloud imagery;
and smoke, flash, contact and impact stamps come from Blender shader bakes.
Original photography is input to those graphs. Pillow performs lossless format
compression, verifies every decoded pixel, then atomically replaces each file.
It adds no artwork. PNG and WebP intermediates are ignored by git. Bounded asset
segments restore the native GLB, compressed textures and editable `.blend`, with
SHA-256 integrity metadata. Segmentation affects transport only.

## Budgets and checks

226 indexed meshes use about 5.15 MiB compressed geometry; the complete runtime
art download is about 10.92 MiB. Packed raw geometry is 17.02 MiB.
Textures remain mipmapped 256/512 px tiles; world objects are instanced by
spatial chunk and material. Native near/far geometry and existing quality/scale
controls bound detail. No full-screen post-processing target is added.

`tests/blender-assets.test.mjs` checks real buffers, all 30 rigs with attachment
variations, hand coverage, all-map collision invariants, destruction, nonempty
texture containers, asset/source hashes, gzip fallbacks and offline packaging.
`profile:blender` reports scene counts and container CPU costs. Software browser
checks exercise the real WebGL shaders, all maps/weapons and offline deployment.
Neither those checks nor raw draw counts establish physical iPhone FPS or
commercial AAA fidelity.

Revision 3 uses real physical edge radii, longitudinal receiver sections and
weighted surface normals. Core glTF normalised 16-bit colour and physical
streams save 4.00 MiB, with maximum scalar error below 0.00000763. Positions,
normals, texture coordinates and indices are byte-identical to Blender's export.
The packing manifest records verification hashes and precision bounds.
