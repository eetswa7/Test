# BREACHLINE graphics

Current changes and measurements: [release 23 renderer audit](RENDERER-AUDIT.md). The release 17 baseline below is retained for historical comparison.

The target is sustained 60 FPS on modern iPhones. It is a target, not a measured guarantee. Releases 15–17 improve illumination, surface response and stability while retaining the existing eight maps, fourteen firearms plus blade, seven modes, touch/controller input and progression.

## Systems and budgets

| System | Responsibility | Bounded cost |
| --- | --- | --- |
| `graphics-quality.js` | Measured quality selection and dynamic resolution | Four tiers; hysteresis and slow recovery |
| `graphics-profiler.js` | CPU/frame timings, optional asynchronous GPU queries | Three pending queries maximum; one sample per 12 rendered frames |
| `material-detail.js` | Normal detail and packed cavity, roughness, metallic variation | Reuses the roughness texture sample |
| `lighting-field.js` | Height-aware sky access, warm fixture bounce and ground contact | One 64 × 64 RGBA field, 16 KiB, one fragment lookup |
| `environment-probes.js` | Original HDR sky radiance and PMREM reflections | One map-load convolution, 128 px cube faces; no live captures |
| `shadow-system.js` | Texel-stable sun projection and update cadence | One shadow-casting light in a player-centred window |
| `scene-lod.js` | Screen-size decoration culling and hysteretic actor detail | Updates decoration selection at most every 150 ms |
| `particles.js` | Shared smoke, impact and sparse room dust shaders | Existing 280-billboard capacity, one transparent effect batch |
| `decal-system.js` | Surface-aligned bullet craters | 64 two-triangle decals, one batch, no texture and no shadow casts |
| `render-pipeline.js` | Colour management, native MSAA and ACES presentation | Zero extra full-screen post-process targets |
| `three-renderer.js` | Scene integration, batched assets and light selection | Static chunks, cached materials, occupied buffer uploads |

| Tier | Maximum pixels | DPR cap | Sun map | Sun updates | Anisotropy cap | Smoke layers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 850,000 | 1.35 | Off | Off | 2× | 4 |
| MEDIUM | 1,400,000 | 1.65 | 1024² | 15 Hz | 4× | 5 |
| HIGH | 2,200,000 | 1.85 | 1536² | 24 Hz | 4× | 6 |
| ULTRA | 2,600,000 | 2 | 2048² | 30 Hz | 8× | 6 |

The pixel limit is a ceiling, not a forced target. CSS viewport, DPR, tier scale and adaptive scale determine actual resolution. Automatic starts at Medium, ignores menu/pause/background gaps and allows a warmup after map changes. It lowers resolution or scene cost after sustained overload, and requires 18 seconds of headroom before recovering. CPU-heavy frames favour a tier reduction. Manual selections still permit protective reductions. No user-agent/device-name heuristic is used.

Open diagnostics with F3 or five quick taps on the logo. GPU time remains “unavailable” if disjoint timer queries are unsupported; pending queries never block the frame. Texture memory is an estimate of owned image/mip storage, not a driver allocation counter. Shader program count is a complexity proxy, not instruction count. Shadow draws report the last shadow update, while total draws/triangles include all actual renderer passes. Frame p95 samples active gameplay. Resolution is the actual drawing buffer size.

## Lighting and materials

Standard materials use a linear-light PBR workflow. Base-colour images are sRGB; normal and packed scalar data stay linear. Glass uses a physical dielectric material; metals and polymers retain different authored metalness and roughness. Fine hero normals remain weak enough to avoid a stone-like surface. Packed roughness variation and cavity shading modulate the existing response without another AO/metallic texture fetch. Texture mipmaps and capped anisotropy stabilise oblique surfaces.

The indirect field is an approximation of room illumination, not ray-traced GI or a conventional UV lightmap. It darkens indirect light below roofs, adds restrained warm fixture bounce after visibility checks and fades ground contact with height. It preserves direct sunlight and original albedo. Three selected unshadowed fixture lights affect nearby surfaces and actors; one visibility-checked camera-space light reaches the weapon and hands. Sun direction and reflection orientation follow the world, and first-person fill/reflections blend when entering rooms.

Map-load light baking is synchronous. Destruction schedules a replacement field in two-row slices, keeps the previous complete texture visible, then uploads once all 64 rows are ready. Repeated destruction replaces the pending job. This avoids doing a complete light bake in an explosion frame. It does not guarantee a strict CPU deadline on every phone.

Existing modular architecture, grime textures, signs, vents, pipes, cover, foliage and bevels are preserved. Tiny non-emissive decoration is removed only below a sub-pixel threshold. Structural blocks are excluded. Hysteresis prevents threshold flicker, conservative bounds preserve returning parts, and unchanged batches do not re-upload. Actor detail responds to camera FOV so ADS keeps useful detail at longer range; enemies remain visible out to the camera far plane on every tier.

First-person turning inertia, breathing, sprint and landing offsets are deliberately small. Fully aimed sights stay aligned with the ballistic centre. Recoil, mechanisms, reloads, hand animation and existing attachment models remain functional. The weapon stays the hero asset rather than receiving another blanket geometry increase.

## Reflections, atmosphere and presentation

A generated linear HDR radiance dome aligns the bright solar lobe with each map's sun. PMREM supplies roughness-dependent reflections. It does not reproduce local reflected geometry or parallax. Room reflection intensity and direct fixture lighting provide a cheap local cue. Live planar captures and screen-space reflections would duplicate substantial scene/pixel work and are not enabled without evidence of a useful gain.

Existing distance fog, muzzle smoke and impact particles are retained. High and Ultra add six or ten tiny motes near a visible interior lamp inside the shared pool. Decals use irregular alpha-tested crater silhouettes, align to the hit normal, offset from the surface and expire after 18 seconds. No transparent decal sorting or shadow pass is added.

Presentation uses native MSAA plus ACES filmic tone mapping and sRGB output in the final material pass. Alpha-to-coverage smooths foliage and decal edges when the context provides MSAA. Exposure remains 1.05. This avoids another full-resolution colour/depth target. Full SSAO/GTAO, TAA, bloom, sharpening, volumetrics, motion blur, grain and chromatic aberration are not enabled. The baked indirect/contact field, small contact-shadow planes and stable shadow projection address the useful lighting cues at much lower expected cost. No GPU comparison supports adding heavier post-processing here.

## Asset and backend decisions

The current original assets are procedural geometry with WebP atlases. WebP reduces download size; decoded Canvas/DataTextures are **not GPU-compressed textures**. Hero finishes use 512 px tiles and ordinary surfaces use 256 px tiles, with mipmaps. There are no 4K material allocations. Existing models avoid runtime loader/decoder dependencies and share geometry/material batches.

For a future authored asset replacement, prefer GLB with metre units, consistent tangent space, shared PBR materials, baked-light UVs and LOD meshes. Use Meshopt when geometry savings justify decode work; package KTX2/Basis and its decoder locally and test ASTC transcoding on Safari. [Three's KTX2 loader](https://threejs.org/docs/pages/KTX2Loader.html) supports renderer capability detection. No unused decoder, unvalidated replacement asset, or claim of GPU compression is added in this release.

[WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html) can select WebGPU with a WebGL2 backend fallback. It is not a drop-in replacement for this renderer: [Material.onBeforeCompile](https://threejs.org/docs/pages/Material.html#onBeforeCompile) is specific to WebGLRenderer. The material, light-field, leaf/depth and particle patches need Node Material/TSL equivalents, as do the new procedural decals. That port would need side-by-side image and timing checks on supported iPhones. `render-pipeline.js` records capability exposure, and the extracted systems isolate the porting work. WebGPU is **not enabled** merely because `navigator.gpu` exists. The current WebGL2 and Canvas compatibility paths remain reliable fallbacks.

## Validation and measured limits

Run:

```sh
npm test
npm run check
node scripts/profile-graphics.mjs
```

Release 17 passes 134 regressions and static checks for 38 JavaScript modules, local assets, geometry winding and the complete offline shell. Coverage includes controls, scope alignment, saves, maps/modes, weapon mechanisms, buffer caching, shadow projection, packed surface data, indirect lighting, LOD restoration, decal orientation and bounded particles.

The repeatable profile constructs real Three scenes at an 844 × 390 reference viewport, High's pixel scale and 80° horizontal FOV, with seeded TDM spawns on all eight maps. It counts frustum-visible batches, not occlusion-visible pixels. It measures actor preparation/upload bookkeeping and lighting CPU work without rendering a GPU frame. A recorded container run is in [graphics-profile.json](graphics-profile.json):

- Total world batches: 105–185. Frustum-visible world batches: 79–147; world triangles: 9,498–35,970 at the sampled spawns.
- Default rifle: 15,144 triangles in 10 material/geometry batches; identical geometry across tiers.
- Actor preparation median: 0.065–0.134 ms. These numbers exclude simulation and browser/GPU submission.
- Full light-field bake: 16.2–49.6 ms. Two-row slices: 0.47–1.05 ms median, 0.64–3.60 ms p95 across maps in this run. CPU scheduling affects these numbers.
- Tiny-part culling depends on distance, render resolution and view; it avoids introducing extra draws just to hide a few triangles.

Browser checks use the real game through the responsive harness. This cloud browser disables its WebGL driver, so checks cover Canvas fallback, settings, gameplay flow and layout. They do **not** validate the appearance or compilation of the new GPU shaders. Native GPU timing, iPhone Safari/PWA context recovery, gyro/controller hardware, safe areas and thermal endurance need physical-device testing.

The next justified graphics step is a fixed-route exterior/interior comparison and a 15–20 minute combat run on physical iPhones, recording actual resolution, frame p95, draws and GPU timing where supported. Further expensive effects or a backend migration should be based on those measurements. This release does not claim commercial AAA assets, photoreal characters, or verified sustained 60 FPS.
