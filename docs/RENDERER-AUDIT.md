# Renderer audit: releases 18 to 23

This is a source and CPU/scene-profile ranking of the ten strongest actionable realism defects, ordered by expected visible benefit relative to implementation and frame cost. It is an engineering estimate, not a perceptual study or a GPU capture. The cloud preview URL was blocked during final browser verification. Earlier sessions could only run Canvas fallback. The new GPU shader output and physical iPhone FPS/thermals are unverified.

All ten received implementation changes. Commercial asset authoring, scanned characters and motion capture remain outside what these procedural assets can reproduce.

| Rank | Concrete reason for the prototype appearance | Implemented change | Incremental cost / checkpoint |
| --- | --- | --- | --- |
| 1 | Every covered texel had the same sky factor; the weapon could receive sunlight behind solid cover | Visibility-tested doorway daylight gradients, continuous weapon sampling of the shared field and a sun-visibility ray at 5 Hz | Existing 16 KiB texture and fragment sample; extra bake work and one periodic CPU ray. Release 19 |
| 2 | Cylinders repeated the entire image per segment, spheres used one texel, tubes had discontinuous mapping, and bevel normals changed UV scale across a face | Continuous curved UVs and static face metrics for consistent texture density | Two static vertex attributes; no extra fragment sample, triangle or batch. Release 20 |
| 3 | Multiplying roughness by grey albedo-derived data made every surface shinier; paint and rust had excessive metalness | Variation centred on authored roughness; dielectric painted blue surfaces, oxidised rust and plaster | Scalar arithmetic in the existing roughness pass; material sharing reduces some world batches. Release 20 |
| 4 | The weapon reflected the outdoor sky indoors and its hemisphere fill tilted with the camera | Small generic interior PMREM with doorway selection hysteresis; world-upright hemisphere | One additional static 64 px-face probe and map-load convolution; same runtime environment sampler. Release 21 |
| 5 | Non-uniform scaling stretched weapon bevels into soft, toy-like ends | Hard parts use physical bevel widths capped at 2.5 mm; gloves keep soft silhouettes | Vertex arithmetic; unchanged geometry, outer bounds and weapon batches. Release 21 |
| 6 | Identical tiles and clean wall bases lacked surface ageing and scale cues | Stable per-instance tonal variation and restrained low wall dirt/damp bands | Existing world-position varying plus two scalar varyings; no new texture or decal draw. Release 22 |
| 7 | Fixed shadow offsets detached contacts; resetting the update clock turned 24 Hz into 20 Hz at 60 FPS | Bias scales with texel footprint; fractional cadence preserved | Same shadow map/filter. High performs its intended 24 rather than 20 updates/s, a 20% increase in shadow-update frequency. Adaptive tiers remain active. Release 22 |
| 8 | Leaf cards behaved like opaque painted sheets | Capped thin-leaf sky-transmission approximation in the existing PBR material | One uniform direction, dot product and bounded colour contribution; no additional light or pass. Release 22 |
| 9 | Legs rotated around separate centres while boots stayed still | Connected two-bone leg pose, alternating foot lift and crouch continuity | Two analytic leg solves per visible actor; no additional mesh, physics or gameplay changes. Release 23 |
| 10 | Specular anti-aliasing only considered geometric normals, allowing normal-map highlights to sparkle | Existing Three derivative roughness uses the perturbed normal | Reuses the same derivative evaluations; no extra texture, post-process target or history buffer. Release 23 |

## Profiling and optimisation

The repeatable script is `node scripts/profile-graphics.mjs`. It constructs real Three scenes at seeded High-quality TDM spawns on all eight maps with an 844 × 390 reference viewport. It does not submit GPU draws or measure rasterised occlusion. The fixture now matches production's 16-sided cylinders and weapon bevel radius. Both comparison runs use this correction; the older release 17 profile used 12-sided fixture cylinders and undercounted triangles.

Raw measurements: [release 18](profile-release18.json) and [release 23](profile-release23.json). CPU timings are noisy container samples, not a claim of iPhone speedup. Counts are reproducible for these seeded viewpoints.

| Map | World batches 18 → 23 | Visible world triangles | Actor CPU median (ms) | Incremental bake p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| OLD QUARTER | 162 → 158 | 37,362 | 0.077 | 0.939 |
| FOUNDRY | 105 → 101 | 9,594 | 0.069 | 0.915 |
| DUSTLINE | 185 → 184 | 23,206 | 0.070 | 0.943 |
| RELAY | 179 → 179 | 21,368 | 0.068 | 0.870 |
| BREAKWATER | 113 → 109 | 12,572 | 0.068 | 0.830 |
| CITADEL | 175 → 174 | 26,522 | 0.068 | 1.085 |
| SWITCHYARD | 162 → 162 | 17,764 | 0.124 | 0.875 |
| CANOPY | 175 → 175 | 21,094 | 0.070 | 0.902 |

The default rifle remains **15,240 triangles in 10 batches**. World batches decrease on five maps and are unchanged on the other three. All sampled world triangle counts are unchanged. Shader arithmetic and the additional room probe still have GPU costs that cannot be quantified here.

Doorway baking initially increased CPU spikes. Contact candidates are now filtered before the texel loop, and distant contacts skip square roots. SHA-256 comparisons confirmed byte-identical fields on all eight maps before and after that optimisation. Rebuilds after destruction process 16 texels at a time, check a 0.65 ms soft deadline and never exceed 128 texels per frame. The previous complete texture stays visible until the replacement is complete. The deadline can overshoot by one small chunk or OS scheduling; it is not a hard real-time guarantee. Initial map loading still completes its field synchronously.

## Regression coverage and remaining checks

Final validation: 142 automated regressions plus static module, asset, winding and offline-shell checks. New coverage includes doorway light gradients, continuous cylinder/tube/sphere UVs, stable bevel UV metrics, material shader composition, room-probe hysteresis, shadow cadence and bias bounds, connected knees, forward knee bend, alternating foot lift and crouching. Existing tests retain all eight maps, arsenal, ADS, reloads, saves, modes, touch and controller behaviour.

The environment remains Three.js r180/WebGL2 with the existing Canvas fallback. Low/Medium/High/Ultra, dynamic resolution, native MSAA, ACES and bounded effects remain enabled. No extra full-screen post-processing pass, live reflection capture, real-time light or blanket polygon increase was introduced. The GPU shader snippets are composed against the vendored Three shader library in tests; this is not GPU compilation validation.

The first device check should compare the same exterior, doorway and interior routes, then play for 15–20 minutes while recording frame p95, render resolution, draws and GPU timing where available. In particular, check indoor probe transitions, the smaller shadow bias, physical bevel shading, thin leaves and specular stability. The new lighting remains an inexpensive approximation, and the procedural character/weapon assets do not equal authored AAA production assets.
