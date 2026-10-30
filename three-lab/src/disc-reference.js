import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { gsap } from "gsap";
import "./styles.css";

// 第一版光盘实验，保留作几何与阻尼逻辑参考。
const SETTINGS = {
  background: 0xf4f1e9,
  discRadius: 1,
  discThickness: 0.035,
  holeRadius: 0.13,
  hubRadius: 0.25,
  restRotationX: -0.32,
  restRotationY: -0.52,
  followSpeed: 7.5,
  dragSpeed: 0.008,
  cameraZ: 5.2,
  desktopPixelRatioCap: 2,
  mobilePixelRatioCap: 1.5,
};

const PROJECTS = [
  {
    title: "INTELLIGENT SPACE",
    type: "AI PRODUCT / INTERACTION SYSTEM",
    number: "01 / 03",
    background: "#c7b36f",
    accent: "#3d432f",
    eyebrow: "A PRODUCT FOR CLEAR DECISIONS",
  },
  {
    title: "QUIET COMPUTING",
    type: "AI ASSISTANT / HUMAN CONTROL",
    number: "02 / 03",
    background: "#bc684e",
    accent: "#f0dfca",
    eyebrow: "SOFTWARE THAT KNOWS WHEN TO STOP",
  },
  {
    title: "DECISION FIELD",
    type: "RESEARCH / VISUAL SYSTEM",
    number: "03 / 03",
    background: "#243e39",
    accent: "#e6d8b9",
    eyebrow: "MAKE THE TRADE-OFF VISIBLE",
  },
];

const gallery = document.querySelector("#disc-gallery");
const canvasHost = document.querySelector("#canvas-host");
const projectTitle = document.querySelector("#project-title");
const projectType = document.querySelector("#project-type");
const projectNumber = document.querySelector("#project-number");
const liveStatus = document.querySelector("#live-status");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const isMobileQuery = window.matchMedia("(max-width: 640px)");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(0, 0, SETTINGS.cameraZ);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(SETTINGS.background, 0);
canvasHost.appendChild(renderer.domElement);

RectAreaLightUniformsLib.init();

const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff7e5, 3.4);
keyLight.position.set(3.5, 5, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x94baff, 2.4);
rimLight.position.set(-4, -1, 2);
scene.add(rimLight);

const topLight = new THREE.RectAreaLight(0xffffff, 8, 5, 0.6);
topLight.position.set(0, 3.5, 3);
topLight.lookAt(0, 0, 0);
scene.add(topLight);

function createEnvironment(rendererInstance) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#f8f7f3");
  gradient.addColorStop(0.42, "#74787e");
  gradient.addColorStop(0.56, "#0e0f11");
  gradient.addColorStop(1, "#dad7ce");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);

  context.fillStyle = "rgba(255,255,255,0.95)";
  context.fillRect(90, 45, 330, 34);
  context.fillRect(620, 82, 245, 18);
  context.fillStyle = "rgba(120,170,255,0.5)";
  context.fillRect(700, 370, 260, 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(rendererInstance);
  const target = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return target;
}

const environmentTarget = createEnvironment(renderer);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = 1.1;
scene.fog = new THREE.Fog(SETTINGS.background, 7, 12);

const introRoot = new THREE.Group();
const discMount = new THREE.Group();
const discRig = new THREE.Group();
introRoot.add(discMount);
discMount.add(discRig);
scene.add(introRoot);

function remapRingUV(geometry) {
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  for (let index = 0; index < positions.count; index += 1) {
    uvs.setXY(
      index,
      positions.getX(index) * 0.5 + 0.5,
      positions.getY(index) * 0.5 + 0.5,
    );
  }

  uvs.needsUpdate = true;
}

function makeArtwork(project) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  const background = context.createRadialGradient(512, 512, 30, 512, 512, 740);
  background.addColorStop(0, project.background);
  background.addColorStop(0.58, project.background);
  background.addColorStop(1, "#24241f");
  context.fillStyle = background;
  context.fillRect(0, 0, 1024, 1024);

  context.save();
  context.translate(512, 512);
  context.rotate(-0.24);
  context.strokeStyle = project.accent;
  context.globalAlpha = 0.32;
  context.lineWidth = 2;

  for (let radius = 260; radius <= 780; radius += 54) {
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }

  for (let index = 0; index < 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2;
    context.beginPath();
    context.moveTo(Math.cos(angle) * 265, Math.sin(angle) * 265);
    context.lineTo(Math.cos(angle) * 780, Math.sin(angle) * 780);
    context.stroke();
  }
  context.restore();

  context.fillStyle = project.accent;
  context.font = "600 31px Arial";
  context.letterSpacing = "8px";
  context.fillText(project.eyebrow, 118, 220);

  context.font = "400 108px Georgia";
  context.letterSpacing = "-8px";
  const words = project.title.split(" ");
  words.forEach((word, index) => {
    context.fillText(word, 168, 690 + index * 112);
  });

  context.strokeStyle = project.accent;
  context.globalAlpha = 0.52;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(168, 908);
  context.lineTo(820, 908);
  context.stroke();
  context.globalAlpha = 1;

  context.font = "500 22px Arial";
  context.fillText("A PERSONAL ARCHIVE OF INTELLIGENT INTERFACES", 168, 945);
  context.font = "400 18px Arial";
  context.fillText("THREE.JS STUDY / 2026 / VOL. 01", 168, 976);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const frontGeometry = new THREE.RingGeometry(
  SETTINGS.hubRadius,
  SETTINGS.discRadius,
  256,
  1,
);
remapRingUV(frontGeometry);

const backGeometry = frontGeometry.clone();
const artworkTexture = makeArtwork(PROJECTS[0]);
const frontMaterial = new THREE.MeshPhysicalMaterial({
  map: artworkTexture,
  roughness: 0.3,
  metalness: 0.08,
  clearcoat: 0.8,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.1,
  side: THREE.DoubleSide,
});
const backMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc7cbd0,
  roughness: 0.22,
  metalness: 0.72,
  clearcoat: 0.7,
  clearcoatRoughness: 0.12,
  iridescence: 0.34,
  iridescenceIOR: 1.4,
  envMapIntensity: 1.5,
  side: THREE.DoubleSide,
});
const edgeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe5e4df,
  roughness: 0.08,
  metalness: 0.72,
  clearcoat: 0.7,
  envMapIntensity: 1.7,
  side: THREE.DoubleSide,
});

const front = new THREE.Mesh(frontGeometry, frontMaterial);
front.position.z = SETTINGS.discThickness / 2 + 0.001;

const back = new THREE.Mesh(backGeometry, backMaterial);
back.position.z = -SETTINGS.discThickness / 2 - 0.001;
back.rotation.y = Math.PI;

const edge = new THREE.Mesh(
  new THREE.CylinderGeometry(
    SETTINGS.discRadius,
    SETTINGS.discRadius,
    SETTINGS.discThickness,
    180,
    1,
    true,
  ),
  edgeMaterial,
);
edge.rotation.x = Math.PI / 2;

const hubMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf7f6f0,
  roughness: 0.2,
  metalness: 0,
  transmission: 0.35,
  thickness: 0.07,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  transparent: true,
  side: THREE.DoubleSide,
});

const hubGeometry = new THREE.RingGeometry(
  SETTINGS.holeRadius,
  SETTINGS.hubRadius,
  180,
  1,
);
const hubFront = new THREE.Mesh(hubGeometry, hubMaterial);
hubFront.position.z = SETTINGS.discThickness / 2 + 0.002;
const hubBack = hubFront.clone();
hubBack.position.z = -SETTINGS.discThickness / 2 - 0.002;
hubBack.rotation.y = Math.PI;

const hubWall = new THREE.Mesh(
  new THREE.CylinderGeometry(
    SETTINGS.hubRadius,
    SETTINGS.hubRadius,
    SETTINGS.discThickness * 1.1,
    128,
    1,
    true,
  ),
  edgeMaterial,
);
hubWall.rotation.x = Math.PI / 2;

discRig.add(front, back, edge, hubFront, hubBack, hubWall);
discRig.rotation.set(SETTINGS.restRotationX, SETTINGS.restRotationY, -0.1);

const motion = {
  x: SETTINGS.restRotationX,
  y: SETTINGS.restRotationY,
  targetX: SETTINGS.restRotationX,
  targetY: SETTINGS.restRotationY,
  velocityX: 0,
  velocityY: 0,
  dragging: false,
  pointerX: 0,
  pointerY: 0,
  lastX: 0,
  lastY: 0,
  downX: 0,
  downY: 0,
  flipped: false,
  projectIndex: 0,
  spinOffset: 0,
};

let activeTimeline = null;
let wheelAmount = 0;
let wheelLastTime = 0;
let lastFrame = performance.now();
let isVisible = true;
let isPageVisible = document.visibilityState === "visible";

function setProject(index) {
  motion.projectIndex = (index + PROJECTS.length) % PROJECTS.length;
  motion.flipped = false;
  motion.targetX = SETTINGS.restRotationX;
  motion.targetY = SETTINGS.restRotationY;
  motion.velocityX = 0;
  motion.velocityY = 0;
  const project = PROJECTS[motion.projectIndex];
  const previousTexture = frontMaterial.map;
  frontMaterial.map = makeArtwork(project);
  frontMaterial.needsUpdate = true;
  previousTexture?.dispose();

  projectTitle.textContent = project.title;
  projectType.textContent = project.type;
  projectNumber.textContent = project.number;
  liveStatus.textContent = `正在显示 ${project.title}`;
}

function changeProject(direction) {
  if (activeTimeline) {
    return;
  }

  const nextIndex = motion.projectIndex + direction;
  const duration = reducedMotionQuery.matches ? 0 : 0.2;
  activeTimeline = gsap
    .timeline({
      onComplete: () => {
        activeTimeline = null;
      },
    })
    .to(discMount.scale, {
      x: 0.78,
      y: 0.78,
      duration,
      ease: "power2.in",
    })
    .to(discMount.rotation, {
      y: direction * 0.18,
      duration,
      ease: "power2.in",
    })
    .call(() => setProject(nextIndex))
    .to(discMount.scale, {
      x: 1,
      y: 1,
      duration: duration ? 0.48 : 0,
      ease: "back.out(1.7)",
    })
    .to(
      discMount.rotation,
      {
        y: 0,
        duration: duration ? 0.55 : 0,
        ease: "expo.out",
      },
      "-=0.42",
    );
}

function flipDisc() {
  motion.flipped = !motion.flipped;
  motion.targetY = SETTINGS.restRotationY + (motion.flipped ? Math.PI : 0);
  motion.targetX = SETTINGS.restRotationX;
  liveStatus.textContent = motion.flipped ? "正在显示光盘背面" : "正在显示光盘正面";
}

function handlePointerDown(event) {
  if (event.target.closest("button")) {
    return;
  }

  motion.dragging = true;
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;
  motion.downX = event.clientX;
  motion.downY = event.clientY;
  motion.velocityX = 0;
  motion.velocityY = 0;
  gallery.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  const bounds = gallery.getBoundingClientRect();
  motion.pointerX = (event.clientX / bounds.width) * 2 - 1;
  motion.pointerY = (event.clientY / bounds.height) * 2 - 1;

  if (!motion.dragging) {
    return;
  }

  const deltaX = event.clientX - motion.lastX;
  const deltaY = event.clientY - motion.lastY;
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;
  motion.targetY += deltaX * SETTINGS.dragSpeed;
  motion.targetX += deltaY * SETTINGS.dragSpeed * 0.7;
  motion.velocityY = deltaX * SETTINGS.dragSpeed;
  motion.velocityX = deltaY * SETTINGS.dragSpeed * 0.7;
}

function handlePointerUp(event) {
  if (!motion.dragging) {
    return;
  }

  const moved = Math.hypot(
    event.clientX - motion.downX,
    event.clientY - motion.downY,
  );
  motion.dragging = false;
  gallery.releasePointerCapture?.(event.pointerId);

  if (moved < 6) {
    changeProject(1);
  }
}

function handleWheel(event) {
  if (event.ctrlKey || activeTimeline) {
    return;
  }

  event.preventDefault();
  const now = performance.now();
  if (now - wheelLastTime > 180) {
    wheelAmount = 0;
  }

  wheelLastTime = now;
  wheelAmount += event.deltaY;
  if (Math.abs(wheelAmount) > 36) {
    changeProject(wheelAmount > 0 ? 1 : -1);
    wheelAmount = 0;
  }
}

function handleKeyDown(event) {
  if (event.target.closest("button")) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    changeProject(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    changeProject(1);
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    flipDisc();
  }
}

gallery.addEventListener("pointerdown", handlePointerDown);
gallery.addEventListener("pointermove", handlePointerMove);
gallery.addEventListener("pointerup", handlePointerUp);
gallery.addEventListener("pointercancel", handlePointerUp);
gallery.addEventListener("pointerleave", () => {
  if (!motion.dragging) {
    motion.pointerX = 0;
    motion.pointerY = 0;
  }
});
gallery.addEventListener("wheel", handleWheel, { passive: false });
gallery.addEventListener("keydown", handleKeyDown);
document.querySelector("#previous").addEventListener("click", () => changeProject(-1));
document.querySelector("#next").addEventListener("click", () => changeProject(1));
document.querySelector("#flip").addEventListener("click", flipDisc);

function resize() {
  const width = canvasHost.clientWidth;
  const height = canvasHost.clientHeight;
  const mobile = isMobileQuery.matches;
  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    mobile ? SETTINGS.mobilePixelRatioCap : SETTINGS.desktopPixelRatioCap,
  );

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.fov = mobile ? 49 : 36;
  camera.position.z = mobile ? 5.9 : SETTINGS.cameraZ;
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvasHost);
resize();

const visibilityObserver = new IntersectionObserver(
  ([entry]) => {
    isVisible = entry.isIntersecting;
  },
  { rootMargin: "100px" },
);
visibilityObserver.observe(gallery);

document.addEventListener("visibilitychange", () => {
  isPageVisible = document.visibilityState === "visible";
});

function animate(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;

  if (!isVisible || !isPageVisible) {
    renderer.setAnimationLoop(animate);
    return;
  }

  if (!motion.dragging) {
    motion.targetY += motion.velocityY;
    motion.targetX += motion.velocityX;
    motion.velocityY *= 0.91;
    motion.velocityX *= 0.91;

    const hoverX = SETTINGS.restRotationX + motion.pointerY * 0.07;
    const hoverY =
      SETTINGS.restRotationY +
      (motion.flipped ? Math.PI : 0) +
      motion.pointerX * 0.14;
    motion.targetX += (hoverX - motion.targetX) * delta * 0.65;
    motion.targetY += (hoverY - motion.targetY) * delta * 0.65;
  }

  motion.x = THREE.MathUtils.damp(
    motion.x,
    motion.targetX,
    SETTINGS.followSpeed,
    delta,
  );
  motion.y = THREE.MathUtils.damp(
    motion.y,
    motion.targetY,
    SETTINGS.followSpeed,
    delta,
  );

  discRig.rotation.x = motion.x;
  discRig.rotation.y = motion.y;
  discRig.rotation.z = -0.1 + Math.sin(now * 0.00045) * 0.012;
  renderer.render(scene, camera);
}

if (!reducedMotionQuery.matches) {
  gsap.set(introRoot.position, { y: -2.4, z: -0.8 });
  gsap.set(introRoot.rotation, { z: -0.35, y: -0.5 });
  gsap
    .timeline()
    .to(introRoot.position, {
      y: 0,
      z: 0,
      duration: 1.45,
      ease: "expo.out",
    })
    .to(
      introRoot.rotation,
      {
        z: 0,
        y: 0,
        duration: 1.7,
        ease: "power3.out",
      },
      0,
    );
}

renderer.setAnimationLoop(animate);

window.addEventListener("beforeunload", () => {
  resizeObserver.disconnect();
  visibilityObserver.disconnect();
  frontMaterial.map?.dispose();
  backMaterial.dispose();
  edgeMaterial.dispose();
  hubMaterial.dispose();
  environmentTarget.dispose();
  renderer.dispose();
});
