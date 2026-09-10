import * as THREE from '../vendor/three.module.min.js';
import { clamp, lerp, compose, direction, distance } from './math.js?v=13';
import { makeCube, makeCylinder, makeSphere, actorModel, material, part } from './geometry.js?v=13';
import { roundedBox, tube, leafCard, rockMesh } from './meshes.js?v=13';
import { loadImages } from './textures.js?v=13';
import { aimFov, verticalFov, scopeVisible, weaponPose } from './aim.js?v=13';
import { weaponModel, animateWeaponParts } from './weapon-models.js?v=13';
import { identityFor, IDENTITIES } from './combat-identity.js?v=13';

const QUALITY = {
  low: { scale: .7, dpr: 1.35, shadow: 0, shadowHz: 0, effects: 70, smokeLayers: 4, foliage: .55, range: 65 },
  medium: { scale: .9, dpr: 1.65, shadow: 1024, shadowHz: 15, effects: 130, smokeLayers: 5, foliage: .8, range: 85 },
  high: { scale: 1, dpr: 1.85, shadow: 1536, shadowHz: 24, effects: 200, smokeLayers: 6, foliage: 1, range: 110 }
};
const FRIEND = IDENTITIES.ally.band, ENEMY = IDENTITIES.enemy.band;
const FX_CAPACITY = 280;
const RAD = Math.PI / 180;
const FAR_ACTOR_PARTS = new Set([0,1,2,3,4,5,6,7,8,10,11,14,15,16,17,20,21]);
const IDLE_FRAME = () => new Promise(resolve => setTimeout(resolve, 0));

// The gameplay model remains engine independent. Only this module owns Three.js.
export function isFriendly(game, actor) {
  return identityFor(actor, game.player, game.rules).key !== 'enemy';
}

function bufferGeometry(vertices) {
  const geometry = new THREE.BufferGeometry();
  const buffer = new THREE.InterleavedBuffer(vertices, 8);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(buffer, 3, 3));
  geometry.setAttribute('uv', new THREE.InterleavedBufferAttribute(buffer, 2, 6));
  geometry.computeBoundingSphere();
  return geometry;
}

function tileCanvas(image, columns, index, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const edge = image.width / columns, height = image.height / columns;
  context.drawImage(image, index % columns * edge, Math.floor(index / columns) * height,
    edge, height, 0, 0, size, size);
  return canvas;
}

// Remove a tile's average colour before applying the authored weapon finish.
// This keeps dark graphite legible and prevents a tan tile from tinting twice.
export function neutraliseFinish(pixels) {
  let red = 0, green = 0, blue = 0, count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) { red += pixels[i]; green += pixels[i+1]; blue += pixels[i+2]; }
  const sr = 178 / Math.max(24, red / count), sg = 178 / Math.max(24, green / count), sb = 178 / Math.max(24, blue / count);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = clamp(pixels[i] * sr, 18, 248); pixels[i+1] = clamp(pixels[i+1] * sg, 18, 248); pixels[i+2] = clamp(pixels[i+2] * sb, 18, 248);
  }
  return pixels;
}

// Original detail maps are derived once at load time, never during a frame.
function detailMaps(canvas) {
  const size = canvas.width, data = canvas.getContext('2d').getImageData(0, 0, size, size).data;
  const normal = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  const height = (x, y) => { const i = (((y + size) % size) * size + (x + size) % size) * 4;
    return (data[i] * .25 + data[i + 1] * .6 + data[i + 2] * .15) / 255; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const dx = (height(x - 1, y) - height(x + 1, y)) * 1.5;
    const dy = (height(x, y + 1) - height(x, y - 1)) * 1.5;
    const length = Math.hypot(dx, dy, 1);
    normal[i] = (dx / length * .5 + .5) * 255;
    normal[i + 1] = (dy / length * .5 + .5) * 255;
    normal[i + 2] = (1 / length * .5 + .5) * 255; normal[i + 3] = 255;
    const r = 180 + height(x, y) * 70;
    rough[i] = rough[i + 1] = rough[i + 2] = r; rough[i + 3] = 255;
  }
  const n = new THREE.DataTexture(normal, size, size, THREE.RGBAFormat);
  const r = new THREE.DataTexture(rough, size, size, THREE.RGBAFormat);
  // CanvasTexture flips vertically; keep the derived maps in the same orientation.
  n.flipY = r.flipY = true;
  for (const texture of [n, r]) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.needsUpdate = true; }
  return { normal: n, roughness: r };
}

const billboardVertex = `
attribute vec3 instancePosition;
attribute vec3 instanceTint;
attribute vec2 instanceSize;
attribute float instanceAlpha;
attribute float instanceKind;
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
void main() {
  vUv=uv; vTint=instanceTint; vAlpha=instanceAlpha; vKind=instanceKind;
  vec4 centre=modelViewMatrix*vec4(instancePosition,1.0);
  centre.xy+=position.xy*instanceSize;
  gl_Position=projectionMatrix*centre;
}`;
const billboardFragment = `
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
void main(){
  vec2 p=vUv*2.0-1.0; float radius=length(p);
  float edge=1.0-smoothstep(.22,1.0,radius);
  float wisps=.78+.22*sin(p.x*13.0+sin(p.y*11.0))*sin(p.y*16.0+p.x*7.0);
  float a=edge*vAlpha; if(vKind<.5)a*=wisps;
  if(a<.012)discard;
  vec3 c=vTint;
  if(vKind>1.5)c=mix(vTint,vec3(2.8,2.2,1.3),pow(max(0.0,1.0-radius),4.0));
  gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas; this.settings = settings; this.lost = false; this.compatibility = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false,
      depth: true, stencil: false, powerPreference: 'high-performance' });
    this.gl = this.renderer.getContext();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.scene = new THREE.Scene(); this.weaponScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, .055, 190);
    this.weaponCamera = new THREE.PerspectiveCamera(65, 1, .018, 10);
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.weaponRoot = new THREE.Group(); this.weaponScene.add(this.weaponRoot);
    this.sun = new THREE.DirectionalLight(0xffefd8, 3.1);
    this.sun.castShadow = true; this.sun.shadow.bias = -.00035; this.sun.shadow.normalBias = .035;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 150;
    Object.assign(this.sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xb1d4ea, 0x5a564b, 1.45); this.scene.add(this.hemi);
    this.weaponKeyLight = new THREE.DirectionalLight(0xfff0da, 3.4);
    this.weaponKeyLight.position.set(-2, 4, 1);
    this.weaponFill = new THREE.HemisphereLight(0xbddaea, 0x38302a, 1.75);
    this.weaponScene.add(this.weaponKeyLight, this.weaponFill);
    this.interiorLights = Array.from({ length: 3 }, () => { const light = new THREE.PointLight(0xffdfad, 0, 11, 2);
      this.scene.add(light); return light; });
    this.muzzleLight = new THREE.PointLight(0xffb345, 0, 2.3, 2); this.weaponScene.add(this.muzzleLight);
    this.geometry = {
      cube: bufferGeometry(makeCube()), cylinder: bufferGeometry(makeCylinder(16)),
      sphere: bufferGeometry(makeSphere()), bevel: bufferGeometry(roundedBox(.1, 4)),
      bevelWorld: bufferGeometry(roundedBox(.08, 3)), bevelActor: bufferGeometry(roundedBox(.1, 2)),
      tube: bufferGeometry(tube(24)), leaf: bufferGeometry(leafCard()), rock: bufferGeometry(rockMesh())
    };
    // leafCard's UVs are top-down for the legacy path; Three's CanvasTexture is bottom-up.
    const leafUV = this.geometry.leaf.getAttribute('uv');
    for (let i = 0; i < leafUV.count; i++) leafUV.setY(i, 1 - leafUV.getY(i));
    this.materials = new Map(); this.depthMaterials = new Map(); this.textures = []; this.partData = new WeakMap();
    this.worldBatches = []; this.actorBatches = new Map(); this.weaponBatches = new Map();
    this.matrix = new THREE.Matrix4(); this.parentMatrix = new THREE.Matrix4();
    this.localMatrix = new THREE.Matrix4(); this.rawMatrix = new Float32Array(16);
    this.color = new THREE.Color(); this.target = new THREE.Vector3(); this.projected = new THREE.Vector4();
    this.worldVP = new THREE.Matrix4(); this.eye = { x: 0, y: 2, z: 0 }; this.cameraY = null;
    this.windTime = { value: 0 }; this.weaponKey = ''; this.weaponParts = []; this.weaponPoseState = {};
    this.frustum = new THREE.Frustum(); this.actorBounds = new THREE.Sphere(new THREE.Vector3(), 1.5);
    this.renderScale = 1; this.frameAverage = 16.7; this.slowTime = 0; this.fastTime = 0;
    this.frames = 0; this.fps = 60; this.lastFPS = 0; this.drawCalls = 0; this.shadowClock = 1;
    this.quality = this.chooseQuality(); this.appliedQuality = ''; this.width = 0; this.height = 0;
    this.effects = Array.from({ length: 200 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      size: 0, max: 1, kind: 0, r: 1, g: 1, b: 1 }));
    this.effectCursor = 0; this.nearestLights = [null, null, null]; this.lightDistances = [Infinity, Infinity, Infinity];
    this.decals = Array.from({ length: 64 }, () => ({ life: 0, part: null })); this.decalCursor = 0;
    this.createEffectPool(); this.createMuzzle();
    this.onContextLost = event => { event.preventDefault(); this.lost = true;
      window.dispatchEvent(new CustomEvent('graphicslost')); };
    this.onContextRestored = () => window.location.reload();
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.ready = this.loadAssets();
  }

  chooseQuality() {
    if (QUALITY[this.settings.quality]) return this.settings.quality;
    const mobile = (navigator.maxTouchPoints ?? 0) > 0;
    return !mobile && (navigator.hardwareConcurrency ?? 4) >= 8 ? 'high' : 'medium';
  }

  async loadAssets() {
    const images = await loadImages(), anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.surfaceMaps = []; this.leafMaps = []; this.weaponMaps = [];
    for (let i = 0; i < 16; i++) {
      const canvas = tileCanvas(images.surfaces, 4, i, 256), map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = anisotropy;
      const detail = detailMaps(canvas); this.surfaceMaps.push({ map, ...detail });
      this.textures.push(map, detail.normal, detail.roughness);
      if (i % 4 === 3) await IDLE_FRAME(); // Let input/loading UI paint between CPU texture work.
    }
    if (images.weapon) for (let i = 0; i < 4; i++) {
      const canvas = tileCanvas(images.weapon, 2, i, 256), context = canvas.getContext('2d');
      const detail = detailMaps(canvas), pixels = context.getImageData(0, 0, 256, 256);
      neutraliseFinish(pixels.data); context.putImageData(pixels, 0, 0);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = anisotropy;
      detail.normal.anisotropy = anisotropy;
      this.weaponMaps.push({ map, ...detail }); this.textures.push(map, detail.normal, detail.roughness);
      await IDLE_FRAME();
    }
    for (let i = 0; i < 4; i++) {
      const map = new THREE.CanvasTexture(tileCanvas(images.leaves, 2, i, 512));
      map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
      this.leafMaps.push(map); this.textures.push(map);
    }
    // Mirror the original horizon around a full panorama: no visible wrap seam.
    const panorama = document.createElement('canvas'); panorama.width = 2048; panorama.height = 1024;
    const context = panorama.getContext('2d');
    context.drawImage(images.horizon, 0, 0, 1024, 1024);
    context.save(); context.translate(2048, 0); context.scale(-1, 1);
    context.drawImage(images.horizon, 0, 0, 1024, 1024); context.restore();
    this.horizon = new THREE.CanvasTexture(panorama); this.horizon.colorSpace = THREE.SRGBColorSpace;
    this.horizon.mapping = THREE.EquirectangularReflectionMapping; this.textures.push(this.horizon);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromEquirectangular(this.horizon); pmrem.dispose();
    this.scene.background = this.horizon; this.scene.backgroundIntensity = .85;
    this.scene.environment = this.weaponScene.environment = this.environment.texture;
    this.scene.environmentIntensity = .58; this.weaponScene.environmentIntensity = .85;
    this.loaded = true;
    if (this.arena) this.buildWorld();
    this.applyQuality();
    // Use the supported asynchronous shader warmup path when available.
    if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
    return this;
  }

  setArena(arena) {
    this.arena = arena; this.cameraY = null; this.shadowClock = 1;
    for (const effect of this.effects) effect.life = 0;
    for (const decal of this.decals) decal.life = 0;
    this.clearDynamic(this.actorBatches);
    const info = arena.info, overcast = info.weather === 'overcast';
    this.scene.fog = new THREE.Fog(this.color.setRGB(...info.fog, THREE.SRGBColorSpace).clone(), 45, 155);
    this.sun.color.setHex(overcast ? 0xd6e4ef : 0xffefd8); this.sun.intensity = overcast ? 1.8 : 3.1;
    this.hemi.intensity = overcast ? 1.65 : 1.35;
    this.lightPositions = arena.decor.filter(p => p.emissive > .5 && p.y > 1 && p.surface === 'white')
      .map(p => ({ x: p.x, y: p.y - .25, z: p.z }));
    if (this.loaded) this.buildWorld();
  }

  partMatrix(p, target = this.matrix) {
    compose(this.rawMatrix, p.x, p.y, p.z, p.w, p.h, p.d, p.yaw ?? 0, p.pitch ?? 0, p.roll ?? 0);
    target.fromArray(this.rawMatrix); return target;
  }

  partMaterial(p) {
    let data = this.partData.get(p);
    if (!data) { const m = material(p); data = { ...m, finishTile: p.finishTile, keys: Object.create(null), bindings: Object.create(null) }; this.partData.set(p, data); }
    return data;
  }

  materialKey(p, category) {
    const m = this.partMaterial(p);
    return m.keys[category] ?? (m.keys[category] = `${category}/${m.pattern}/${category === 'weapon' ? m.finishTile ?? -1 : -1}/${Math.round(m.rough * 10) / 10}/${Math.round(m.metal * 10) / 10}/${m.emissive > 0 ? m.emissive : 0}/${p.surface === 'glass' ? 1 : 0}`);
  }

  makeMaterial(p, category) {
    const key = this.materialKey(p, category);
    if (this.materials.has(key)) return this.materials.get(key);
    const m = this.partMaterial(p), leaf = p.leaf !== undefined, tile = Math.round(m.pattern - 1);
    const finish = category === 'weapon' && Number.isInteger(m.finishTile) ? this.weaponMaps?.[m.finishTile] : null;
    const maps = finish ?? (!leaf && tile >= 0 ? this.surfaceMaps[tile] : null);
    const options = { color: 0xffffff, roughness: clamp(m.rough, .14, 1), metalness: clamp(m.metal, 0, 1),
      map: leaf ? this.leafMaps[p.leaf] : maps?.map ?? null, normalMap: maps?.normal ?? null,
      roughnessMap: maps?.roughness ?? null, normalScale: new THREE.Vector2(category === 'weapon' ? .19 : .38,
        category === 'weapon' ? .19 : .38), envMapIntensity: category === 'weapon' ? 1.15 : .65 };
    if (leaf) Object.assign(options, { side: THREE.DoubleSide, alphaTest: .58, metalness: 0, roughness: 1 });
    if (m.emissive > 0) Object.assign(options, { emissive: 0xffffff, emissiveIntensity: m.emissive * .7 });
    const mat = p.surface === 'glass' ? new THREE.MeshPhysicalMaterial({ ...options, clearcoat: .9,
      clearcoatRoughness: .08, roughness: .14, metalness: .25 }) : new THREE.MeshStandardMaterial(options);
    // Per-instance dimensions give architecture a consistent material scale.
    if (!leaf && maps && (category === 'world' || finish)) {
      mat.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          #ifdef USE_INSTANCING
          vec3 dims=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
          vec3 axis=abs(normal); vec2 repeats=axis.y>.7?dims.xz:(axis.x>.7?dims.zy:dims.xy);
          repeats=max(vec2(${category === 'weapon' ? '.2' : '.18'}),repeats*${category === 'weapon' ? '18.0' : '.7'});
          #ifdef USE_MAP
          vMapUv*=repeats;
          #endif
          #ifdef USE_NORMALMAP
          vNormalMapUv*=repeats;
          #endif
          #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv*=repeats;
          #endif
          #endif`);
      };
      mat.customProgramCacheKey = () => category === 'weapon' ? 'weapon-finish-uv-v2' : 'world-scaled-uv-v2';
    }
    if (leaf) {
      this.patchWind(mat);
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking,
        map: this.leafMaps[p.leaf], alphaTest: .58, side: THREE.DoubleSide });
      this.patchWind(depth); this.depthMaterials.set(key, depth);
    }
    this.materials.set(key, mat); return mat;
  }

  patchWind(mat) {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uBreachWind = this.windTime;
      shader.vertexShader = `uniform float uBreachWind;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float phase=uBreachWind*1.4+instanceMatrix[3].x*.6+instanceMatrix[3].z*.45;
        float sway=pow(max(position.y+.5,0.0),2.0)*.045;
        transformed.x+=sin(phase)*sway; transformed.z+=cos(phase*.79)*sway;
        #endif`);
    };
    mat.customProgramCacheKey = () => 'foliage-wind-v1';
  }

  instanceColor(p, category, override) {
    const m = this.partMaterial(p), c = override ?? p.color ?? m.color;
    // Architectural textures contain their own albedo; retain a light tint rather than multiplying it twice.
    if (category === 'weapon' && m.finishTile >= 0) return this.color.setRGB(
      .14 + c[0] * .86, .14 + c[1] * .86, .14 + c[2] * .86, THREE.SRGBColorSpace);
    const brighten = category === 'world' && m.pattern > 0 && !p.color;
    return this.color.setRGB(brighten ? .55 + c[0] * .45 : c[0],
      brighten ? .55 + c[1] * .45 : c[1], brighten ? .55 + c[2] * .45 : c[2], THREE.SRGBColorSpace);
  }

  buildWorld() {
    for (const batch of this.worldBatches) { this.world.remove(batch); batch.dispose(); }
    this.worldBatches.length = 0;
    const bins = new Map();
    for (const list of [this.arena.blocks, this.arena.decor, this.arena.foliage ?? []]) for (const p of list) {
      if (p.destroyed || p.invisible) continue;
      const mesh = p.mesh ?? 'cube', materialKey = this.materialKey(p, 'world');
      const chunk = p.ground ? 'ground' : `${Math.floor(p.x / 32)}/${Math.floor(p.z / 32)}`;
      const key = `${chunk}/${mesh}/${materialKey}`;
      if (!bins.has(key)) bins.set(key, []); bins.get(key).push(p);
    }
    for (const parts of bins.values()) {
      const p = parts[0], leaf = p.leaf !== undefined;
      const batch = new THREE.InstancedMesh(this.partGeometry(p, 'world'),
        this.makeMaterial(p, 'world'), parts.length);
      for (let i = 0; i < parts.length; i++) { batch.setMatrixAt(i, this.partMatrix(parts[i]));
        batch.setColorAt(i, this.instanceColor(parts[i], 'world')); }
      batch.instanceMatrix.needsUpdate = true; if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
      // Tiny decorative strips do not warrant another shadow-caster draw call.
      batch.castShadow = !p.ground && parts.some(q => Math.max(q.w, q.h, q.d) > .6); batch.receiveShadow = true;
      batch.userData.leaf = leaf; batch.userData.parts = parts; batch.userData.fullCount = parts.length;
      if (leaf) batch.customDepthMaterial = this.depthMaterials.get(this.materialKey(p, 'world'));
      batch.computeBoundingBox(); batch.computeBoundingSphere();
      this.world.add(batch); this.worldBatches.push(batch);
    }
    this.applyQuality(true); this.shadowClock = 1;
  }

  refreshDestroyed() {
    // Explosions update only affected prop instances; do not rebuild a whole map.
    for(const batch of this.worldBatches){const parts=batch.userData.parts;
      if(!parts||!parts.some(p=>p.destroyed&&!p.renderDestroyed))continue;
      let count=0;
      for(const p of parts){if(p.destroyed){p.renderDestroyed=true;continue;}batch.setMatrixAt(count,this.partMatrix(p));batch.setColorAt(count,this.instanceColor(p,'world'));count++;}
      batch.count=count;batch.userData.fullCount=count;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
      batch.computeBoundingSphere();batch.computeBoundingBox();
    }
    this.shadowClock=1;
  }

  partGeometry(p, category) {
    if (p.mesh === 'bevel') {
      const simpler = category === 'actor' ? this.geometry.bevelActor : category === 'world' ? this.geometry.bevelWorld : null;
      if (simpler) return simpler;
    }
    return this.geometry[p.mesh ?? 'cube'] ?? this.geometry.cube;
  }

  clearDynamic(map) {
    for (const entry of map.values()) { entry.alive = false; entry.mesh.parent?.remove(entry.mesh); entry.mesh.dispose(); }
    map.clear();
  }
  resetDynamic(map) { for (const entry of map.values()) { entry.used = 0; entry.matrixDirty = false; entry.colorDirty = false; } }

  addDynamic(map, group, p, category, parent, color) {
    const data = this.partMaterial(p);
    let binding = data.bindings?.[category], entry = binding?.entry;
    if (!entry?.alive || binding.map !== map) {
      const key = `${p.mesh ?? 'cube'}/${this.materialKey(p, category)}`;
      entry = map.get(key);
      if (!entry) {
        const capacity = 64;
        const mesh = new THREE.InstancedMesh(this.partGeometry(p, category), this.makeMaterial(p, category), capacity);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
        mesh.castShadow = category === 'actor'; mesh.receiveShadow = category === 'actor';
        group.add(mesh); entry = { mesh, used: 0, capacity, alive: true, version: 0, matrixDirty: false, colorDirty: false, slots: [] };
        map.set(key, entry);
      }
      binding = { map, entry, slot: -1, version: -1, matrix: new THREE.Matrix4(), pose: new Float64Array(9).fill(NaN), color: new THREE.Color(-1,-1,-1) };
      (data.bindings ?? (data.bindings = Object.create(null)))[category] = binding;
    }
    if (entry.used >= entry.capacity) {
      const old = entry.mesh, capacity = entry.capacity * 2;
      const mesh = new THREE.InstancedMesh(old.geometry, old.material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      if (old.instanceColor) { mesh.setColorAt(0, this.color); mesh.instanceColor.array.set(old.instanceColor.array); }
      mesh.frustumCulled = old.frustumCulled; mesh.castShadow = old.castShadow; mesh.receiveShadow = old.receiveShadow;
      group.remove(old); old.dispose(); group.add(mesh); entry.mesh = mesh; entry.capacity = capacity; entry.version++;
    }
    const pose = binding.pose, yaw = p.yaw ?? 0, pitch = p.pitch ?? 0, roll = p.roll ?? 0;
    const moved = pose[0] !== p.x || pose[1] !== p.y || pose[2] !== p.z || pose[3] !== p.w || pose[4] !== p.h || pose[5] !== p.d || pose[6] !== yaw || pose[7] !== pitch || pose[8] !== roll;
    if (moved) {
      this.partMatrix(p, binding.matrix);
      pose[0]=p.x; pose[1]=p.y; pose[2]=p.z; pose[3]=p.w; pose[4]=p.h; pose[5]=p.d; pose[6]=yaw; pose[7]=pitch; pose[8]=roll;
    }
    const slotChanged = entry.slots[entry.used] !== p || binding.slot !== entry.used || binding.version !== entry.version;
    if (parent || moved || slotChanged) {
      if (parent) this.matrix.multiplyMatrices(parent, binding.matrix); else this.matrix.copy(binding.matrix);
      entry.mesh.setMatrixAt(entry.used, this.matrix); entry.matrixDirty = true;
    }
    const tint = this.instanceColor(p, category, color);
    if (slotChanged || !binding.color.equals(tint)) {
      entry.mesh.setColorAt(entry.used, tint); binding.color.copy(tint); entry.colorDirty = true;
    }
    entry.slots[entry.used] = p; binding.slot = entry.used; binding.version = entry.version; entry.used++;
  }
  uploadDynamic(map) {
    for (const entry of map.values()) {
      entry.mesh.count = entry.used;
      if (!entry.used) continue;
      if (entry.matrixDirty) {
        entry.mesh.instanceMatrix.clearUpdateRanges(); entry.mesh.instanceMatrix.addUpdateRange(0, entry.used * 16);
        entry.mesh.instanceMatrix.needsUpdate = true;
      }
      if (entry.colorDirty && entry.mesh.instanceColor) {
        entry.mesh.instanceColor.clearUpdateRanges(); entry.mesh.instanceColor.addUpdateRange(0, entry.used * 3);
        entry.mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  applyQuality(force = false) {
    const q = QUALITY[this.quality] ?? QUALITY.medium;
    if (!force && this.appliedQuality === this.quality) return;
    this.appliedQuality = this.quality; this.renderer.shadowMap.enabled = q.shadow > 0;
    if (q.shadow && this.sun.shadow.mapSize.x !== q.shadow) {
      this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(q.shadow, q.shadow); this.sun.shadow.needsUpdate = true;
    }
    for (const batch of this.worldBatches) if (batch.userData.leaf) {
      batch.count = Math.min(batch.userData.fullCount, Math.max(1, Math.floor(batch.userData.fullCount * q.foliage)));
      batch.castShadow = this.quality === 'high';
    }
    this.scene.environmentIntensity = this.quality === 'low' ? .48 : .58;
    const half = this.quality === 'high' ? 34 : 28;
    Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.shadowClock = 1;
  }

  resize() {
    const q = QUALITY[this.quality] ?? QUALITY.medium;
    const width = Math.max(2, this.canvas.clientWidth), height = Math.max(2, this.canvas.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, q.dpr) * q.scale * this.renderScale;
    const pixelWidth = Math.floor(width * ratio), pixelHeight = Math.floor(height * ratio);
    if (pixelWidth !== this.width || pixelHeight !== this.height) {
      this.width = pixelWidth; this.height = pixelHeight;
      this.renderer.setPixelRatio(1); this.renderer.setSize(pixelWidth, pixelHeight, false);
    }
    return width / height;
  }

  createEffectPool() {
    const base = new THREE.PlaneGeometry(1, 1), geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index; geometry.setAttribute('position', base.getAttribute('position'));
    geometry.setAttribute('uv', base.getAttribute('uv')); base.dispose();
    this.fxAttributes = {};
    for (const [name, size] of [['instancePosition', 3], ['instanceTint', 3], ['instanceSize', 2], ['instanceAlpha', 1], ['instanceKind', 1]]) {
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(FX_CAPACITY * size), size);
      attr.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute(name, attr); this.fxAttributes[name] = attr;
    }
    geometry.instanceCount = 0;
    const material = new THREE.ShaderMaterial({ vertexShader: billboardVertex, fragmentShader: billboardFragment,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: true });
    this.fxAttributeList = Object.values(this.fxAttributes);
    this.fxMesh = new THREE.Mesh(geometry, material); this.fxMesh.frustumCulled = false; this.fxMesh.renderOrder = 3;
    this.scene.add(this.fxMesh);
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 64;
    const c = shadowCanvas.getContext('2d'), gradient = c.createRadialGradient(32, 32, 3, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(0,0,0,.38)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas); this.textures.push(shadowTexture);
    this.contactShadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -1, toneMapped: false }), 64);
    this.contactShadows.count = 0;
    this.contactShadows.frustumCulled = false; this.contactShadows.renderOrder = 1; this.scene.add(this.contactShadows);
  }

  createMuzzle() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d'), glow = context.createRadialGradient(64, 64, 2, 64, 64, 62);
    glow.addColorStop(0, 'rgba(255,255,236,1)'); glow.addColorStop(.18, 'rgba(255,221,126,.95)');
    glow.addColorStop(.44, 'rgba(255,119,30,.4)'); glow.addColorStop(1, 'rgba(255,84,10,0)');
    context.fillStyle = glow; context.fillRect(0, 0, 128, 128);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; this.textures.push(map);
    this.muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0xffe9a9, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, transparent: true }));
    this.muzzle.visible = false; this.weaponRoot.add(this.muzzle);
  }

  particle(position, kind, color, size, life, vx = 0, vy = 0, vz = 0) {
    const effect = this.effects[this.effectCursor++ % (QUALITY[this.quality] ?? QUALITY.medium).effects];
    effect.x = position.x; effect.y = position.y; effect.z = position.z;
    effect.kind = kind; effect.r = color[0]; effect.g = color[1]; effect.b = color[2];
    effect.size = size; effect.life = effect.max = life; effect.vx = vx; effect.vy = vy; effect.vz = vz;
  }

  events(events, game) {
    for (const event of events) {
      const p = event.position ?? game.eye(game.player);
      if (event.type === 'shot') {
        if (event.source === game.player.id) {
          const aim = direction(game.player.yaw, game.player.pitch), rightX = Math.cos(game.player.yaw), rightZ = Math.sin(game.player.yaw);
          this.particle({ x: p.x + aim.x * .85, y: p.y + aim.y * .85 - .13, z: p.z + aim.z * .85 },
            0, [.43, .46, .45], .07, .42, aim.x * .45, .25, aim.z * .45);
          this.particle({ x: p.x + rightX * .23, y: p.y - .15, z: p.z + rightZ * .23 },
            3, [.63, .43, .12], .028, 1.1, rightX * 1.8, 1.2, rightZ * 1.8);
        } else if (event.end) {
          for (let i = 1; i <= 3; i++) { const t = i * .15;
            this.particle({ x: lerp(p.x, event.end.x, t), y: lerp(p.y, event.end.y, t), z: lerp(p.z, event.end.z, t) },
              2, [1.8, 1.14, .38], .025, .055); }
        }
      } else if (event.type === 'impact') {
        const steel = event.surface === 'steel' || event.surface === 'rust';
        for (let i = 0; i < Math.min(6, event.value ?? 3); i++) this.particle(p, steel ? 2 : 1,
          steel ? [2, 1.2, .3] : [.38, .32, .25], .025, .15 + Math.random() * .18,
          (Math.random() - .5) * 2.5, Math.random() * 2.2, (Math.random() - .5) * 2.5);
        this.particle(p, 0, [.42, .39, .33], .11, .6, 0, .28, 0);
        const n = event.normal ?? { x: 0, y: 1, z: 0 }, decal = this.decals[this.decalCursor++ % this.decals.length];
        decal.life = 18; decal.part = part(p.x + n.x * .012, p.y + n.y * .012, p.z + n.z * .012,
          n.x ? .008 : .065, n.y ? .008 : .065, n.z ? .008 : .065, 'rubber');
      } else if (event.type === 'blood') {
        for (let i = 0; i < Math.min(6, event.value ?? 4); i++) this.particle(p, 1, [.27, .025, .016], .035, .28,
          (Math.random() - .5) * 1.5, Math.random(), (Math.random() - .5) * 1.5);
      } else if (event.type === 'explosion') {
        this.refreshDestroyed();
        for (let i = 0; i < 30; i++) { const angle = Math.random() * 6.28, speed = Math.random() * 5;
          this.particle(p, i < 12 ? 2 : 0, i < 12 ? [2.4, .65, .08] : [.25, .24, .21],
            i < 12 ? .25 : .4, .45 + Math.random() * 1.1, Math.cos(angle) * speed, Math.random() * 4, Math.sin(angle) * speed); }
      } else if (event.type === 'flash') this.particle(p, 2, [3, 3, 2.7], .7, .12);
    }
  }

  writeBillboard(index, x, y, z, sizeX, sizeY, r, g, b, alpha, kind) {
    if (index >= FX_CAPACITY) return index;
    const a = this.fxAttributes;
    a.instancePosition.setXYZ(index, x, y, z); a.instanceTint.setXYZ(index, r, g, b);
    a.instanceSize.setXY(index, sizeX, sizeY); a.instanceAlpha.setX(index, alpha); a.instanceKind.setX(index, kind);
    return index + 1;
  }

  updateEffects(dt, game) {
    let count = 0, shadowCount = 0;
    for (const a of game.actors) if (!a.dead && a.grounded && shadowCount < 64) {
      compose(this.rawMatrix, a.x, a.y + .025, a.z, 1.15, .82, 1, 0, -Math.PI / 2, 0); this.matrix.fromArray(this.rawMatrix);
      this.contactShadows.setMatrixAt(shadowCount++, this.matrix);
    }
    this.contactShadows.count = shadowCount;
    if (shadowCount) {
      this.contactShadows.instanceMatrix.clearUpdateRanges();
      this.contactShadows.instanceMatrix.addUpdateRange(0, shadowCount * 16);
      this.contactShadows.instanceMatrix.needsUpdate = true;
    }
    for (const e of this.effects) {
      if (e.life <= 0) continue;
      e.life -= dt; if (e.life <= 0) continue;
      e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
      if (e.kind > .5) e.vy -= dt * 8;
      if (e.y < .025) { e.y = .025; e.vy = 0; e.vx *= .8; e.vz *= .8; }
      const age = 1 - e.life / e.max, soft = e.kind < .5;
      const size = e.size * (soft ? 2 + age * 4 : 2);
      count = this.writeBillboard(count, e.x, e.y, e.z, size, e.kind === 3 ? size * .35 : size,
        e.r, e.g, e.b, Math.min(1, e.life * 7) * (soft ? .28 : 1), e.kind);
    }
    for (const smoke of game.smokes) {
      const radius = Math.min(5.2, smoke.age * 4), alpha = Math.min(.8, smoke.age) * clamp((16 - smoke.age) / 3, 0, 1);
      const layers = (QUALITY[this.quality] ?? QUALITY.medium).smokeLayers;
      // Match eight layers' total opacity with fewer overlapping fragments.
      const opacity = 1 - Math.pow(1 - alpha, 8 / layers);
      for (let i = 0; i < layers; i++) { const angle = i * 2.399 + smoke.age * .07;
        count = this.writeBillboard(count, smoke.x + Math.sin(angle) * radius * .34,
          smoke.y + 1.25 + i % 3 * .48, smoke.z + Math.cos(angle) * radius * .34,
          radius * 1.7, 3.7, .38, .41, .40, opacity, 0); }
    }
    this.fxMesh.geometry.instanceCount = count;
    if (count) for (const attr of this.fxAttributeList) {
      attr.clearUpdateRanges(); attr.addUpdateRange(0, count * attr.itemSize); attr.needsUpdate = true;
    }
    for (const decal of this.decals) if (decal.life > 0) { decal.life -= dt;
      if (decal.life > 0) this.addDynamic(this.actorBatches, this.scene, decal.part, 'actor'); }
    for (const grenade of game.grenades) {
      const model = grenade.renderPart ?? (grenade.renderPart = part(0, 0, 0, .13, .17, .13, 'green', { mesh: 'sphere' }));
      model.x = grenade.x; model.y = grenade.y; model.z = grenade.z;
      this.addDynamic(this.actorBatches, this.scene, model, 'actor');
    }
  }

  updateActors(game) {
    this.resetDynamic(this.actorBatches);
    const player = game.player, range = (QUALITY[this.quality] ?? QUALITY.medium).range;
    for (const a of game.actors) {
      const actorDistance = distance(a, player);
      if (a.id === player.id || actorDistance > range) continue;
      if (this.frustum && actorDistance > 12) {
        this.actorBounds.center.set(a.x, a.y + .9, a.z);
        if (!this.frustum.intersectsSphere(this.actorBounds)) continue;
      }
      const distant = actorDistance > (this.quality === 'low' ? 24 : 38);
      const death = a.dead ? Math.min(1, (3 - a.respawnLeft) * 2) : 0;
      if (a.dead && death >= 1) continue;
      compose(this.rawMatrix, a.x, a.y + death * .2, a.z, 1, 1, 1, -a.yaw, 0, death * 1.5); this.parentMatrix.fromArray(this.rawMatrix);
      const identity = identityFor(a, player, game.rules), parts = actorModel(a, game.time, identity);
      for (let i = 0; i < parts.length; i++) {
        if (distant && !FAR_ACTOR_PARTS.has(i)) continue;
        const q = parts[i]; let color;
        // Navy/cyan versus warm charcoal/crimson is stable after sides switch and in FFA.
        if (q.surface === 'fabric') color = identity.cloth;
        if (q.surface === 'white' || q.teamBand) color = identity.band;
        this.addDynamic(this.actorBatches, this.scene, q, 'actor', this.parentMatrix, color);
      }
      // Visible identifiers on both arms and front/back vest; no through-wall outlines.
      const identifiers = a.renderIdentifiers ?? (a.renderIdentifiers = [
        part(-.30, 1.31, -.07, .06, .105, .21, 'white', { tile: -1 }),
        part(.30, 1.31, -.07, .06, .105, .21, 'white', { tile: -1 }),
        part(0, 1.18, -.225, .25, .075, .012, 'white', { tile: -1 }),
        part(0, 1.18, .258, .25, .075, .012, 'white', { tile: -1 })]);
      for (let i = 0; i < identifiers.length; i++) { const q = identifiers[i];
        q.y = (i < 2 ? 1.31 : 1.18) - (a.crouched ? .5 : 0);
        this.addDynamic(this.actorBatches, this.scene, q, 'actor', this.parentMatrix, identity.band);
      }
    }
    const rules = game.rules, id = rules.mode.id;
    if (['domination', 'sabotage', 'hardpoint'].includes(id)) for (let i = 0; i < rules.points.length; i++) {
      if (id === 'sabotage' && i === 1 || id === 'hardpoint' && i !== rules.activePoint) continue;
      const point = rules.points[i], color = point.owner === player.team ? FRIEND : point.owner >= 0 ? ENEMY : [.8, .72, .38];
      const parts = point.renderParts ?? (point.renderParts = [
        part(point.x, point.y+.035, point.z, 4.7, .025, 4.7, 'dark', { mesh: 'tube', tile: -1, emissive: .18 }),
        part(point.x, point.y+1, point.z, .04, 2, .04, 'steel'),
        part(point.x + .3, point.y+1.65, point.z, .6, .38, .025, 'white', { tile: -1, emissive: .1 })]);
      for (let j = 0; j < parts.length; j++) this.addDynamic(this.actorBatches, this.scene, parts[j], 'actor', null, j === 1 ? undefined : color);
    }
    for (const tag of rules.tags ?? []) {
      const color = tag.team === player.team ? FRIEND : ENEMY;
      const q = tag.renderPart ?? (tag.renderPart = part(tag.x, tag.y, tag.z, .23, .34, .045, 'steel',
        { mesh: 'bevel', tile: -1, emissive: .35 }));
      q.y = tag.y + .55 + Math.sin(game.time * 3 + tag.id) * .07; q.yaw = game.time;
      this.addDynamic(this.actorBatches, this.scene, q, 'actor', null, color);
    }
  }

  updateLighting(dt) {
    const eye = this.eye, sun = this.arena.info.sun;
    const sx = sun[0] * 65, sy = 58, sz = sun[2] * 65, length = Math.hypot(sx, sy, sz), horizontal = Math.hypot(sx, sz) || 1;
    const dx = sx / length, dy = sy / length, dz = sz / length;
    const rx = sz / horizontal, rz = -sx / horizontal, ux = dy * rz, uy = dz * rx - dx * rz, uz = -dy * rx;
    const texel = (this.sun.shadow.camera.right - this.sun.shadow.camera.left) / this.sun.shadow.mapSize.x;
    const u = Math.round((eye.x * rx + eye.z * rz) / texel) * texel;
    const v = Math.round((eye.x * ux + eye.z * uz) / texel) * texel, depth = eye.x * dx + eye.z * dz;
    const cx = rx * u + ux * v + dx * depth, cy = uy * v + dy * depth, cz = rz * u + uz * v + dz * depth;
    this.sun.position.set(cx + sx, cy + sy, cz + sz); this.sun.target.position.set(cx, cy, cz);
    // Three unshadowed bulbs at most, selected from authored interior fixtures at 5 Hz.
    this.lightClock = (this.lightClock ?? 0) - dt;
    if (this.lightClock <= 0) {
      this.lightClock = .2;
      const nearest = this.nearestLights, distances = this.lightDistances;
      nearest.fill(null); distances.fill(32 * 32);
      for (const p of this.lightPositions ?? []) { const d = (p.x - eye.x) ** 2 + (p.z - eye.z) ** 2;
        for (let i = 0; i < 3; i++) if (d < distances[i]) {
          for (let j = 2; j > i; j--) { distances[j] = distances[j - 1]; nearest[j] = nearest[j - 1]; }
          distances[i] = d; nearest[i] = p; break;
        }
      }
      for (let i = 0; i < this.interiorLights.length; i++) {
        const light = this.interiorLights[i], selected = nearest[i];
        light.intensity = selected && this.quality !== 'low' ? 17 : 0;
        if (selected) light.position.set(selected.x, selected.y, selected.z);
      }
    }
    const inside = this.arena.indoors(eye);
    // Rotate view-model sunlight with the player's heading, so the gun belongs
    // to the world instead of wearing a camera-fixed studio highlight.
    this.target.set(this.sun.position.x - this.sun.target.position.x, 58, this.sun.position.z - this.sun.target.position.z);
    this.target.transformDirection(this.camera.matrixWorldInverse);
    this.weaponKeyLight.position.copy(this.target).multiplyScalar(5);
    this.weaponScene.environmentIntensity = lerp(this.weaponScene.environmentIntensity, inside ? .34 : .85, clamp(dt * 5, 0, 1));
    this.weaponFill.intensity = lerp(this.weaponFill.intensity, inside ? .95 : 1.75, clamp(dt * 5, 0, 1));
    this.weaponKeyLight.intensity = lerp(this.weaponKeyLight.intensity, inside ? 1.6 : 3.4, clamp(dt * 5, 0, 1));
    this.shadowClock += dt;
    const q = QUALITY[this.quality] ?? QUALITY.medium;
    if (q.shadowHz && this.shadowClock >= 1 / q.shadowHz) {
      this.shadowClock = 0; this.renderer.shadowMap.needsUpdate = true; this.sun.shadow.needsUpdate = true;
    }
  }

  renderWeapon(game, aspect, menu) {
    const p = game.player, w = p.weapon;
    const key = `${w.def.id}/${w.optic}/${w.barrel}/${w.grip}`;
    if (key !== this.weaponKey) {
      this.weaponKey = key; this.weaponParts = weaponModel(w); this.clearDynamic(this.weaponBatches);
    }
    animateWeaponParts(this.weaponParts, w, p, game.time);
    this.resetDynamic(this.weaponBatches);
    for (const q of this.weaponParts) if (!q.hidden) this.addDynamic(this.weaponBatches, this.weaponRoot, q, 'weapon');
    this.uploadDynamic(this.weaponBatches);
    const pose = weaponPose(p, game.time, this.settings.motion !== false, menu, this.weaponPoseState ?? (this.weaponPoseState = {}));
    this.weaponRoot.position.set(pose.x, pose.y, pose.z);
    this.weaponRoot.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ'); this.weaponRoot.scale.setScalar(pose.scale);
    const muzzle = this.weaponParts.muzzle;
    this.muzzle.position.set(muzzle.x, muzzle.y, muzzle.z);
    this.muzzle.visible = !menu && w.sinceShot < .045 && w.def.id !== 12 && w.barrel !== 1;
    const flashScale = w.def.kind === 'SHOTGUN' ? .23 : w.def.kind === 'PISTOL' ? .10 : .16;
    this.muzzle.scale.set(flashScale, flashScale, 1); this.muzzle.material.rotation = (w.shotIndex ?? 0) * 2.4;
    this.muzzleLight.intensity = this.muzzle.visible ? .9 : 0;
    this.muzzleLight.position.copy(this.muzzle.position); this.weaponRoot.localToWorld(this.muzzleLight.position);
    this.weaponCamera.aspect = aspect; this.weaponCamera.updateProjectionMatrix();
    this.renderer.clearDepth(); this.renderer.render(this.weaponScene, this.weaponCamera);
  }

  render(game, dt, menu = false, elapsed = dt) {
    if (this.lost || !this.loaded) return;
    this.frames++; this.lastFPS += elapsed;
    if (this.lastFPS >= .6) { this.fps = Math.round(this.frames / this.lastFPS); this.frames = 0; this.lastFPS = 0; }
    if (!menu && !game.paused && game.rules.phase === 'playing') {
      this.frameAverage = lerp(this.frameAverage, Math.min(200, elapsed * 1000), .025);
      this.slowTime = this.frameAverage > 21 ? this.slowTime + elapsed : Math.max(0, this.slowTime - dt);
      this.fastTime = this.frameAverage < 17.4 ? this.fastTime + elapsed : 0;
      if (this.slowTime > 4) { this.renderScale = Math.max(.6, this.renderScale - .1);
        if (this.renderScale <= .7) this.quality = this.quality === 'high' ? 'medium' : 'low'; this.slowTime = 0; }
      if (this.fastTime > 15 && this.renderScale < 1) { this.renderScale = Math.min(1, this.renderScale + .05); this.fastTime = 0; }
    }
    this.applyQuality(); const aspect = this.resize(), p = game.player;
    let yaw = p.yaw, pitch = p.pitch, fov;
    if (menu) {
      const t = game.time * .04; this.eye.x = 15 + Math.sin(t) * 2; this.eye.y = 6.5; this.eye.z = 25;
      this.target.set(-4, 2, -8); fov = 55;
    } else {
      const eye = game.eye(p), speed = Math.hypot(p.vx, p.vz);
      const bob = this.settings.motion !== false && p.grounded ? Math.sin(game.time * speed * 2.8) * Math.min(.023, speed * .006) * (1 - p.ads) : 0;
      if (this.cameraY === null) this.cameraY = eye.y;
      this.cameraY = lerp(this.cameraY, eye.y, clamp(dt * 18, 0, 1));
      this.eye.x = eye.x; this.eye.y = lerp(this.cameraY, eye.y, p.ads) + bob - p.landKick -
        (p.dead ? Math.min(1.2, (3 - p.respawnLeft) * .9) : 0); this.eye.z = eye.z;
      pitch += this.settings.motion !== false ? p.visualKick * .10 * (1 - p.ads) : 0;
      const d = direction(yaw, pitch); this.target.set(this.eye.x + d.x, this.eye.y + d.y, this.eye.z + d.z);
      fov = verticalFov(aimFov(this.settings.fov ?? 80, p.weapon, p.ads), aspect) / RAD;
    }
    this.camera.position.set(this.eye.x, this.eye.y, this.eye.z); this.camera.lookAt(this.target);
    this.camera.fov = fov; this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.worldVP.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum?.setFromProjectionMatrix(this.worldVP);
    this.windTime.value = game.time;
    this.updateActors(game); this.updateEffects(menu || game.paused ? 0 : dt, game); this.uploadDynamic(this.actorBatches);
    this.updateLighting(dt);
    this.renderer.info.reset(); this.renderer.setRenderTarget(null); this.renderer.clear(true, true, false);
    this.renderer.render(this.scene, this.camera);
    // A magnified optic sees only the world scene. The shared HUD draws the clear reticle.
    if (!p.dead && (menu || !scopeVisible(p))) this.renderWeapon(game, aspect, menu);
    this.drawCalls = this.renderer.info.render.calls;
  }

  project(point) {
    this.projected.set(point.x, point.y, point.z, 1).applyMatrix4(this.worldVP);
    if (this.projected.w <= 0) return null;
    return { x: this.projected.x / this.projected.w * .5 + .5,
      y: .5 - this.projected.y / this.projected.w * .5 };
  }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.clearDynamic(this.actorBatches); this.clearDynamic(this.weaponBatches);
    for (const batch of this.worldBatches) batch.dispose();
    for (const geometry of Object.values(this.geometry)) geometry.dispose();
    for (const mat of this.materials.values()) mat.dispose();
    for (const mat of this.depthMaterials.values()) mat.dispose();
    for (const texture of this.textures) texture.dispose();
    this.fxMesh.geometry.dispose(); this.fxMesh.material.dispose();
    this.contactShadows.geometry.dispose(); this.contactShadows.material.dispose(); this.contactShadows.dispose();
    this.muzzle.material.dispose(); this.environment?.dispose(); this.sun.shadow.map?.dispose(); this.renderer.dispose();
  }
}
