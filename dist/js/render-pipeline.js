import * as THREE from '../vendor/three.module.min.js';

// ACES and output conversion run in the material's final pass. Native MSAA
// avoids an extra full-screen texture fetch and render target on iPhone.
export function configurePresentation(renderer){
  THREE.ColorManagement.enabled=true;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.autoClear=false;renderer.info.autoReset=false;
}
export function presentationCapabilities(gl){
  const attributes=gl?.getContextAttributes?.();
  return {backend:'WebGL2',antialias:attributes?.antialias?'MSAA':'none',postTargets:0,
    gpuTimer:!!gl?.getExtension?.('EXT_disjoint_timer_query_webgl2'),
    astc:!!gl?.getExtension?.('WEBGL_compressed_texture_astc'),
    webgpuExposed:typeof navigator!=='undefined'&&!!navigator.gpu};
}
