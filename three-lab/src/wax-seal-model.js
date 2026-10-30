import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeWaxNumberMesh } from "./wax-digits.js";

const WAX_SETTINGS = {
  roughness: 0.21,
  clearcoat: 0.81,
  normal: 0.98,
  emboss: 0.014,
};

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

function makeWaxSurface({ wax, index, maxAnisotropy }) {
  const size = 512;
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
  const random = seedRandom(8111 + index * 197);

  const waxGradient = colorContext.createRadialGradient(
    236,
    220,
    16,
    256,
    256,
    250,
  );
  waxGradient.addColorStop(0, mixHexColors(wax, "#f4d5bd", 0.09));
  waxGradient.addColorStop(0.52, wax);
  waxGradient.addColorStop(0.82, mixHexColors(wax, "#28100c", 0.12));
  waxGradient.addColorStop(1, mixHexColors(wax, "#1e0b08", 0.32));
  colorContext.fillStyle = waxGradient;
  colorContext.fillRect(0, 0, size, size);

  for (let grain = 0; grain < 1300; grain += 1) {
    const alpha = 0.012 + random() * 0.045;
    colorContext.fillStyle = random() > 0.46
      ? `rgba(255,227,204,${alpha})`
      : `rgba(41,12,9,${alpha})`;
    colorContext.fillRect(
      random() * size,
      random() * size,
      0.45 + random() * 1.5,
      0.4 + random() * 1.25,
    );
  }

  heightContext.fillStyle = "#808080";
  heightContext.fillRect(0, 0, size, size);
  const heightRandom = seedRandom(9137 + index * 89);
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

  roughnessContext.fillStyle = "#8a8a8a";
  roughnessContext.fillRect(0, 0, size, size);
  const roughnessImage = roughnessContext.getImageData(0, 0, size, size);
  const roughnessPixels = roughnessImage.data;
  const roughnessRandom = seedRandom(10429 + index * 73);
  for (let pixel = 0; pixel < roughnessPixels.length; pixel += 4) {
    const value = 104 + Math.round(roughnessRandom() * 54);
    roughnessPixels[pixel] = value;
    roughnessPixels[pixel + 1] = value;
    roughnessPixels[pixel + 2] = value;
  }
  roughnessContext.putImageData(roughnessImage, 0, 0);

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
  const normalTexture = new THREE.CanvasTexture(
    makeNormalCanvas(heightCanvas, size, 18),
  );
  const displacementTexture = new THREE.CanvasTexture(heightCanvas);
  const textures = [
    colorTexture,
    roughnessTexture,
    normalTexture,
    displacementTexture,
  ];
  textures.forEach((texture) => {
    texture.anisotropy = maxAnisotropy;
  });

  return {
    colorTexture,
    roughnessTexture,
    normalTexture,
    displacementTexture,
    textures,
  };
}

function makeWaxBoundaryRadii(index) {
  const random = seedRandom(6607 + index * 151);
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

function makeWaxShape(index) {
  const shape = new THREE.Shape();
  makeWaxBoundaryRadii(index).forEach((radius, step, radii) => {
    const angle = (step / radii.length) * Math.PI * 2;
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
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.0035,
    bevelThickness: 0.003,
    curveSegments: 128,
  });
}

function makeUndulatingDiscGeometry(
  radius,
  angularSegments = 160,
  radialSegments = 56,
) {
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
        Math.sin(nx * -1.9 + ny * 3 - 0.9) * 0.3 +
        Math.cos(nx * 3.8 - ny * 2.3 + 1.3) * 0.15;
      const height = broadWave * radius * 0.025 * edgeFalloff;
      positions.push(x, y, height);
      surfaceHeights.push(height);
      uvs.push((x / radius) * 0.5 + 0.5, (y / radius) * 0.5 + 0.5);
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
  applySurfaceRelief(geometry, WAX_SETTINGS.normal);
  return geometry;
}

function applySurfaceRelief(geometry, relief) {
  const baseHeights = geometry.userData.surfaceHeights;
  const position = geometry.attributes.position;
  const color = geometry.attributes.color;
  for (let index = 0; index < position.count; index += 1) {
    const height = baseHeights[index] * relief * 0.65;
    position.setZ(index, height);
    const shade = THREE.MathUtils.clamp(
      1 + baseHeights[index] * relief * 120,
      0.62,
      1,
    );
    color.setXYZ(index, shade, shade, shade);
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function createWaxSealModel({
  wax,
  accent,
  number,
  index = 0,
  maxAnisotropy = 1,
}) {
  const surface = makeWaxSurface({ wax, index, maxAnisotropy });
  const root = new THREE.Group();
  root.name = `WaxSeal_${number}`;

  const waxMaterial = new THREE.MeshPhysicalMaterial({
    color: wax,
    roughness: WAX_SETTINGS.roughness,
    metalness: 0,
    clearcoat: WAX_SETTINGS.clearcoat,
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
      WAX_SETTINGS.normal * 0.12,
      WAX_SETTINGS.normal * 0.12,
    ),
    bumpMap: surface.displacementTexture,
    bumpScale: WAX_SETTINGS.normal * 0.0015,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.55,
    side: THREE.DoubleSide,
  });

  const bodySource = new THREE.ExtrudeGeometry(makeWaxShape(index), {
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
  new Set([
    bodySource,
    bodyGeometry,
    collarSource,
    collarGeometry,
    imprintBaseSource,
    imprintBaseGeometry,
  ]).forEach((geometry) => geometry.dispose());
  root.add(new THREE.Mesh(mergedBodyGeometry, waxMaterial));

  const reliefMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(wax).lerp(new THREE.Color(accent), 0.2),
    roughness: WAX_SETTINGS.roughness,
    metalness: 0,
    clearcoat: WAX_SETTINGS.clearcoat,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.82,
  });
  const imprintSurfaceZ = 0.015;
  const imprintPlate = new THREE.Mesh(
    makeUndulatingDiscGeometry(0.142),
    topMaterial,
  );
  imprintPlate.position.z = imprintSurfaceZ;
  imprintPlate.name = "RecessedWaxImprint";
  root.add(imprintPlate);

  const relief = new THREE.Group();
  relief.name = "WaxSealRelief";
  const reliefPivotZ = 0.0111;
  const reliefScaleZ =
    0.12 + (WAX_SETTINGS.emboss / WAX_SETTINGS.emboss) * 0.88;
  relief.position.z = imprintSurfaceZ - reliefPivotZ * reliefScaleZ;
  relief.scale.z = reliefScaleZ;

  [
    [0.108, 0.0034],
    [0.0925, 0.0026],
    [0.058, 0.0022],
  ].forEach(([radius, tube]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 7, 112),
      reliefMaterial,
    );
    ring.position.z = reliefPivotZ;
    relief.add(ring);
  });

  const beadMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.0028, 8, 6),
    reliefMaterial,
    64,
  );
  const beadMatrix = new THREE.Matrix4();
  for (let beadIndex = 0; beadIndex < 64; beadIndex += 1) {
    const angle = (beadIndex / 64) * Math.PI * 2;
    beadMatrix.makeTranslation(
      Math.cos(angle) * 0.1005,
      Math.sin(angle) * 0.1005,
      0.0118,
    );
    beadMesh.setMatrixAt(beadIndex, beadMatrix);
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
  const texturePoint = (x, y, z = 0.0108) =>
    new THREE.Vector3(
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

  const numberMesh = makeWaxNumberMesh(number.slice(0, 2), reliefMaterial);
  numberMesh.position.z = 0.0108;
  relief.add(numberMesh);
  root.add(relief);

  const dropMaterial = new THREE.MeshPhysicalMaterial({
    color: wax,
    roughness: WAX_SETTINGS.roughness,
    metalness: 0,
    clearcoat: WAX_SETTINGS.clearcoat,
    clearcoatRoughness: 0.26,
  });
  const dropRandom = seedRandom(347 + index * 73);
  [0.22, 1.36, 2.74, 4.18, 5.63].forEach((baseAngle) => {
    const angle = baseAngle + dropRandom() * 0.16;
    const dropRadius = 0.176 + dropRandom() * 0.022;
    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(0.029, 20, 12),
      dropMaterial,
    );
    droplet.position.set(
      Math.cos(angle) * dropRadius,
      Math.sin(angle) * dropRadius,
      -0.003 + (dropRandom() - 0.5) * 0.006,
    );
    droplet.scale.set(
      0.8 + dropRandom() * 0.55,
      0.52 + dropRandom() * 0.42,
      0.38 + dropRandom() * 0.24,
    );
    root.add(droplet);
  });

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
  return root;
}

export function disposeWaxSealModel(model) {
  if (!model) {
    return;
  }
  model.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
    }
  });
  Object.values(model.userData.materials ?? {}).forEach((material) => {
    material?.dispose();
  });
  model.userData.surface?.textures.forEach((texture) => texture.dispose());
}
