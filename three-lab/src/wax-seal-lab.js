import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { gsap } from "gsap";
import { makeWaxNumberMesh } from "./wax-digits.js";
import "./wax-seal-lab.css";

const host = document.querySelector("#seal-canvas");
const stage = document.querySelector("#seal-stage");
const settingsOutput = document.querySelector("#settings-output");
const resetButton = document.querySelector("#reset-controls");
const exportButton = document.querySelector("#export-seal");
const exportStatus = document.querySelector("#export-status");
const variantButtons = [...document.querySelectorAll("[data-variant]")];

const controls = {
  color: document.querySelector("#wax-color"),
  roughness: document.querySelector("#roughness"),
  clearcoat: document.querySelector("#clearcoat"),
  normal: document.querySelector("#normal-strength"),
  emboss: document.querySelector("#emboss"),
};

const outputs = {
  color: document.querySelector("#wax-color-value"),
  roughness: document.querySelector("#roughness-value"),
  clearcoat: document.querySelector("#clearcoat-value"),
  normal: document.querySelector("#normal-strength-value"),
  emboss: document.querySelector("#emboss-value"),
};

const previews = {
  color: document.querySelector("#map-preview"),
  roughness: document.querySelector("#roughness-preview"),
  normal: document.querySelector("#normal-preview"),
  height: document.querySelector("#height-preview"),
};

const VARIANTS = [
  { name: "OXBLOOD", wax: "#76271e", accent: "#e0a086" },
  { name: "CLAY", wax: "#9c4937", accent: "#efb39d" },
  { name: "FOREST", wax: "#233c32", accent: "#95b29e" },
];

const DEFAULTS = {
  roughness: 0.21,
  clearcoat: 0.81,
  normal: 0.98,
  emboss: 0.014,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeVariant = 0;
let sealRoot = null;
let currentSurface = null;

function seedRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function mixHexColors(start, end, amount) {
  const first = new THREE.Color(start);
  const second = new THREE.Color(end);
  return `#${first.lerp(second, amount).getHexString()}`;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);
camera.position.set(0, -0.02, 1.38);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
host.appendChild(renderer.domElement);

const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment, 0.035).texture;
scene.environmentIntensity = 0.6;

scene.add(new THREE.AmbientLight(0xfff8eb, 1.18));

const keyLight = new THREE.DirectionalLight(0xffedda, 4.2);
keyLight.position.set(-2.4, 2.8, 3.8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.radius = 6;
keyLight.shadow.blurSamples = 10;
keyLight.shadow.bias = -0.0007;
keyLight.shadow.normalBias = 0.006;
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 10;
keyLight.shadow.camera.left = -1.2;
keyLight.shadow.camera.right = 1.2;
keyLight.shadow.camera.top = 1.2;
keyLight.shadow.camera.bottom = -1.2;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xb8d0dd, 1.25);
rimLight.position.set(2.7, 0.8, 2.2);
scene.add(rimLight);

const reflection = new THREE.RectAreaLight(0xffedcf, 5.4, 1.7, 1.7);
reflection.position.set(-1.1, 1.5, 2.1);
reflection.lookAt(0, 0, 0);
scene.add(reflection);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(3.2, 2.4),
  new THREE.ShadowMaterial({
    color: 0x49271f,
    opacity: 0.16,
    transparent: true,
  }),
);
shadowPlane.position.set(0.06, -0.04, -0.18);
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const modelMount = new THREE.Group();
modelMount.position.y = -0.01;
scene.add(modelMount);

function makeNormalCanvas(heightCanvas, size, strength) {
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const context = normalCanvas.getContext("2d");
  const source = heightCanvas
    .getContext("2d")
    .getImageData(0, 0, size, size).data;
  const output = context.createImageData(size, size);
  const pixels = output.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sample = (sampleX, sampleY) => {
        const safeX = THREE.MathUtils.clamp(sampleX, 0, size - 1);
        const safeY = THREE.MathUtils.clamp(sampleY, 0, size - 1);
        return source[(safeY * size + safeX) * 4] / 255;
      };
      const dx = (sample(x - 2, y) - sample(x + 2, y)) * strength;
      const dy = (sample(x, y - 2) - sample(x, y + 2)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      pixels[index] = Math.round((dx / length * 0.5 + 0.5) * 255);
      pixels[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      pixels[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      pixels[index + 3] = 255;
    }
  }

  context.putImageData(output, 0, 0);
  return normalCanvas;
}

function makeUndulatingDiscGeometry(radius, angularSegments = 160, radialSegments = 56) {
  const positions = [0, 0, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  const surfaceHeights = [0];

  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const radialProgress = ring / radialSegments;
    const ringRadius = radius * radialProgress;
    const edgeFalloff = Math.cos(radialProgress * Math.PI * 0.5) ** 1.4;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = (segment / angularSegments) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;
      const nx = x / radius;
      const ny = y / radius;
      const broadWave =
        Math.sin(nx * 2.7 + ny * 1.4 + 0.4) * 0.5 +
        Math.sin(nx * -1.9 + ny * 3 + -0.9) * 0.3 +
        Math.cos(nx * 3.8 - ny * 2.3 + 1.3) * 0.15;
      const height = broadWave * radius * 0.025 * edgeFalloff;
      positions.push(x, y, height);
      surfaceHeights.push(height);
      uvs.push(x / radius * 0.5 + 0.5, y / radius * 0.5 + 0.5);
    }
  }

  for (let segment = 0; segment < angularSegments; segment += 1) {
    indices.push(0, 1 + segment, 1 + (segment + 1) % angularSegments);
  }
  for (let ring = 1; ring < radialSegments; ring += 1) {
    const currentStart = 1 + (ring - 1) * angularSegments;
    const nextStart = currentStart + angularSegments;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const nextSegment = (segment + 1) % angularSegments;
      const a = currentStart + segment;
      const b = currentStart + nextSegment;
      const c = nextStart + segment;
      const d = nextStart + nextSegment;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Array(positions.length).fill(1), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.surfaceHeights = new Float32Array(surfaceHeights);
  return geometry;
}

function makeWaxSurface(variantIndex) {
  const size = 512;
  const variant = VARIANTS[variantIndex];
  const colorCanvas = document.createElement("canvas");
  const heightCanvas = document.createElement("canvas");
  const surfaceHeightCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  [colorCanvas, heightCanvas, surfaceHeightCanvas, roughnessCanvas].forEach((canvas) => {
    canvas.width = size;
    canvas.height = size;
  });

  const context = colorCanvas.getContext("2d");
  const heightContext = heightCanvas.getContext("2d");
  const roughnessContext = roughnessCanvas.getContext("2d");
  const random = seedRandom(8111 + variantIndex * 197);
  const copyCanvas = (source) => {
    const copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext("2d").drawImage(source, 0, 0);
    return copy;
  };

  const waxGradient = context.createRadialGradient(236, 220, 16, 256, 256, 250);
  waxGradient.addColorStop(0, mixHexColors(variant.wax, "#f4d5bd", 0.09));
  waxGradient.addColorStop(0.52, variant.wax);
  waxGradient.addColorStop(0.82, mixHexColors(variant.wax, "#28100c", 0.12));
  waxGradient.addColorStop(1, mixHexColors(variant.wax, "#1e0b08", 0.32));
  context.fillStyle = waxGradient;
  context.fillRect(0, 0, size, size);

  for (let grain = 0; grain < 1300; grain += 1) {
    const alpha = 0.012 + random() * 0.045;
    context.fillStyle = random() > 0.46
      ? `rgba(255,227,204,${alpha})`
      : `rgba(41,12,9,${alpha})`;
    context.fillRect(
      random() * size,
      random() * size,
      0.45 + random() * 1.5,
      0.4 + random() * 1.25,
    );
  }

  heightContext.fillStyle = "#808080";
  heightContext.fillRect(0, 0, size, size);
  const heightRandom = seedRandom(9137 + variantIndex * 89);

  const addSoftHeightBlob = (x, y, radiusX, radiusY, raised, opacity) => {
    heightContext.save();
    heightContext.translate(x, y);
    heightContext.scale(radiusX, radiusY);
    const gradient = heightContext.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(
      0,
      raised
        ? `rgba(255,255,255,${opacity})`
        : `rgba(0,0,0,${opacity})`,
    );
    gradient.addColorStop(
      0.58,
      raised ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.045)",
    );
    gradient.addColorStop(1, "rgba(128,128,128,0)");
    heightContext.fillStyle = gradient;
    heightContext.beginPath();
    heightContext.arc(0, 0, 1, 0, Math.PI * 2);
    heightContext.fill();
    heightContext.restore();
  };

  for (let pocket = 0; pocket < 22; pocket += 1) {
    addSoftHeightBlob(
      34 + heightRandom() * (size - 68),
      34 + heightRandom() * (size - 68),
      26 + heightRandom() * 76,
      18 + heightRandom() * 58,
      heightRandom() > 0.44,
      0.2 + heightRandom() * 0.2,
    );
  }

  heightContext.save();
  heightContext.filter = "blur(2.2px)";
  heightContext.lineCap = "round";
  for (let fold = 0; fold < 15; fold += 1) {
    const foldRadius = 32 + heightRandom() * 180;
    const start = heightRandom() * Math.PI * 2;
    heightContext.lineWidth = 2 + heightRandom() * 6;
    heightContext.strokeStyle = heightRandom() > 0.36
      ? `rgba(255,255,255,${0.2 + heightRandom() * 0.16})`
      : `rgba(0,0,0,${0.16 + heightRandom() * 0.14})`;
    heightContext.beginPath();
    heightContext.arc(
      256 + (heightRandom() - 0.5) * 112,
      256 + (heightRandom() - 0.5) * 112,
      foldRadius,
      start,
      start + 0.45 + heightRandom() * 1.3,
    );
    heightContext.stroke();
  }

  for (let pore = 0; pore < 260; pore += 1) {
    const x = 18 + heightRandom() * (size - 36);
    const y = 18 + heightRandom() * (size - 36);
    heightContext.fillStyle = `rgba(0,0,0,${0.16 + heightRandom() * 0.14})`;
    heightContext.beginPath();
    heightContext.ellipse(
      x,
      y,
      0.5 + heightRandom() * 1.4,
      0.4 + heightRandom() * 1.1,
      heightRandom() * Math.PI,
      0,
      Math.PI * 2,
    );
    heightContext.fill();
  }
  heightContext.restore();
  const surfaceHeightContext = surfaceHeightCanvas.getContext("2d");
  surfaceHeightContext.drawImage(heightCanvas, 0, 0);

  roughnessContext.fillStyle = "#8a8a8a";
  roughnessContext.fillRect(0, 0, size, size);
  const roughnessImage = roughnessContext.getImageData(0, 0, size, size);
  const roughnessPixels = roughnessImage.data;
  const roughnessRandom = seedRandom(10429 + variantIndex * 73);
  for (let pixel = 0; pixel < roughnessPixels.length; pixel += 4) {
    const value = 104 + Math.round(roughnessRandom() * 54);
    roughnessPixels[pixel] = value;
    roughnessPixels[pixel + 1] = value;
    roughnessPixels[pixel + 2] = value;
  }
  roughnessContext.putImageData(roughnessImage, 0, 0);
  const materialColorCanvas = copyCanvas(colorCanvas);
  const materialRoughnessCanvas = copyCanvas(roughnessCanvas);

  const drawReliefStroke = (lineWidth, path) => {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = "rgba(39,7,5,0.78)";
    context.translate(2.3, 3.2);
    context.beginPath();
    path(context);
    context.stroke();
    context.restore();

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = "rgba(255,220,197,0.54)";
    context.translate(-1.2, -1.4);
    context.beginPath();
    path(context);
    context.stroke();
    context.restore();

    heightContext.save();
    heightContext.lineCap = "round";
    heightContext.lineJoin = "round";
    heightContext.lineWidth = lineWidth;
    heightContext.strokeStyle = "#f1f1f1";
    heightContext.beginPath();
    path(heightContext);
    heightContext.stroke();
    heightContext.restore();

    roughnessContext.save();
    roughnessContext.lineCap = "round";
    roughnessContext.lineJoin = "round";
    roughnessContext.lineWidth = lineWidth;
    roughnessContext.strokeStyle = "rgba(54,54,54,0.45)";
    roughnessContext.beginPath();
    path(roughnessContext);
    roughnessContext.stroke();
    roughnessContext.restore();
  };

  const drawReliefLeaf = (x, y, angle, length, width) => {
    const paintLeaf = (target, fill, offsetX = 0, offsetY = 0) => {
      target.save();
      target.translate(x + offsetX, y + offsetY);
      target.rotate(angle);
      target.fillStyle = fill;
      target.beginPath();
      target.moveTo(0, 0);
      target.bezierCurveTo(
        length * 0.34,
        -width,
        length * 0.8,
        -width * 0.55,
        length,
        0,
      );
      target.bezierCurveTo(
        length * 0.74,
        width * 0.64,
        length * 0.28,
        width * 0.82,
        0,
        0,
      );
      target.fill();
      target.restore();
    };

    paintLeaf(context, "rgba(39,7,5,0.62)", 2.3, 3.1);
    paintLeaf(context, "rgba(255,221,197,0.38)", -1.1, -1.4);
    paintLeaf(heightContext, "#efefef");
    paintLeaf(roughnessContext, "rgba(50,50,50,0.4)");
  };

  drawReliefStroke(8, (target) => target.arc(256, 256, 193, 0, Math.PI * 2));
  drawReliefStroke(5, (target) => target.arc(256, 256, 166, 0, Math.PI * 2));
  drawReliefStroke(4, (target) => target.arc(256, 256, 105, 0, Math.PI * 2));

  for (let step = 0; step < 64; step += 1) {
    const angle = (step / 64) * Math.PI * 2;
    const x = 256 + Math.cos(angle) * 180;
    const y = 256 + Math.sin(angle) * 180;
    context.fillStyle = "rgba(44,9,7,0.42)";
    context.beginPath();
    context.arc(x + 1.6, y + 2.2, 2.15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,219,194,0.35)";
    context.beginPath();
    context.arc(x - 0.7, y - 0.9, 1.55, 0, Math.PI * 2);
    context.fill();
    heightContext.fillStyle = "#ededed";
    heightContext.beginPath();
    heightContext.arc(x, y, 1.9, 0, Math.PI * 2);
    heightContext.fill();
  }

  drawReliefStroke(5, (target) => {
    target.moveTo(208, 350);
    target.quadraticCurveTo(174, 292, 190, 176);
  });
  drawReliefStroke(5, (target) => {
    target.moveTo(304, 350);
    target.quadraticCurveTo(338, 292, 322, 176);
  });

  [
    [188, 278, -0.72, 45, 10],
    [181, 232, -0.92, 43, 9],
    [189, 191, -0.5, 40, 8],
    [324, 278, 0.72, 45, 10],
    [331, 232, 0.92, 43, 9],
    [323, 191, 0.5, 40, 8],
    [232, 138, -0.38, 38, 8],
    [280, 138, 0.38, 38, 8],
  ].forEach(([x, y, angle, length, width]) => {
    drawReliefLeaf(x, y, angle, length, width);
  });

  const drawReliefText = (text, x, y, font, letterSpacing = 0) => {
    const paintText = (target, fill, offsetX = 0, offsetY = 0) => {
      target.save();
      target.fillStyle = fill;
      target.textAlign = "center";
      target.font = font;
      target.letterSpacing = `${letterSpacing}px`;
      target.fillText(text, x + offsetX, y + offsetY);
      target.restore();
    };

    paintText(context, "rgba(39,7,5,0.78)", 3.2, 4.4);
    paintText(context, "rgba(255,223,201,0.52)", -1.2, -1.6);
    paintText(heightContext, "#f3f3f3");
    paintText(roughnessContext, "rgba(48,48,48,0.5)");
  };

  drawReliefText(String(variantIndex + 1).padStart(2, "0"), 256, 276, "400 102px Georgia");
  drawReliefText("ARCHIVE", 256, 344, "600 21px Arial", 5);

  const normalCanvas = makeNormalCanvas(surfaceHeightCanvas, size, 18);
  const colorTexture = new THREE.CanvasTexture(materialColorCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  const roughnessTexture = new THREE.CanvasTexture(materialRoughnessCanvas);
  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  const displacementTexture = new THREE.CanvasTexture(surfaceHeightCanvas);
  const textures = [
    colorTexture,
    roughnessTexture,
    normalTexture,
    displacementTexture,
  ];
  textures.forEach((texture) => {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });

  previews.color.src = materialColorCanvas.toDataURL();
  previews.roughness.src = materialRoughnessCanvas.toDataURL();
  previews.normal.src = normalCanvas.toDataURL();
  previews.height.src = surfaceHeightCanvas.toDataURL();

  return {
    colorTexture,
    roughnessTexture,
    normalTexture,
    displacementTexture,
    textures,
  };
}

function makeWaxBoundaryRadii(variantIndex) {
  const random = seedRandom(6607 + variantIndex * 151);
  const segments = 96;
  const phases = [
    random() * Math.PI * 2,
    random() * Math.PI * 2,
    random() * Math.PI * 2,
  ];
  const radii = Array.from({ length: segments }, (_, step) => {
    const angle = (step / segments) * Math.PI * 2;
    const organic =
      0.058 * Math.sin(angle * 3 + phases[0]) +
      0.036 * Math.sin(angle * 6 + phases[1]) +
      0.022 * Math.sin(angle * 11 + phases[2]);
    return 0.19 * (1 + organic + (random() - 0.5) * 0.025);
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let step = 0; step < segments; step += 1) {
      const previous = radii[(step - 1 + segments) % segments];
      const next = radii[(step + 1) % segments];
      radii[step] = radii[step] * 0.48 + (previous + next) * 0.26;
    }
  }
  return radii;
}

function makeWaxShape(variantIndex) {
  const shape = new THREE.Shape();
  const boundaryRadii = makeWaxBoundaryRadii(variantIndex);
  boundaryRadii.forEach((radius, step) => {
    const angle = (step / boundaryRadii.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (step === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();
  return shape;
}

function makeRaisedRingGeometry(outerRadius, innerRadius) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  if (innerRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.0035,
    bevelThickness: 0.003,
    curveSegments: 128,
  });
}

function createSealModel(variantIndex) {
  const variant = VARIANTS[variantIndex];
  const surface = makeWaxSurface(variantIndex);
  const root = new THREE.Group();
  root.scale.setScalar(1.52);

  const waxMaterial = new THREE.MeshPhysicalMaterial({
    color: variant.wax,
    roughness: DEFAULTS.roughness,
    metalness: 0,
    clearcoat: DEFAULTS.clearcoat,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.78,
    side: THREE.DoubleSide,
  });
  const topMaterial = new THREE.MeshPhysicalMaterial({
    map: surface.colorTexture,
    roughnessMap: surface.roughnessTexture,
    normalMap: surface.normalTexture,
    vertexColors: true,
    normalScale: new THREE.Vector2(
      DEFAULTS.normal * 0.12,
      DEFAULTS.normal * 0.12,
    ),
    bumpMap: surface.displacementTexture,
    bumpScale: DEFAULTS.normal * 0.0015,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const bodySource = new THREE.ExtrudeGeometry(makeWaxShape(variantIndex), {
    depth: 0.01,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.007,
    bevelThickness: 0.004,
    curveSegments: 96,
  });
  const collarSource = makeRaisedRingGeometry(0.157, 0.132);
  collarSource.translate(0, 0, 0.005);
  const imprintBaseSource = new THREE.CylinderGeometry(
    0.142,
    0.142,
    0.005,
    192,
    1,
    false,
  );
  imprintBaseSource.rotateX(Math.PI / 2);
  imprintBaseSource.translate(0, 0, 0.008);
  const toNonIndexed = (geometry) =>
    geometry.index ? geometry.toNonIndexed() : geometry;
  const bodyGeometry = toNonIndexed(bodySource);
  const collarGeometry = toNonIndexed(collarSource);
  const imprintBaseGeometry = toNonIndexed(imprintBaseSource);
  const mergedBodyGeometry = mergeGeometries([
    bodyGeometry,
    collarGeometry,
    imprintBaseGeometry,
  ]);
  new Set([bodySource, bodyGeometry, collarSource, collarGeometry, imprintBaseSource, imprintBaseGeometry])
    .forEach((geometry) => geometry.dispose());
  const waxBody = new THREE.Mesh(mergedBodyGeometry, waxMaterial);
  waxBody.name = "WaxSealBody";
  root.add(waxBody);

  const imprintPlate = new THREE.Mesh(
    makeUndulatingDiscGeometry(0.142),
    topMaterial,
  );
  const imprintSurfaceZ = 0.015;
  imprintPlate.position.z = imprintSurfaceZ;
  imprintPlate.name = "RecessedWaxImprint";
  root.add(imprintPlate);

  const reliefMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(variant.wax).lerp(
      new THREE.Color(variant.accent),
      0.2,
    ),
    roughness: 0.22,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.82,
  });
  const relief = new THREE.Group();
  relief.name = "WaxSealRelief";
  const reliefPivotZ = 0.0111;
  const reliefBaseOffset = imprintSurfaceZ - reliefPivotZ;
  relief.position.z = reliefBaseOffset;

  [
    [0.108, 0.0034],
    [0.0925, 0.0026],
    [0.058, 0.0022],
  ].forEach(([radius, tube]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 7, 112),
      reliefMaterial,
    );
    ring.position.z = 0.0111;
    relief.add(ring);
  });

  const beadMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.0028, 8, 6),
    reliefMaterial,
    64,
  );
  const beadMatrix = new THREE.Matrix4();
  for (let index = 0; index < 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    beadMatrix.makeTranslation(
      Math.cos(angle) * 0.1005,
      Math.sin(angle) * 0.1005,
      0.0118,
    );
    beadMesh.setMatrixAt(index, beadMatrix);
  }
  beadMesh.instanceMatrix.needsUpdate = true;
  relief.add(beadMesh);

  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.24, -0.25, 0.7, -0.28, 1, 0);
  leafShape.bezierCurveTo(0.7, 0.24, 0.24, 0.25, 0, 0);
  const leafGeometry = new THREE.ExtrudeGeometry(leafShape, {
    depth: 0.0025,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.0005,
    bevelThickness: 0.0006,
  });
  const texturePoint = (x, y, z = 0.0108) => new THREE.Vector3(
    (x / 512 - 0.5) * 0.284,
    -(y / 512 - 0.5) * 0.284,
    z,
  );

  [
    [188, 278, -0.72, 0.026],
    [181, 232, -0.92, 0.024],
    [189, 191, -0.5, 0.022],
    [324, 278, 0.72, 0.026],
    [331, 232, 0.92, 0.024],
    [323, 191, 0.5, 0.022],
    [232, 138, -0.38, 0.021],
    [280, 138, 0.38, 0.021],
  ].forEach(([x, y, angle, length]) => {
    const leaf = new THREE.Mesh(leafGeometry, reliefMaterial);
    leaf.position.copy(texturePoint(x, y));
    leaf.rotation.z = -angle;
    leaf.scale.set(length, length, 1);
    relief.add(leaf);
  });

  [
    new THREE.CatmullRomCurve3([
      texturePoint(208, 350),
      texturePoint(174, 292),
      texturePoint(190, 176),
    ]),
    new THREE.CatmullRomCurve3([
      texturePoint(304, 350),
      texturePoint(338, 292),
      texturePoint(322, 176),
    ]),
  ].forEach((curve) => {
    relief.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.00145, 6, false),
        reliefMaterial,
      ),
    );
  });

  const number = makeWaxNumberMesh(
    String(variantIndex + 1).padStart(2, "0"),
    reliefMaterial,
  );
  number.position.z = 0.0108;
  relief.add(number);
  root.add(relief);

  const dropMaterial = new THREE.MeshPhysicalMaterial({
    color: variant.wax,
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.36,
    clearcoatRoughness: 0.26,
  });
  const dropRandom = seedRandom(347 + variantIndex * 73);
  const dropAngles = [0.22, 1.36, 2.74, 4.18, 5.63];
  const drops = new THREE.Group();
  drops.name = "WaxSealDroplets";
  dropAngles.forEach((baseAngle) => {
    const angle = baseAngle + dropRandom() * 0.16;
    const radius = 0.176 + dropRandom() * 0.022;
    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(0.029, 20, 12),
      dropMaterial,
    );
    droplet.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      -0.003 + (dropRandom() - 0.5) * 0.006,
    );
    droplet.scale.set(
      0.8 + dropRandom() * 0.55,
      0.52 + dropRandom() * 0.42,
      0.38 + dropRandom() * 0.24,
    );
    drops.add(droplet);
  });
  root.add(drops);

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  root.userData.materials = {
    wax: waxMaterial,
    top: topMaterial,
    relief: reliefMaterial,
    drop: dropMaterial,
  };
  root.userData.surface = surface;
  root.userData.variant = variant;
  root.userData.imprintPlate = imprintPlate;
  root.userData.relief = relief;
  root.userData.reliefPivotZ = reliefPivotZ;
  root.userData.reliefBaseOffset = reliefBaseOffset;
  return root;
}

function disposeModel(model) {
  if (!model) {
    return;
  }
  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    child.geometry?.dispose();
  });
  Object.values(model.userData.materials ?? {}).forEach((material) => {
    material?.dispose();
  });
  model.userData.surface?.textures.forEach((texture) => texture.dispose());
}

function selectVariant(index) {
  activeVariant = index;
  const variant = VARIANTS[index];
  const previousRoot = sealRoot;
  if (previousRoot) {
    modelMount.remove(previousRoot);
    disposeModel(previousRoot);
  }
  currentSurface = null;
  sealRoot = createSealModel(index);
  modelMount.add(sealRoot);
  controls.color.value = variant.wax;
  variantButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.variant) === index);
  });
  updateMaterial();
  gsap.fromTo(
    sealRoot.rotation,
    { y: -0.46, z: -0.12 },
    {
      y: 0,
      z: 0,
      duration: reducedMotion.matches ? 0.01 : 0.72,
      ease: "expo.out",
    },
  );
}

function updateMaterial() {
  if (!sealRoot) {
    return;
  }

  const color = controls.color.value;
  const values = {
    roughness: Number(controls.roughness.value),
    clearcoat: Number(controls.clearcoat.value),
    normal: Number(controls.normal.value),
    emboss: Number(controls.emboss.value),
  };
  const materials = sealRoot.userData.materials;

  materials.wax.color.set(color);
  materials.drop.color.set(color);
  materials.relief.color
    .set(color)
    .lerp(new THREE.Color(sealRoot.userData.variant.accent), 0.2);
  [materials.wax, materials.relief, materials.drop].forEach((material) => {
    material.roughness = values.roughness;
    material.clearcoat = values.clearcoat;
    material.needsUpdate = true;
  });
  const surfaceRelief = values.normal * 0.12;
  materials.top.normalScale.set(surfaceRelief, surfaceRelief);
  materials.top.bumpScale = values.normal * 0.0015;
  materials.top.roughness = THREE.MathUtils.lerp(0.72, 1, values.roughness);
  materials.top.clearcoat = values.clearcoat * 0.22;
  materials.top.needsUpdate = true;

  const imprintGeometry = sealRoot.userData.imprintPlate.geometry;
  const baseHeights = imprintGeometry.userData.surfaceHeights;
  const position = imprintGeometry.attributes.position;
  const surfaceColor = imprintGeometry.attributes.color;
  for (let index = 0; index < position.count; index += 1) {
    const height = baseHeights[index] * values.normal * 0.65;
    position.setZ(index, height);
    const shade = THREE.MathUtils.clamp(
      1 + baseHeights[index] * values.normal * 120,
      0.62,
      1,
    );
    surfaceColor.setXYZ(index, shade, shade, shade);
  }
  position.needsUpdate = true;
  surfaceColor.needsUpdate = true;
  imprintGeometry.computeVertexNormals();

  const depthRatio = values.emboss / DEFAULTS.emboss;
  const reliefScaleZ = 0.12 + depthRatio * 0.88;
  const relief = sealRoot.userData.relief;
  relief.visible = values.emboss > 0.00005;
  relief.scale.z = reliefScaleZ;
  relief.position.z =
    sealRoot.userData.reliefBaseOffset +
    sealRoot.userData.reliefPivotZ * (1 - reliefScaleZ);

  outputs.color.value = color.toUpperCase();
  outputs.roughness.value = values.roughness.toFixed(2);
  outputs.clearcoat.value = values.clearcoat.toFixed(2);
  outputs.normal.value = values.normal.toFixed(2);
  outputs.emboss.value = values.emboss.toFixed(4);
  settingsOutput.textContent = [
    `object: standalone-wax-seal-${String(activeVariant + 1).padStart(2, "0")}`,
    `wax: ${color.toUpperCase()}`,
    `roughness: ${values.roughness.toFixed(2)}`,
    `clearcoat: ${values.clearcoat.toFixed(2)}`,
    `normalScale: ${values.normal.toFixed(2)}`,
    `displacement: ${values.emboss.toFixed(4)}`,
  ].join("\n");
}

Object.values(controls).forEach((control) => {
  control.addEventListener("input", updateMaterial);
});

variantButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectVariant(Number(button.dataset.variant));
  });
});

resetButton.addEventListener("click", () => {
  controls.roughness.value = String(DEFAULTS.roughness);
  controls.clearcoat.value = String(DEFAULTS.clearcoat);
  controls.normal.value = String(DEFAULTS.normal);
  controls.emboss.value = String(DEFAULTS.emboss);
  controls.color.value = VARIANTS[activeVariant].wax;
  updateMaterial();
});

const motion = {
  x: -0.14,
  y: -0.2,
  targetX: -0.14,
  targetY: -0.2,
  dragging: false,
  moved: false,
  lastX: 0,
  lastY: 0,
  downX: 0,
  downY: 0,
};
let isPressed = false;

function pressSeal() {
  isPressed = !isPressed;
  stage.setAttribute("aria-pressed", String(isPressed));
  gsap.to(sealRoot.position, {
    z: isPressed ? -0.075 : 0,
    duration: reducedMotion.matches ? 0.01 : 0.16,
    ease: isPressed ? "power2.in" : "back.out(1.8)",
  });
  gsap.to(sealRoot.scale, {
    x: isPressed ? 1.47 : 1.52,
    y: isPressed ? 1.47 : 1.52,
    z: isPressed ? 1.47 : 1.52,
    duration: reducedMotion.matches ? 0.01 : 0.2,
    ease: "power2.out",
  });
}

stage.addEventListener("pointerdown", (event) => {
  motion.dragging = true;
  motion.moved = false;
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;
  motion.downX = event.clientX;
  motion.downY = event.clientY;
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener("pointermove", (event) => {
  if (!motion.dragging) {
    return;
  }
  const deltaX = event.clientX - motion.lastX;
  const deltaY = event.clientY - motion.lastY;
  motion.targetY += deltaX * 0.005;
  motion.targetX += deltaY * 0.0035;
  if (
    Math.hypot(event.clientX - motion.downX, event.clientY - motion.downY) > 6
  ) {
    motion.moved = true;
  }
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;
});

function endPointer(event) {
  if (!motion.dragging) {
    return;
  }
  motion.dragging = false;
  stage.releasePointerCapture?.(event.pointerId);
  if (!motion.moved) {
    pressSeal();
  }
}

stage.addEventListener("pointerup", endPointer);
stage.addEventListener("pointercancel", endPointer);
stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pressSeal();
  }
});

exportButton.addEventListener("click", () => {
  if (!sealRoot || exportButton.disabled) {
    return;
  }

  exportButton.disabled = true;
  exportStatus.textContent = "正在导出独立蜡封模型…";
  const exporter = new GLTFExporter();
  const exportRoot = new THREE.Group();
  exportRoot.name = `WaxSeal_${String(activeVariant + 1).padStart(2, "0")}`;
  exportRoot.add(sealRoot.clone(true));

  exporter.parse(
    exportRoot,
    (result) => {
      const blob = new Blob([result], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wax-seal-${String(activeVariant + 1).padStart(2, "0")}.glb`;
      link.click();
      URL.revokeObjectURL(url);
      exportStatus.textContent = "GLB 已导出，包含当前材质与纹理";
      exportButton.disabled = false;
    },
    (error) => {
      console.error("Wax seal export failed", error);
      exportStatus.textContent = "导出失败，请重试";
      exportButton.disabled = false;
    },
    { binary: true, onlyVisible: true },
  );
});

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  const mobile = width < 700;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2),
  );
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.fov = mobile ? 42 : 35;
  camera.position.z = mobile ? 1.55 : 1.38;
  modelMount.position.y = mobile ? -0.04 : -0.01;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(host);
resize();

let lastFrame = performance.now();
function animate(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  motion.x = THREE.MathUtils.damp(motion.x, motion.targetX, 7.5, delta);
  motion.y = THREE.MathUtils.damp(motion.y, motion.targetY, 7.5, delta);
  modelMount.rotation.x = motion.x;
  modelMount.rotation.y = motion.y;
  modelMount.rotation.z = -0.035 + Math.sin(now * 0.00042) * 0.008;
  renderer.render(scene, camera);
}

selectVariant(0);
renderer.setAnimationLoop(animate);

window.addEventListener("beforeunload", () => {
  disposeModel(sealRoot);
  currentSurface?.textures.forEach((texture) => texture.dispose());
  pmrem.dispose();
  renderer.dispose();
});
