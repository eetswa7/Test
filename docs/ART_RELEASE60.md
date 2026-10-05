# Release 60 production and review

This release replaces shared environment and hero geometry across all sixteen
maps and thirty weapon families, recalibrates material production, rebakes the
complete map lighting library and rebuilds original sound design. The user’s
production objective and the physical Release 57 constraints are retained in
[the production brief](PRODUCTION_BRIEF.md).

## What changed

Native architecture now has precast seams, opaque recessed backing, structural
depth, recessed glazed facades, open architectural reveals, coping, industrial
steelwork and roof equipment. Native vehicles, cargo, generators, switchgear,
HVAC, drains, cable trays and other equipment replace weak component layers.
Map-specific material families retain stone, plaster, concrete, soil and biome
identity. Blacksite adds correctly matched apertures, realistic frame widths,
service structures, connected concrete forecourts and weathered lane paint.
Collision, spawns, objective positions and navigation remain simulation-owned.

Manufactured weapon cores have shaped receivers, magwells, stocks, rails,
perforated handguards, slides and magazines. Hollow optics preserve sight rays.
Operators and first-person hands use tapered anatomical clothing, cuffs, smooth
organic normals, stitched gloves, shaped armour and equipment. Existing joint
and mechanical anchors still drive recoil, handling and reloads. Close operators
carry the native weapon construction; distant ones retain inexpensive proxies.
The rig consists of animated rigid mesh groups rather than a new skinned human
or motion-capture system.

Materials use physically calibrated reflectance and differentiated metal,
polymer, cloth and concrete response. Original road and weapon surface artwork
adds useful surface variation. Sixty independently mipmapped albedo, normal and
packed occlusion/roughness/metal maps use ASTC on supported Safari hardware and
WebP fallback elsewhere; prominent weapon finishes use 2048-pixel maps. All
sixteen ground irradiance maps are fresh 32-sample Cycles RGBM bakes using actual
source material reflectance. Sun-aware ground normals, cached environment probes,
height haze and restrained contact/soft shadows retain the existing renderer.
There is no additional full-screen postprocessing pass or engine migration.

Impacts have material-specific tint/rotation, and bounded particles have coherent
rotating smoke volumes, varied dust/debris and distinct precipitation silhouettes.
Objective cloth has an original insignia, textile colour and anchored movement.

All thirty weapon voicings have editable pressure/noise/mechanical layers, with
four unsuppressed and three suppressed variants. Footsteps have five variants per
surface, including wood, and actions, impacts and debris avoid immediate repeats.
The bank contains 364 original AAC takes across 164 event keys. Distance filtering,
positional playback and roof-aware room/warehouse returns use bounded voices and
two shared convolvers. These are original sound designs, not copied recordings.

## Visual review

Actual shipped-renderer gameplay views are reviewed outdoors, indoors, at oblique
angles, during combat/reload and with close operators and weapons. The first
integrated review exposed oversized untextured surrounds, wall-joint light leaks,
flat machinery and grey faceted hands. The follow-up rebuild fixes those defects
and rebakes the source assemblies; export success alone was not accepted as a
visual result. The complete map sweep also exposed unsupported legacy service
spans, plaster artwork on snow, hard cyan puddle edges and disconnected stock
construction. The refined source removes the unsupported spans, calibrates snow
and irregular transparent puddles, joins all helper-built stock families to their
receivers and makes magazine sections continuous. Side views are included for
every weapon to expose construction gaps hidden in the forward camera.

Matched actual Release 57 gameplay renders use the same software backend, camera,
quality, seed and viewport as the new screenshots. Those images are visual
evidence, not physical-device frame-rate measurements. Final image and
scene-count evidence is stored with this release.

## Cost controls and limits

Native floor finishes share batches; substantial architecture retains spatial
chunks. Per-instance projected-size near/far selection, mipmaps, static light
bakes, throttled shadows and existing automatic quality/dynamic resolution bound
rendering cost. Large textures are uploaded before controls activate in byte-sized
stages; background/resume and Benchmark Mode behavior remain intact.

The asset download is deliberately larger than the old approximately 11 MiB art
limit. Geometry and texture reports distinguish compressed transport, retained
buffers and estimated block storage from actual Safari process memory. The hero
regression covers 52,920 weapon/attachment combinations with an absolute 32,000
first-person triangle limit and sixteen active batches, or seventeen for drum
magazines. Detailed hands/weapons cost more geometry than Release 59; this is a
visible art investment, not a claim of free GPU headroom.

The physical iPhone 16 Pro Release 57 reference remains approximately 57.4 FPS,
29 FPS at the 1% low, 17.4 ms average frame time, 3.74 ms measured CPU frame and
1,315 stuttering frames. GPU timings were unavailable, and adaptive quality
changed during that session. New browser timing is software-rendered and cannot
establish iPhone performance, thermal behavior or memory safety. Benchmark Mode
and exact JSON download remain available for the next physical-device report.

This is a substantial complete-library production revision. It does not
establish commercial reference-game fidelity, photoreal production humans,
motion-captured animation or verified sustained iPhone frame rate.

## Rebuild and recovery

Run `npm run source:blender` to reconstruct the segmented editable native source.
Run `npm run assets:blender` to regenerate geometry, texture bakes, all map GI,
source segments and runtime assets. A geometry-only iteration may reuse exact
packed material bakes with `npm run assets:blender -- --reuse-bakes`; GI is still
rebaked unless explicitly reused. Blender 4.3 and the official Arm ASTC encoder
are used for this release. Original texture and audio inputs remain in
`authoring/`, with [provenance](ART_PROVENANCE.md).

`release57-baseline` preserves the physical reference revision. The initial
integrated Release 60 checkpoint and the refined release retain full native
source and runtime assets in Git history. The hosting archive contains the exact
committed distribution rather than untracked authoring intermediates.
