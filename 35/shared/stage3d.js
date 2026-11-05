import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Sky } from './vendor/Sky.js';

// 하늘이 있는 큰 지형 장면의 렌더러, 빛, 필요할 때만 그리기를 맡는다.
export function createStage({ mount, size, fogDensity, pixelRatio, shadowSize }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x9fb8d2, fogDensity);
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 8, 90000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 150;
  controls.maxDistance = 20000;

  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 27), THREE.MathUtils.degToRad(-128));
  const sky = new Sky();
  sky.scale.setScalar(80000);
  sky.material.uniforms.turbidity.value = 5.5;
  sky.material.uniforms.rayleigh.value = 1.6;
  sky.material.uniforms.mieCoefficient.value = 0.006;
  sky.material.uniforms.mieDirectionalG.value = 0.8;
  sky.material.uniforms.sunPosition.value.copy(sun);
  scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(sky.clone());
  scene.environment = pm.fromScene(skyScene, 0, 1, 100000).texture;
  scene.environmentIntensity = 0.38;

  const light = new THREE.DirectionalLight(0xfff0dc, 3.3);
  light.position.copy(sun).multiplyScalar(6000);
  light.castShadow = true;
  light.shadow.mapSize.setScalar(shadowSize);
  const e = size * 0.72;
  Object.assign(light.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 100, far: 16000 });
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 3;
  scene.add(light);

  let dirty = true;
  const invalidate = () => { dirty = true; };
  controls.addEventListener('change', invalidate);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    invalidate();
  });
  // 바뀐 것이 있을 때만 그린다. afterRender는 이름표처럼 화면을 따라가는 것을 옮긴다.
  const startLoop = afterRender => {
    (function loop() {
      requestAnimationFrame(loop);
      if (!dirty) return;
      dirty = false;
      renderer.render(scene, camera);
      afterRender?.();
    })();
  };
  return { renderer, scene, camera, controls, invalidate, startLoop };
}
