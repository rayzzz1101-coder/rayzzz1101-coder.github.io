import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";

const host = document.querySelector("#tuner-canvas");
const stage = document.querySelector(".stage-card");
const mapPreview = document.querySelector("#map-preview");
const roughnessPreview = document.querySelector("#roughness-preview");
const normalPreview = document.querySelector("#normal-preview");
const heightPreview = document.querySelector("#height-preview");
const settingsOutput = document.querySelector("#settings-output");
const resetButton = document.querySelector("#reset-controls");

const controls = {
  roughness: document.querySelector("#roughness"),
  normal: document.querySelector("#normal-strength"),
  clearcoat: document.querySelector("#clearcoat"),
  scale: document.querySelector("#fiber-scale"),
};

const outputs = {
  roughness: document.querySelector("#roughness-value"),
  normal: document.querySelector("#normal-strength-value"),
  clearcoat: document.querySelector("#clearcoat-value"),
  scale: document.querySelector("#fiber-scale-value"),
};

const DEFAULTS = {
  roughness: 0.82,
  normal: 0.72,
  clearcoat: 0,
  scale: 1.45,
};

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createTextureSet({
  size = 1024,
  seed = 3807,
  fiberCount = 2100,
  palette = ["#e0c79f", "#c9aa7d", "#ae895b"],
  updatePreviews = false,
} = {}) {
  const colorCanvas = document.createElement("canvas");
  const heightCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  [colorCanvas, heightCanvas, roughnessCanvas].forEach((canvas) => {
    canvas.width = size;
    canvas.height = size;
  });

  const colorContext = colorCanvas.getContext("2d");
  const heightContext = heightCanvas.getContext("2d");
  const roughnessContext = roughnessCanvas.getContext("2d");

  const colorGradient = colorContext.createLinearGradient(0, 0, size, size);
  colorGradient.addColorStop(0, palette[0]);
  colorGradient.addColorStop(0.56, palette[1]);
  colorGradient.addColorStop(1, palette[2]);
  colorContext.fillStyle = colorGradient;
  colorContext.fillRect(0, 0, size, size);

  heightContext.fillStyle = "#808080";
  heightContext.fillRect(0, 0, size, size);
  roughnessContext.fillStyle = "#858585";
  roughnessContext.fillRect(0, 0, size, size);

  const random = seededRandom(seed);
  const colorImage = colorContext.getImageData(0, 0, size, size);
  const heightImage = heightContext.getImageData(0, 0, size, size);
  const roughnessImage = roughnessContext.getImageData(0, 0, size, size);
  const colorPixels = colorImage.data;
  const heightPixels = heightImage.data;
  const roughnessPixels = roughnessImage.data;

  for (let pixel = 0; pixel < colorPixels.length; pixel += 4) {
    const grain = (random() - 0.5) * 13;
    colorPixels[pixel] = Math.max(0, Math.min(255, colorPixels[pixel] + grain));
    colorPixels[pixel + 1] = Math.max(0, Math.min(255, colorPixels[pixel + 1] + grain * 0.9));
    colorPixels[pixel + 2] = Math.max(0, Math.min(255, colorPixels[pixel + 2] + grain * 0.72));

    const height = 121 + Math.round(random() * 18);
    heightPixels[pixel] = height;
    heightPixels[pixel + 1] = height;
    heightPixels[pixel + 2] = height;

    const roughness = 94 + Math.round(random() * 82);
    roughnessPixels[pixel] = roughness;
    roughnessPixels[pixel + 1] = roughness;
    roughnessPixels[pixel + 2] = roughness;
  }
  colorContext.putImageData(colorImage, 0, 0);
  heightContext.putImageData(heightImage, 0, 0);
  roughnessContext.putImageData(roughnessImage, 0, 0);

  const fiberRandom = seededRandom(seed + 5404);
  for (let fiber = 0; fiber < fiberCount; fiber += 1) {
    const x = fiberRandom() * size;
    const y = fiberRandom() * size;
    const length = 2 + fiberRandom() * 34;
    const bend = (fiberRandom() - 0.5) * 7;
    const light = fiberRandom() > 0.48;

    colorContext.strokeStyle = light
      ? `rgba(255,248,225,${0.035 + fiberRandom() * 0.065})`
      : `rgba(73,43,22,${0.025 + fiberRandom() * 0.05})`;
    colorContext.lineWidth = 0.35 + fiberRandom() * 0.8;
    colorContext.beginPath();
    colorContext.moveTo(x, y);
    colorContext.quadraticCurveTo(
      x + length * 0.5,
      y + bend,
      x + length,
      y - bend * 0.35,
    );
    colorContext.stroke();

    heightContext.strokeStyle = light
      ? "rgba(225,225,225,0.55)"
      : "rgba(35,35,35,0.42)";
    heightContext.lineWidth = 0.4 + fiberRandom() * 1.1;
    heightContext.beginPath();
    heightContext.moveTo(x, y);
    heightContext.quadraticCurveTo(
      x + length * 0.5,
      y + bend,
      x + length,
      y - bend * 0.35,
    );
    heightContext.stroke();

    roughnessContext.strokeStyle = light
      ? "rgba(235,235,235,0.2)"
      : "rgba(28,28,28,0.18)";
    roughnessContext.lineWidth = 0.5 + fiberRandom();
    roughnessContext.beginPath();
    roughnessContext.moveTo(x, y);
    roughnessContext.quadraticCurveTo(
      x + length * 0.5,
      y + bend,
      x + length,
      y - bend * 0.35,
    );
    roughnessContext.stroke();
  }

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalContext = normalCanvas.getContext("2d");
  const source = heightContext.getImageData(0, 0, size, size).data;
  const normalImage = normalContext.createImageData(size, size);
  const normalPixels = normalImage.data;
  const strength = 2.2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sample = (sampleX, sampleY) => {
        const clampedX = THREE.MathUtils.clamp(sampleX, 0, size - 1);
        const clampedY = THREE.MathUtils.clamp(sampleY, 0, size - 1);
        return source[(clampedY * size + clampedX) * 4] / 255;
      };
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * strength;
      const dy = (sample(x, y - 1) - sample(x, y + 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      normalPixels[index] = Math.round((dx / length * 0.5 + 0.5) * 255);
      normalPixels[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      normalPixels[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normalPixels[index + 3] = 255;
    }
  }
  normalContext.putImageData(normalImage, 0, 0);

  const createCanvasTexture = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(DEFAULTS.scale, DEFAULTS.scale * 0.78);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  };

  const colorTexture = createCanvasTexture(colorCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  const roughnessTexture = createCanvasTexture(roughnessCanvas);
  const normalTexture = createCanvasTexture(normalCanvas);

  if (updatePreviews) {
    mapPreview.src = colorCanvas.toDataURL();
    roughnessPreview.src = roughnessCanvas.toDataURL();
    normalPreview.src = normalCanvas.toDataURL();
    heightPreview.src = heightCanvas.toDataURL();
  }

  return { colorTexture, roughnessTexture, normalTexture };
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
camera.position.set(0, 0, 5.2);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
host.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
scene.environmentIntensity = 0.45;

const ambient = new THREE.AmbientLight(0xfff7e8, 0.68);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff1d3, 3.45);
keyLight.position.set(-4, 4.8, 4.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.radius = 5;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc6d9e7, 0.55);
fillLight.position.set(3.8, 1.4, 2.8);
scene.add(fillLight);

const textures = createTextureSet({ updatePreviews: true });
const flapTextures = createTextureSet({
  seed: 6489,
  fiberCount: 1680,
  palette: ["#d8bb8d", "#bd9768", "#987048"],
});
const ENVELOPE_WIDTH = 2.16;
const ENVELOPE_HEIGHT = 1.38;
const ENVELOPE_DEPTH = 0.038;
const FRONT_BULGE = 0.0675;
const BACK_BULGE = FRONT_BULGE / 2;

function envelopeFalloff(x, y) {
  const normalX = x / (ENVELOPE_WIDTH / 2);
  const normalY = y / (ENVELOPE_HEIGHT / 2);
  return (
    Math.max(0, 1 - normalX * normalX) *
    Math.max(0, 1 - normalY * normalY)
  );
}

function envelopeFrontZ(x, y) {
  return (
    ENVELOPE_DEPTH / 2 +
    FRONT_BULGE * Math.pow(envelopeFalloff(x, y), 0.64)
  );
}

function envelopeBackZ(x, y) {
  return (
    -ENVELOPE_DEPTH / 2 -
    BACK_BULGE * Math.pow(envelopeFalloff(x, y), 0.64)
  );
}

const envelopeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: textures.colorTexture,
  roughnessMap: textures.roughnessTexture,
  roughness: DEFAULTS.roughness,
  normalMap: textures.normalTexture,
  normalScale: new THREE.Vector2(DEFAULTS.normal, DEFAULTS.normal),
  clearcoat: DEFAULTS.clearcoat,
  clearcoatRoughness: 0.46,
  metalness: 0,
  sheen: 0.16,
  sheenColor: new THREE.Color(0xfff0cf),
});

const flapMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  map: flapTextures.colorTexture,
  roughnessMap: flapTextures.roughnessTexture,
  roughness: DEFAULTS.roughness,
  normalMap: flapTextures.normalTexture,
  normalScale: new THREE.Vector2(DEFAULTS.normal, DEFAULTS.normal),
  clearcoat: DEFAULTS.clearcoat,
  clearcoatRoughness: 0.46,
  metalness: 0,
  sheen: 0.16,
  sheenColor: new THREE.Color(0xffe7bf),
  side: THREE.DoubleSide,
});

function makeEnvelopeGeometry() {
  const halfWidth = ENVELOPE_WIDTH / 2;
  const halfHeight = ENVELOPE_HEIGHT / 2;
  const columns = 72;
  const rows = 44;
  const stride = columns + 1;
  const positions = [];
  const uvs = [];
  const indices = [];

  const addGridFace = (zAt, windForward) => {
    const start = positions.length / 3;
    for (let row = 0; row <= rows; row += 1) {
      const y = THREE.MathUtils.lerp(-halfHeight, halfHeight, row / rows);
      for (let column = 0; column <= columns; column += 1) {
        const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, column / columns);
        positions.push(x, y, zAt(x, y));
        uvs.push(column / columns, row / rows);
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const bottomLeft = start + row * stride + column;
        const bottomRight = bottomLeft + 1;
        const topLeft = bottomLeft + stride;
        const topRight = topLeft + 1;
        if (windForward) {
          indices.push(
            bottomLeft,
            bottomRight,
            topRight,
            bottomLeft,
            topRight,
            topLeft,
          );
        } else {
          indices.push(
            bottomLeft,
            topRight,
            bottomRight,
            bottomLeft,
            topLeft,
            topRight,
          );
        }
      }
    }
    return start;
  };

  addGridFace(envelopeFrontZ, true);
  addGridFace(envelopeBackZ, false);

  const addSideQuad = (a, b, c, d, uvValues) => {
    const start = positions.length / 3;
    positions.push(
      ...a, ...b, ...c, ...d,
    );
    uvs.push(...uvValues);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };

  for (let column = 0; column < columns; column += 1) {
    const x0 = THREE.MathUtils.lerp(-halfWidth, halfWidth, column / columns);
    const x1 = THREE.MathUtils.lerp(-halfWidth, halfWidth, (column + 1) / columns);
    const frontZ0 = envelopeFrontZ(x0, halfHeight);
    const frontZ1 = envelopeFrontZ(x1, halfHeight);
    const backZ0 = envelopeBackZ(x0, halfHeight);
    const backZ1 = envelopeBackZ(x1, halfHeight);
    addSideQuad(
      [x0, halfHeight, frontZ0],
      [x1, halfHeight, frontZ1],
      [x1, halfHeight, backZ1],
      [x0, halfHeight, backZ0],
      [column / columns, 1, (column + 1) / columns, 1, (column + 1) / columns, 0, column / columns, 0],
    );
    addSideQuad(
      [x0, -halfHeight, frontZ0],
      [x0, -halfHeight, backZ0],
      [x1, -halfHeight, backZ1],
      [x1, -halfHeight, frontZ1],
      [column / columns, 1, column / columns, 0, (column + 1) / columns, 0, (column + 1) / columns, 1],
    );
  }

  for (let row = 0; row < rows; row += 1) {
    const y0 = THREE.MathUtils.lerp(-halfHeight, halfHeight, row / rows);
    const y1 = THREE.MathUtils.lerp(-halfHeight, halfHeight, (row + 1) / rows);
    const frontZ0 = envelopeFrontZ(-halfWidth, y0);
    const frontZ1 = envelopeFrontZ(-halfWidth, y1);
    const backZ0 = envelopeBackZ(-halfWidth, y0);
    const backZ1 = envelopeBackZ(-halfWidth, y1);
    addSideQuad(
      [-halfWidth, y0, frontZ0],
      [-halfWidth, y1, frontZ1],
      [-halfWidth, y1, backZ1],
      [-halfWidth, y0, backZ0],
      [row / rows, 1, (row + 1) / rows, 1, (row + 1) / rows, 0, row / rows, 0],
    );
    addSideQuad(
      [halfWidth, y0, frontZ0],
      [halfWidth, y0, backZ0],
      [halfWidth, y1, backZ1],
      [halfWidth, y1, frontZ1],
      [row / rows, 1, row / rows, 0, (row + 1) / rows, 0, (row + 1) / rows, 1],
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const assembly = new THREE.Group();
const body = new THREE.Mesh(makeEnvelopeGeometry(), envelopeMaterial);
body.castShadow = true;
body.receiveShadow = false;
assembly.add(body);

function makeFlapGeometry() {
  const columns = 56;
  const rows = 28;
  const topY = ENVELOPE_HEIGHT / 2;
  const apexY = 0.105;
  const fullHalfWidth = ENVELOPE_WIDTH / 2 - 0.012;
  const flapThickness = 0.012;
  const positions = [];
  const uvs = [];
  const indices = [];
  const rowData = [];

  for (let row = 0; row <= rows; row += 1) {
    const progress = row / rows;
    const y = THREE.MathUtils.lerp(topY, apexY, progress);
    const halfWidth =
      fullHalfWidth * Math.pow(Math.max(0, 1 - progress), 0.92);
    rowData.push({ y, halfWidth });

    for (let column = 0; column <= columns; column += 1) {
      const across = column / columns;
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, across);
      positions.push(
        x,
        y - topY,
        envelopeFrontZ(x, y) - ENVELOPE_DEPTH / 2 + flapThickness,
      );
      uvs.push(
        (x + ENVELOPE_WIDTH / 2) / ENVELOPE_WIDTH,
        (ENVELOPE_HEIGHT / 2 - y) / ENVELOPE_HEIGHT,
      );
    }
  }

  const stride = columns + 1;
  const topVertexCount = (rows + 1) * stride;

  for (let row = 0; row <= rows; row += 1) {
    const { y, halfWidth } = rowData[row];
    for (let column = 0; column <= columns; column += 1) {
      const across = column / columns;
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, across);
      positions.push(
        x,
        y - topY,
        envelopeFrontZ(x, y) - ENVELOPE_DEPTH / 2,
      );
      uvs.push(
        (x + ENVELOPE_WIDTH / 2) / ENVELOPE_WIDTH,
        (ENVELOPE_HEIGHT / 2 - y) / ENVELOPE_HEIGHT,
      );
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * stride + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + stride;
      const bottomRight = bottomLeft + 1;
      indices.push(
        topLeft,
        bottomLeft,
        bottomRight,
        topLeft,
        bottomRight,
        topRight,
      );

      const underTopLeft = topVertexCount + topLeft;
      const underTopRight = topVertexCount + topRight;
      const underBottomLeft = topVertexCount + bottomLeft;
      const underBottomRight = topVertexCount + bottomRight;
      indices.push(
        underTopLeft,
        underBottomRight,
        underBottomLeft,
        underTopLeft,
        underTopRight,
        underBottomRight,
      );
    }
  }

  const addSide = (a, b, underA, underB) => {
    indices.push(a, underA, underB, a, underB, b);
  };

  for (let column = 0; column < columns; column += 1) {
    const current = column;
    const next = column + 1;
    addSide(
      current,
      next,
      topVertexCount + current,
      topVertexCount + next,
    );
  }

  for (let row = 0; row < rows; row += 1) {
    const currentLeft = row * stride;
    const nextLeft = currentLeft + stride;
    addSide(
      currentLeft,
      nextLeft,
      topVertexCount + currentLeft,
      topVertexCount + nextLeft,
    );

    const currentRight = row * stride + columns;
    const nextRight = currentRight + stride;
    addSide(
      currentRight,
      topVertexCount + currentRight,
      topVertexCount + nextRight,
      nextRight,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const flap = new THREE.Mesh(makeFlapGeometry(), flapMaterial);
flap.castShadow = true;
flap.receiveShadow = false;
const flapPivot = new THREE.Group();
flapPivot.position.set(0, ENVELOPE_HEIGHT / 2, ENVELOPE_DEPTH / 2 + 0.0015);
flapPivot.add(flap);
assembly.add(flapPivot);

function makeOpeningGeometry() {
  const columns = 64;
  const rows = 8;
  const topY = 0.66;
  const bottomY = 0.495;
  const centerY = (topY + bottomY) / 2;
  const topHalfWidth = 0.96;
  const bottomHalfWidth = 0.77;
  const stride = columns + 1;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= rows; row += 1) {
    const progress = row / rows;
    const y = THREE.MathUtils.lerp(topY, bottomY, progress);
    const halfWidth = THREE.MathUtils.lerp(
      topHalfWidth,
      bottomHalfWidth,
      progress,
    );
    for (let column = 0; column <= columns; column += 1) {
      const across = column / columns;
      const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, across);
      positions.push(
        x,
        y - centerY,
        envelopeFrontZ(x, y) + 0.0048,
      );
      uvs.push(across, 1 - progress);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * stride + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + stride;
      const bottomRight = bottomLeft + 1;
      indices.push(
        topLeft,
        bottomLeft,
        bottomRight,
        topLeft,
        bottomRight,
        topRight,
      );
    }
  }

  const openingGeometry = new THREE.BufferGeometry();
  openingGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  openingGeometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );
  openingGeometry.setIndex(indices);
  openingGeometry.computeVertexNormals();
  return { openingGeometry, centerY };
}

const { openingGeometry, centerY: openingCenterY } = makeOpeningGeometry();
const opening = new THREE.Mesh(
  openingGeometry,
  new THREE.MeshPhysicalMaterial({
    color: 0x563824,
    roughness: 0.9,
    metalness: 0,
    sheen: 0.06,
    sheenColor: new THREE.Color(0xc48a5b),
    side: THREE.DoubleSide,
  }),
);
opening.position.y = openingCenterY;
opening.scale.y = 0.001;
opening.visible = false;
assembly.add(opening);

const surfacePoint = (x, y) =>
  new THREE.Vector3(x, y, envelopeFrontZ(x, y) + 0.0042);
const seamGeometry = new THREE.BufferGeometry().setFromPoints([
  surfacePoint(-1.02, 0.66),
  surfacePoint(0, -0.02),
  surfacePoint(1.02, 0.66),
  surfacePoint(0, -0.02),
  surfacePoint(-1.02, -0.66),
  surfacePoint(0, 0.01),
  surfacePoint(1.02, -0.66),
  surfacePoint(0, 0.01),
]);
assembly.add(
  new THREE.LineSegments(
    seamGeometry,
    new THREE.LineBasicMaterial({
      color: 0x7f6e5b,
      transparent: true,
      opacity: 0.22,
    }),
  ),
);

assembly.rotation.set(-0.1, -0.25, -0.03);
scene.add(assembly);

const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 5),
  new THREE.ShadowMaterial({
    color: 0x5a4230,
    opacity: 0.12,
    transparent: true,
  }),
);
shadow.position.set(0, -1.05, -0.3);
shadow.receiveShadow = true;
scene.add(shadow);

const motion = {
  targetX: -0.1,
  targetY: -0.25,
  x: -0.1,
  y: -0.25,
  dragging: false,
  moved: false,
  lastX: 0,
  lastY: 0,
  downX: 0,
  downY: 0,
};
const envelopeState = {
  open: false,
  busy: false,
};
let envelopeTimeline = null;

function toggleEnvelope() {
  if (envelopeState.busy) {
    return;
  }

  envelopeState.busy = true;
  envelopeState.open = !envelopeState.open;
  stage.setAttribute("aria-expanded", String(envelopeState.open));
  envelopeTimeline?.kill();

  if (envelopeState.open) {
    opening.visible = true;
    envelopeTimeline = gsap
      .timeline({
        onComplete: () => {
          envelopeState.busy = false;
          envelopeTimeline = null;
        },
      })
      .to(flapPivot.rotation, {
        x: -Math.PI,
        duration: 0.82,
        ease: "power3.inOut",
      })
      .to(
        opening.scale,
        {
          y: 1,
          duration: 0.42,
          ease: "back.out(1.35)",
        },
        0.72,
      );
  } else {
    envelopeTimeline = gsap
      .timeline({
        onComplete: () => {
          opening.visible = false;
          envelopeState.busy = false;
          envelopeTimeline = null;
        },
      })
      .to(opening.scale, {
        y: 0.001,
        duration: 0.24,
        ease: "power2.in",
      })
      .to(
        flapPivot.rotation,
        {
          x: 0,
          duration: 0.78,
          ease: "power3.inOut",
        },
        0.2,
      );
  }
}

function updateMaterial() {
  const values = {
    roughness: Number(controls.roughness.value),
    normal: Number(controls.normal.value),
    clearcoat: Number(controls.clearcoat.value),
    scale: Number(controls.scale.value),
  };

  [envelopeMaterial, flapMaterial].forEach((material) => {
    material.roughness = values.roughness;
    material.normalScale.set(values.normal, values.normal);
    material.clearcoat = values.clearcoat;
    material.needsUpdate = true;
  });
  [textures.colorTexture, textures.roughnessTexture, textures.normalTexture].forEach(
    (texture) => texture.repeat.set(values.scale, values.scale * 0.78),
  );
  [
    flapTextures.colorTexture,
    flapTextures.roughnessTexture,
    flapTextures.normalTexture,
  ].forEach((texture) => {
    texture.repeat.set(values.scale * 0.82, values.scale * 0.64);
  });

  outputs.roughness.value = values.roughness.toFixed(2);
  outputs.normal.value = values.normal.toFixed(2);
  outputs.clearcoat.value = values.clearcoat.toFixed(2);
  outputs.scale.value = `${values.scale.toFixed(2)}×`;
  settingsOutput.textContent = [
    `roughness: ${values.roughness.toFixed(2)}`,
    `normalScale: ${values.normal.toFixed(2)}`,
    `clearcoat: ${values.clearcoat.toFixed(2)}`,
    `textureRepeat: ${values.scale.toFixed(2)}`,
  ].join("\n");
}

Object.values(controls).forEach((input) => {
  input.addEventListener("input", updateMaterial);
});

resetButton.addEventListener("click", () => {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    controls[key].value = String(value);
  });
  updateMaterial();
});

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  if (width < 700) {
    camera.fov = 43;
    camera.position.z = 5.55;
    assembly.position.y = -0.08;
  } else {
    camera.fov = 35;
    camera.position.z = 5.2;
    assembly.position.y = -0.02;
  }
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(host);
resize();

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
  motion.targetY += (event.clientX - motion.lastX) * 0.006;
  motion.targetX += (event.clientY - motion.lastY) * 0.004;
  if (
    Math.hypot(
      event.clientX - motion.downX,
      event.clientY - motion.downY,
    ) > 6
  ) {
    motion.moved = true;
  }
  motion.lastX = event.clientX;
  motion.lastY = event.clientY;
});

stage.addEventListener("pointerup", (event) => {
  motion.dragging = false;
  stage.releasePointerCapture?.(event.pointerId);
  if (!motion.moved) {
    toggleEnvelope();
  }
});

stage.addEventListener("pointercancel", (event) => {
  motion.dragging = false;
  stage.releasePointerCapture?.(event.pointerId);
});

stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleEnvelope();
  }
});

let lastTime = performance.now();
function animate(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  motion.x = THREE.MathUtils.damp(motion.x, motion.targetX, 7, delta);
  motion.y = THREE.MathUtils.damp(motion.y, motion.targetY, 7, delta);
  assembly.rotation.x = motion.x;
  assembly.rotation.y = motion.y;
  assembly.rotation.z = -0.03 + Math.sin(now * 0.00035) * 0.006;
  renderer.render(scene, camera);
  renderer.setAnimationLoop(animate);
}

updateMaterial();
renderer.setAnimationLoop(animate);
