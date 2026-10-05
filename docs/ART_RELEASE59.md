# Release 59 continuation checkpoint

Release 59 continues the production art overhaul saved on
`art-production-overhaul`. It ships the complete Release 58 Blender/PBR art,
ground illumination and original sound bank, plus the following corrections.

## Visual finish and scene cost

Exterior wall faces sample sky access and ground bounce on their outward side.
The inward face keeps the room's lighting. This corrects the coarse roof field
darkening the exterior without an additional texture sample or screen pass.
Textured world props keep a light tint rather than receiving a second dark
albedo. Uniform materials use their baked roughness, while merged native parts
retain their per-vertex metal, cloth and rubber response and wet-surface scaling.

Native high/low meshes now select per prop instance using projected size and
hysteresis. Close objects and large visible facades retain detail; distant
machinery, crates and fittings retain their simplified silhouettes. Destroyed
cover is removed from both meshes. Instancing and conservative bounds remain.
The editable meshes are the existing authored near/far pairs, so the packed
Blender source and runtime media do not require rebuilding or another download.

The [49-view scene audit](validation-release59-scene-budgets.json) covers all
16 maps at High. It counts every active world batch without subtracting
frustum-culled or hidden objects. Maximum active world batches are 200. The
Blacksite approach changes from 242,078 full-detail world triangles to 170,122
selected-LOD triangles, a 29.7% reduction, with 196 active world batches.
Actors, first-person weapons and shadow passes are additional work. These are
scene counts, not GPU timings or a comparison to measured Release 57 device FPS.

## Audio

Two shared responses distinguish compact rooms from industrial halls using
the source position and actual roof bounds. The hall response has a longer,
quieter tail. Gunshots, footfalls, landings, reloads and mechanical actions use
the appropriate response. Outdoor sounds stay dry and destroyed roofs cease
selecting indoor acoustics. The original 286 recordings, distance/wall filtering,
24-voice limit and player-action priority remain intact. No per-voice convolution
or additional media download is introduced.

## Verification and remaining work

All 284 regression tests pass, including every map and 30 weapon rigs, native
asset integrity, near/far destruction and local Benchmark Mode. Static checks
validate 76 JavaScript modules and the complete offline shell. All 38 generated
GLSL ES variants compile and link with Mesa GLES. The compiler export now
exercises the shipped baked-material path as well as compatibility materials.
See [validation](validation-release59.json) and [shader results](shaders-release59.json).

The prior Release 58 screenshots remain historical evidence. No fresh browser
screenshots, Safari/iPhone FPS, temperature, process-memory measurement or
physical audio listening was performed for Release 59. The managed preview's
required browser skill is unavailable in this environment; source, scene and
shader checks continued. Final visual refinement, more realistic human and
first-person assets, and device benchmark comparison remain unfinished. This
checkpoint does not establish commercial AAA quality or sustained 60 FPS.

Release 57 remains on `release57-baseline`. Release 59 advances the offline
cache and retains manual benchmark JSON export, allowing a new physical-device
report to identify the revised content exactly. The existing gameplay, collision,
controls, modes, progression and save formats remain authoritative.
