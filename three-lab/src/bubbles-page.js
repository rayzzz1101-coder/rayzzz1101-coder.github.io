import * as THREE from "three";
import { getImpressions } from "./api.js";

const BUBBLE_CONFIG = {
  desktopMinimumDiameter: 30,
  desktopMaximumDiameter: 140,
  mobileMinimumDiameter: 28,
  mobileMaximumDiameter: 92,
  desktopLimit: 48,
  mobileLimit: 24,
  desktopGap: 7,
  mobileGap: 4,
  collisionPasses: 6,
  dragCollisionPasses: 5,
};

const DEFAULT_SURFACE = {
  roughness: 0.32,
  clearcoat: 0.74,
  transmission: 0.95,
  normal: 0,
  emboss: 0,
};

const surface = { ...DEFAULT_SURFACE };

let impressions = [];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const embedded = new URLSearchParams(window.location.search).get("embed") === "1";
const field = document.querySelector("#bubble-field");
const canvasHost = document.querySelector("#bubble-canvas");
const readout = document.querySelector(".bubble-lab-readout");
const selectedLabel = document.querySelector("#bubble-selected-label");
const selectedCount = document.querySelector("#bubble-selected-count");
const settingsOutput = document.querySelector("#settings-output");

const controls = {
  roughness: document.querySelector("#bubble-roughness"),
  clearcoat: document.querySelector("#bubble-clearcoat"),
  transmission: document.querySelector("#bubble-transmission"),
  normal: document.querySelector("#bubble-normal"),
  emboss: document.querySelector("#bubble-emboss"),
};

const outputs = {
  roughness: document.querySelector("#bubble-roughness-value"),
  clearcoat: document.querySelector("#bubble-clearcoat-value"),
  transmission: document.querySelector("#bubble-transmission-value"),
  normal: document.querySelector("#bubble-normal-value"),
  emboss: document.querySelector("#bubble-emboss-value"),
};

let models = [];
let selected = null;
let resizeFrame = 0;
let materialRefreshFrame = 0;
let readoutTimer = 0;
let readoutSequence = 0;
const meshById = new Map();
const bubbleById = new Map();

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededValue(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createSurfaceTextures() {
  const size = 256;
  const heightCanvas = document.createElement("canvas");
  const normalCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  normalCanvas.width = size;
  normalCanvas.height = size;

  const heightContext = heightCanvas.getContext("2d");
  const random = seededValue(60417);
  heightContext.fillStyle = "#808080";
  heightContext.fillRect(0, 0, size, size);

  for (let blob = 0; blob < 28; blob += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 8 + random() * 35;
    const raised = random() > 0.43;
    const gradient = heightContext.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(
      0,
      raised
        ? `rgba(255,255,255,${0.2 + random() * 0.22})`
        : `rgba(0,0,0,${0.12 + random() * 0.18})`,
    );
    gradient.addColorStop(0.6, "rgba(128,128,128,0.03)");
    gradient.addColorStop(1, "rgba(128,128,128,0)");
    heightContext.fillStyle = gradient;
    heightContext.beginPath();
    heightContext.ellipse(
      x,
      y,
      radius,
      radius * (0.55 + random() * 0.7),
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    heightContext.fill();
  }

  heightContext.save();
  heightContext.filter = "blur(1.2px)";
  for (let line = 0; line < 34; line += 1) {
    const x = random() * size;
    const y = random() * size;
    heightContext.lineWidth = 0.5 + random() * 1.8;
    heightContext.strokeStyle =
      random() > 0.5
        ? `rgba(255,255,255,${0.12 + random() * 0.16})`
        : `rgba(0,0,0,${0.1 + random() * 0.13})`;
    heightContext.beginPath();
    heightContext.arc(
      x,
      y,
      8 + random() * 30,
      random() * Math.PI,
      1.3 + random() * Math.PI,
    );
    heightContext.stroke();
  }
  heightContext.restore();

  const source = heightContext.getImageData(0, 0, size, size).data;
  const normalContext = normalCanvas.getContext("2d");
  const normalImage = normalContext.createImageData(size, size);
  const target = normalImage.data;

  const sample = (x, y) => {
    const wrappedX = (x + size) % size;
    const wrappedY = (y + size) % size;
    return source[(wrappedY * size + wrappedX) * 4] / 255;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * 4;
      const dy = (sample(x, y - 1) - sample(x, y + 1)) * 4;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * size + x) * 4;
      target[index] = Math.round((dx / length * 0.5 + 0.5) * 255);
      target[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      target[index + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      target[index + 3] = 255;
    }
  }
  normalContext.putImageData(normalImage, 0, 0);

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  const heightTexture = new THREE.CanvasTexture(heightCanvas);
  [normalTexture, heightTexture].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.4, 1.4);
    texture.anisotropy = 4;
  });
  normalTexture.colorSpace = THREE.NoColorSpace;
  heightTexture.colorSpace = THREE.NoColorSpace;

  return { normalTexture, heightTexture };
}

const { normalTexture, heightTexture } = createSurfaceTextures();
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
camera.position.z = 400;

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
canvasHost.append(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xfffbf3, 0x5c4535, 0.72));

const keyLight = new THREE.DirectionalLight(0xfff5e5, 2.4);
keyLight.position.set(-5, 6, 7);
scene.add(keyLight);

const transmittedLight = new THREE.DirectionalLight(0xcfe5e9, 0.34);
transmittedLight.position.set(3, -2, 4);
scene.add(transmittedLight);

const toneSettings = {
  black: 0x292a26,
};

const materials = new Map(
  Object.entries(toneSettings).map(([tone, color]) => [
    tone,
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: surface.roughness,
      metalness: 0,
      clearcoat: surface.clearcoat,
      clearcoatRoughness: 0.42,
      transmission: 0,
      thickness: 0.28,
      ior: 1.18,
      attenuationColor: new THREE.Color(color),
      attenuationDistance: 0.42,
      specularIntensity: 0.08,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(surface.normal, surface.normal),
      bumpMap: heightTexture,
      bumpScale: surface.emboss,
      envMapIntensity: 0.22,
      transparent: true,
      opacity: THREE.MathUtils.lerp(0.52, 0.035, surface.transmission),
      depthWrite: false,
    }),
  ]),
);

const bubbleGeometry = new THREE.SphereGeometry(0.5, 64, 44);

function updateSurface() {
  Object.keys(controls).forEach((key) => {
    surface[key] = Number(controls[key].value);
  });

  materials.forEach((material) => {
    material.roughness = surface.roughness;
    material.clearcoat = surface.clearcoat;
    material.clearcoatRoughness = 0.26 + surface.roughness * 0.42;
    material.transmission = 0;
    material.opacity = THREE.MathUtils.lerp(
      0.52,
      0.035,
      surface.transmission,
    );
    material.normalScale.set(surface.normal, surface.normal);
    material.bumpScale = surface.emboss;
    material.needsUpdate = true;
  });

  outputs.roughness.textContent = surface.roughness.toFixed(2);
  outputs.clearcoat.textContent = surface.clearcoat.toFixed(2);
  outputs.transmission.textContent = surface.transmission.toFixed(2);
  outputs.normal.textContent = surface.normal.toFixed(2);
  outputs.emboss.textContent = surface.emboss.toFixed(4);
  settingsOutput.textContent =
    `ROUGHNESS ${surface.roughness.toFixed(2)} · ` +
    `CLEARCOAT ${surface.clearcoat.toFixed(2)} · ` +
    `TRANSMISSION ${surface.transmission.toFixed(2)} · ` +
    `NORMAL ${surface.normal.toFixed(2)} · ` +
    `BUMP ${surface.emboss.toFixed(4)}`;
}

function resizeRenderer() {
  const width = Math.max(1, canvasHost.clientWidth);
  const height = Math.max(1, canvasHost.clientHeight);
  renderer.setSize(width, height, false);
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
  models.forEach((model) => {
    const mesh = meshById.get(model.keyword.id);
    if (mesh) {
      mesh.userData.targetX = model.x - width / 2;
      mesh.userData.targetY = height / 2 - model.y;
      if (reducedMotion.matches) {
        mesh.position.set(mesh.userData.targetX, mesh.userData.targetY, mesh.position.z);
      }
    }
  });
}

function paint(model) {
  const bubble = bubbleById.get(model.keyword.id);
  if (bubble) {
    const angle = model.directionAngle;
    const angleDegrees = angle * (180 / Math.PI);
    bubble.style.left = `${model.x}px`;
    bubble.style.top = `${model.y}px`;
    bubble.style.transform =
      `translate(-50%, -50%) rotate(${angleDegrees}deg) ` +
      `scale(${1 + model.wobble * 0.22}, ${1 - model.wobble * 0.12})`;
    const label = bubble.querySelector(".bubble-label");
    if (label) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const localOffsetX =
        model.labelOffsetX * cosine + model.labelOffsetY * sine;
      const localOffsetY =
        -model.labelOffsetX * sine + model.labelOffsetY * cosine;
      label.style.transform =
        `translate(-50%, -50%) translate(${localOffsetX}px, ${localOffsetY}px) ` +
        `rotate(${-angleDegrees}deg) scale(${1 - model.wobble * 0.08})`;
    }
  }

  const mesh = meshById.get(model.keyword.id);
  if (mesh) {
    mesh.position.x = model.x - field.clientWidth / 2;
    mesh.position.y = field.clientHeight / 2 - model.y;
    mesh.userData.targetX = mesh.position.x;
    mesh.userData.targetY = mesh.position.y;
  }
}

function setSelected(keyword) {
  selected = keyword;
  animateReadout(keyword);
  if (embedded && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "ray:bubble-select",
        item: {
          id: keyword.id,
          label: keyword.label,
          count: keyword.count,
        },
      },
      window.location.origin,
    );
  }
  field.querySelectorAll(".impression-bubble").forEach((bubble) => {
    const isSelected = bubble.dataset.keywordId === keyword.id;
    bubble.classList.toggle("is-selected", isSelected);
    bubble.setAttribute("aria-pressed", String(isSelected));
    const mesh = meshById.get(bubble.dataset.keywordId);
    if (mesh) {
      mesh.userData.targetScale =
        Number(bubble.dataset.diameter) * (isSelected ? 1.025 : 1);
    }
  });
}

function applyReadoutText(keyword) {
  selectedLabel.textContent = keyword.label;
  selectedCount.textContent = `${keyword.count}次提及`;
}

function animateReadout(keyword) {
  const sequence = ++readoutSequence;
  window.clearTimeout(readoutTimer);
  readout.classList.remove("is-leaving", "is-entering");

  if (reducedMotion.matches) {
    applyReadoutText(keyword);
    return;
  }

  void readout.offsetWidth;
  readout.classList.add("is-leaving");
  readoutTimer = window.setTimeout(() => {
    if (sequence !== readoutSequence) {
      return;
    }
    applyReadoutText(keyword);
    readout.classList.remove("is-leaving");
    void readout.offsetWidth;
    readout.classList.add("is-entering");
    readoutTimer = window.setTimeout(() => {
      if (sequence === readoutSequence) {
        readout.classList.remove("is-entering");
      }
    }, 440);
  }, 235);
}

function pack(keywords, width, height) {
  const mobile = width < 620;
  const minimum = mobile
    ? BUBBLE_CONFIG.mobileMinimumDiameter
    : BUBBLE_CONFIG.desktopMinimumDiameter;
  const maximum = mobile
    ? BUBBLE_CONFIG.mobileMaximumDiameter
    : BUBBLE_CONFIG.desktopMaximumDiameter;
  const padding = mobile ? 5 : 9;
  const gap = mobile ? BUBBLE_CONFIG.mobileGap : BUBBLE_CONFIG.desktopGap;
  const placed = [];

  keywords
    .slice()
    .sort((first, second) => second.count - first.count)
    .forEach((keyword) => {
      const diameter = Math.max(
        minimum,
        Math.min(maximum, 26 * Math.sqrt(keyword.count)),
      );
      const radius = diameter / 2;
      const random = seededValue(hashString(keyword.id));
      const startAngle = random() * Math.PI * 2;
      let position = null;

      for (let attempt = 0; attempt < 900; attempt += 1) {
        const progress = attempt / 900;
        const angle = startAngle + attempt * 2.399963;
        const distance = Math.sqrt(progress);
        const x =
          width / 2 +
          Math.cos(angle) * distance * (width / 2 - radius - padding);
        const y =
          height / 2 +
          Math.sin(angle) * distance * (height / 2 - radius - padding);
        const fits = placed.every(
          (item) =>
            Math.hypot(x - item.x, y - item.y) >
            radius + item.radius + gap,
        );
        if (fits) {
          position = { x, y };
          break;
        }
      }

      if (!position) {
        position = {
          x: width / 2 + (random() - 0.5) * Math.max(1, width - diameter),
          y: height / 2 + (random() - 0.5) * Math.max(1, height - diameter),
        };
      }
      placed.push({
        keyword,
        diameter,
        radius,
        mass: radius * radius,
        ...position,
        vx: 0,
        vy: 0,
        wobble: 0,
        wobbleVelocity: 0,
        directionAngle: 0,
        labelOffsetX: 0,
        labelOffsetY: 0,
        labelVelocityX: 0,
        labelVelocityY: 0,
        dragging: false,
      });
    });

  return placed;
}

function resolveBubbleCollisions(
  iterations = BUBBLE_CONFIG.collisionPasses,
) {
  const width = Math.max(280, field.clientWidth);
  const height = Math.max(300, field.clientHeight);
  const gap =
    width < 620 ? BUBBLE_CONFIG.mobileGap : BUBBLE_CONFIG.desktopGap;

  for (let pass = 0; pass < iterations; pass += 1) {
    let collided = false;

    for (let firstIndex = 0; firstIndex < models.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < models.length;
        secondIndex += 1
      ) {
        const first = models[firstIndex];
        const second = models[secondIndex];
        let deltaX = second.x - first.x;
        let deltaY = second.y - first.y;
        let distance = Math.hypot(deltaX, deltaY);
        const firstVisibleRadius =
          first.radius * (1 + Math.abs(first.wobble) * 0.68);
        const secondVisibleRadius =
          second.radius * (1 + Math.abs(second.wobble) * 0.68);
        const minimum = firstVisibleRadius + secondVisibleRadius + gap;

        if (distance >= minimum) {
          continue;
        }

        if (distance < 0.001) {
          const angle =
            hashString(`${first.keyword.id}-${second.keyword.id}`) %
            (Math.PI * 2);
          deltaX = Math.cos(angle);
          deltaY = Math.sin(angle);
          distance = 1;
        }

        collided = true;
        const normalX = deltaX / distance;
        const normalY = deltaY / distance;
        const inverseMassFirst = first.dragging ? 0 : 1 / first.mass;
        const inverseMassSecond = second.dragging ? 0 : 1 / second.mass;
        const inverseMassTotal = inverseMassFirst + inverseMassSecond || 1;
        const correction =
          Math.max(0, minimum - distance + 0.18) * 0.88;

        first.x -=
          normalX * correction * (inverseMassFirst / inverseMassTotal);
        first.y -=
          normalY * correction * (inverseMassFirst / inverseMassTotal);
        second.x +=
          normalX * correction * (inverseMassSecond / inverseMassTotal);
        second.y +=
          normalY * correction * (inverseMassSecond / inverseMassTotal);

        const relativeVelocity =
          (second.vx - first.vx) * normalX +
          (second.vy - first.vy) * normalY;
        if (relativeVelocity < 0) {
          const restitution = 0.26;
          const impulse =
            (-(1 + restitution) * relativeVelocity) / inverseMassTotal;
          first.vx -= impulse * inverseMassFirst * normalX;
          first.vy -= impulse * inverseMassFirst * normalY;
          second.vx += impulse * inverseMassSecond * normalX;
          second.vy += impulse * inverseMassSecond * normalY;
          const wobbleImpulse = Math.min(
            0.32,
            Math.abs(relativeVelocity) * 0.00042,
          );
          first.wobbleVelocity -= wobbleImpulse;
          second.wobbleVelocity += wobbleImpulse;
        }
      }
    }

    models.forEach((model) => {
      model.x = THREE.MathUtils.clamp(
        model.x,
        model.radius,
        width - model.radius,
      );
      model.y = THREE.MathUtils.clamp(
        model.y,
        model.radius,
        height - model.radius,
      );
    });

    if (!collided) {
      break;
    }
  }
}

function gather() {
  const width = Math.max(280, field.clientWidth);
  const height = Math.max(300, field.clientHeight);
  const targets = pack(
    models.map((model) => model.keyword),
    width,
    height,
  );
  const modelMap = new Map(
    models.map((model) => [model.keyword.id, model]),
  );
  targets.forEach((target) => {
    const model = modelMap.get(target.keyword.id);
    if (!model) {
      return;
    }
    model.x = target.x;
    model.y = target.y;
    model.vx = 0;
    model.vy = 0;
    model.wobble = 0;
    model.wobbleVelocity = 0;
    model.directionAngle = 0;
    model.labelOffsetX = 0;
    model.labelOffsetY = 0;
    model.labelVelocityX = 0;
    model.labelVelocityY = 0;
    paint(model);
  });
}

function syncMeshes() {
  const activeIds = new Set(models.map((model) => model.keyword.id));
  meshById.forEach((mesh, keywordId) => {
    if (activeIds.has(keywordId)) {
      return;
    }
    scene.remove(mesh);
    meshById.delete(keywordId);
  });

  models.forEach((model, index) => {
    let mesh = meshById.get(model.keyword.id);
    if (!mesh) {
      mesh = new THREE.Mesh(
        bubbleGeometry,
        materials.get(
        "black",
        ),
      );
      const random = seededValue(hashString(`mesh-${model.keyword.id}`));
      mesh.userData.spin = (random() - 0.5) * 0.16;
      mesh.userData.targetX = model.x - field.clientWidth / 2;
      mesh.userData.targetY = field.clientHeight / 2 - model.y;
      mesh.userData.targetScale = model.diameter;
      mesh.position.set(
        mesh.userData.targetX,
        mesh.userData.targetY,
        (random() - 0.5) * 0.3,
      );
      mesh.scale.setScalar(model.diameter);
      mesh.rotation.set(random() * 0.5, random() * Math.PI, random() * 0.3);
      scene.add(mesh);
      meshById.set(model.keyword.id, mesh);
    }
    mesh.userData.targetX = model.x - field.clientWidth / 2;
    mesh.userData.targetY = field.clientHeight / 2 - model.y;
    mesh.userData.targetScale =
      model.diameter * (model.keyword.id === selected?.id ? 1.025 : 1);
  });
}

function render() {
  const width = Math.max(280, field.clientWidth);
  const height = Math.max(300, field.clientHeight);
  const visible = impressions.slice()
    .sort((first, second) => second.count - first.count)
    .slice(
      0,
      width < 620
        ? BUBBLE_CONFIG.mobileLimit
        : BUBBLE_CONFIG.desktopLimit,
    );
  models = pack(visible, width, height);
  field.replaceChildren();
  bubbleById.clear();
  if (visible.length === 0) {
    field.append(
      createElement(
        "p",
        "module-status",
        "还没有通过审核的关键词。",
      ),
    );
    syncMeshes();
    return;
  }

  models.forEach((model, index) => {
    const { keyword, diameter } = model;
    const bubble = createElement("button", "impression-bubble");
    bubble.type = "button";
    bubble.dataset.keywordId = keyword.id;
    bubble.dataset.diameter = String(diameter);
    bubble.dataset.tone = "black";
    bubble.setAttribute("role", "listitem");
    bubble.setAttribute("aria-pressed", "false");
    bubble.setAttribute(
      "aria-label",
      `${keyword.label}，${keyword.count}次提及`,
    );
    bubble.style.width = `${diameter}px`;
    bubble.style.height = `${diameter}px`;
    bubble.style.left = `${model.x}px`;
    bubble.style.top = `${model.y}px`;
    bubble.style.setProperty("--bubble-delay", `${-((index * 1.7) % 9)}s`);
    bubble.append(createElement("span", "bubble-label", keyword.label));
    bubble.title = "拖动泡泡，松开后会带着惯性继续移动";

    bubble.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      bubble.setPointerCapture(event.pointerId);
      const bounds = field.getBoundingClientRect();
      bubble.dataset.dragging = "true";
      bubble.dataset.pointerId = String(event.pointerId);
      bubble.dataset.dragOffsetX = String(
        event.clientX - bounds.left - model.x,
      );
      bubble.dataset.dragOffsetY = String(
        event.clientY - bounds.top - model.y,
      );
      model.dragging = true;
      model.lastPointerX = event.clientX;
      model.lastPointerY = event.clientY;
      model.lastPointerAt = performance.now();
      model.vx = 0;
      model.vy = 0;
      model.wobbleVelocity += 0.35;
      bubble.classList.add("is-dragging");
    });
    bubble.addEventListener("pointermove", (event) => {
      if (
        bubble.dataset.dragging !== "true" ||
        bubble.dataset.pointerId !== String(event.pointerId)
      ) {
        return;
      }
      const bounds = field.getBoundingClientRect();
      const nextX = Math.max(
        model.radius,
        Math.min(
          bounds.width - model.radius,
          event.clientX - bounds.left - Number(bubble.dataset.dragOffsetX),
        ),
      );
      const nextY = Math.max(
        model.radius,
        Math.min(
          bounds.height - model.radius,
          event.clientY - bounds.top - Number(bubble.dataset.dragOffsetY),
        ),
      );
      const now = performance.now();
      const elapsed = Math.max(8, now - model.lastPointerAt) / 1000;
      const deltaX = nextX - model.x;
      const deltaY = nextY - model.y;
      const targetVelocityX = THREE.MathUtils.clamp(deltaX / elapsed, -1600, 1600);
      const targetVelocityY = THREE.MathUtils.clamp(deltaY / elapsed, -1600, 1600);
      model.vx = THREE.MathUtils.lerp(model.vx, targetVelocityX, 0.48);
      model.vy = THREE.MathUtils.lerp(model.vy, targetVelocityY, 0.48);
      model.x = nextX;
      model.y = nextY;
      const maxLabelTravel = model.radius * 0.48;
      model.labelOffsetX = THREE.MathUtils.clamp(
        model.labelOffsetX - deltaX * 0.42,
        -maxLabelTravel,
        maxLabelTravel,
      );
      model.labelOffsetY = THREE.MathUtils.clamp(
        model.labelOffsetY - deltaY * 0.42,
        -maxLabelTravel,
        maxLabelTravel,
      );
      model.labelVelocityX = -targetVelocityX * 0.045;
      model.labelVelocityY = -targetVelocityY * 0.045;
      model.lastPointerX = event.clientX;
      model.lastPointerY = event.clientY;
      model.lastPointerAt = now;
      const speed = Math.hypot(deltaX, deltaY) / elapsed;
      if (speed > 1) {
        model.directionAngle = Math.atan2(deltaY, deltaX);
      }
      model.wobbleVelocity = Math.max(
        model.wobbleVelocity,
        Math.min(1.05, speed * 0.0016),
      );
      paint(model);
      resolveBubbleCollisions();
    });
    const finishDrag = (event) => {
      if (bubble.dataset.dragging !== "true") {
        return;
      }
      model.dragging = false;
      if (performance.now() - model.lastPointerAt > 90) {
        model.vx *= 0.16;
        model.vy *= 0.16;
      }
      bubble.dataset.dragging = "false";
      bubble.classList.remove("is-dragging");
      bubble.releasePointerCapture?.(event.pointerId);
    };
    bubble.addEventListener("pointerup", finishDrag);
    bubble.addEventListener("pointercancel", finishDrag);
    bubble.addEventListener("pointerenter", (event) => {
      if (
        event.pointerType !== "mouse" ||
        model.dragging ||
        reducedMotion.matches
      ) {
        return;
      }

      const bounds = field.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      let awayX = model.x - pointerX;
      let awayY = model.y - pointerY;
      const distance = Math.hypot(awayX, awayY);

      if (distance < 0.001) {
        awayX = 0;
        awayY = -1;
      } else {
        awayX /= distance;
        awayY /= distance;
      }

      model.vx += awayX * 34;
      model.vy += awayY * 34;
      model.directionAngle = Math.atan2(awayY, awayX);
      model.wobbleVelocity += 0.3;
    });
    bubble.addEventListener("click", (event) => {
      setSelected(keyword);
      if (event.detail === 0) {
        bubble.focus({ preventScroll: true });
      }
    });
    field.append(bubble);
    bubbleById.set(keyword.id, bubble);
    paint(model);
  });

  syncMeshes();
  setSelected(
    visible.find((keyword) => keyword.id === selected?.id) ?? visible[0],
  );
}

controls.roughness.addEventListener("input", () => {
  window.cancelAnimationFrame(materialRefreshFrame);
  materialRefreshFrame = window.requestAnimationFrame(updateSurface);
});
controls.clearcoat.addEventListener("input", updateSurface);
controls.transmission.addEventListener("input", updateSurface);
controls.normal.addEventListener("input", updateSurface);
controls.emboss.addEventListener("input", updateSurface);

document.querySelector("#reset-controls").addEventListener("click", () => {
  Object.assign(surface, DEFAULT_SURFACE);
  Object.entries(controls).forEach(([key, input]) => {
    input.value = String(surface[key]);
  });
  updateSurface();
});

window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    resizeRenderer();
    render();
  });
});

const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const width = Math.max(280, field.clientWidth);
  const height = Math.max(300, field.clientHeight);
  const centerX = width / 2;
  const centerY = height / 2;
  const maximumMass = Math.max(...models.map((model) => model.mass), 1);

  models.forEach((model) => {
    model.previousX = model.x;
    model.previousY = model.y;

    if (!model.dragging && !reducedMotion.matches) {
      const weight = model.mass / maximumMass;
      const centerPull = 0.16 + weight * weight * 1.42;
      model.vx += (centerX - model.x) * centerPull * delta;
      model.vy += (centerY - model.y) * centerPull * delta;
      model.x += model.vx * delta;
      model.y += model.vy * delta;
      const damping = Math.exp(-(2.45 + weight * 0.9) * delta);
      model.vx *= damping;
      model.vy *= damping;

      if (model.x <= model.radius) {
        model.x = model.radius;
        model.vx = Math.abs(model.vx) * 0.48;
        model.wobbleVelocity -= Math.min(0.5, Math.abs(model.vy) * 0.001);
      } else if (model.x >= width - model.radius) {
        model.x = width - model.radius;
        model.vx = -Math.abs(model.vx) * 0.48;
        model.wobbleVelocity += Math.min(0.5, Math.abs(model.vy) * 0.001);
      }

      if (model.y <= model.radius) {
        model.y = model.radius;
        model.vy = Math.abs(model.vy) * 0.48;
        model.wobbleVelocity += Math.min(0.5, Math.abs(model.vx) * 0.001);
      } else if (model.y >= height - model.radius) {
        model.y = height - model.radius;
        model.vy = -Math.abs(model.vy) * 0.48;
        model.wobbleVelocity -= Math.min(0.5, Math.abs(model.vx) * 0.001);
      }
    }
  });

  if (!reducedMotion.matches) {
    resolveBubbleCollisions();
  }

  models.forEach((model) => {
    const bodyDeltaX = model.x - model.previousX;
    const bodyDeltaY = model.y - model.previousY;
    model.labelOffsetX -= bodyDeltaX * 0.52;
    model.labelOffsetY -= bodyDeltaY * 0.52;
    model.labelVelocityX +=
      (-48 * model.labelOffsetX - 9.4 * model.labelVelocityX) * delta;
    model.labelVelocityY +=
      (-48 * model.labelOffsetY - 9.4 * model.labelVelocityY) * delta;
    model.labelOffsetX += model.labelVelocityX * delta;
    model.labelOffsetY += model.labelVelocityY * delta;

    const maxLabelTravel = model.radius * 0.48;
    model.labelOffsetX = THREE.MathUtils.clamp(
      model.labelOffsetX,
      -maxLabelTravel,
      maxLabelTravel,
    );
    model.labelOffsetY = THREE.MathUtils.clamp(
      model.labelOffsetY,
      -maxLabelTravel,
      maxLabelTravel,
    );

    if (reducedMotion.matches) {
      model.wobble = 0;
      model.wobbleVelocity = 0;
    } else {
      const bodySpeed = Math.hypot(model.vx, model.vy);
      if (bodySpeed > 2) {
        const targetAngle = Math.atan2(model.vy, model.vx);
        const angleDifference = Math.atan2(
          Math.sin(targetAngle - model.directionAngle),
          Math.cos(targetAngle - model.directionAngle),
        );
        model.directionAngle += angleDifference * Math.min(1, delta * 9);
      }
      model.wobbleVelocity +=
        (-62 * model.wobble - 8.2 * model.wobbleVelocity) * delta;
      model.wobble += model.wobbleVelocity * delta;
      model.wobble = THREE.MathUtils.clamp(model.wobble, -0.18, 0.18);
    }

    paint(model);
    const mesh = meshById.get(model.keyword.id);
    if (!mesh) {
      return;
    }
    const baseScale = mesh.userData.targetScale;
    mesh.scale.set(
      baseScale * (1 + model.wobble),
      baseScale * (1 - model.wobble * 0.58),
      baseScale * (1 - model.wobble * 0.26),
    );
    mesh.rotation.z = model.directionAngle;
    if (!reducedMotion.matches) {
      mesh.rotation.y += delta * mesh.userData.spin;
      mesh.rotation.x += delta * mesh.userData.spin * 0.22;
    }
  });
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

updateSurface();
resizeRenderer();

try {
  const response = await getImpressions();
  impressions = response.data;
} catch {
  impressions = [];
  field.replaceChildren(
    createElement(
      "p",
      "module-status module-status--error",
      "印象暂时没有抵达。请稍后再来看。",
    ),
  );
}
if (impressions.length) {
  render();
} else if (!field.querySelector(".module-status--error")) {
  render();
}
field.setAttribute("aria-busy", "false");
animate();

window.bubbleLab = {
  get data() {
    return structuredClone(impressions);
  },
  get material() {
    return structuredClone(surface);
  },
  get motion() {
    return models.map((model) => ({
      id: model.keyword.id,
      x: model.x,
      y: model.y,
      vx: model.vx,
      vy: model.vy,
      directionAngle: model.directionAngle,
      wobble: model.wobble,
      labelOffsetX: model.labelOffsetX,
      labelOffsetY: model.labelOffsetY,
    }));
  },
  get materialStats() {
    return [...materials].map(([tone, material]) => ({
      tone,
      color: `#${material.color.getHexString()}`,
      roughness: material.roughness,
      clearcoat: material.clearcoat,
      normalScale: material.normalScale.x,
      bumpScale: material.bumpScale,
      transparent: material.transparent,
      opacity: material.opacity,
    }));
  },
  get renderStats() {
    const firstMesh = meshById.values().next().value;
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      meshes: meshById.size,
      camera: {
        left: camera.left,
        right: camera.right,
        top: camera.top,
        bottom: camera.bottom,
        z: camera.position.z,
      },
      firstMesh: firstMesh
        ? {
            position: firstMesh.position.toArray(),
            scale: firstMesh.scale.toArray(),
            visible: firstMesh.visible,
          }
        : null,
    };
  },
  get config() {
    return structuredClone(BUBBLE_CONFIG);
  },
  reset() {
    render();
  },
  renderer: "three",
  prefersReducedMotion: reducedMotion.matches,
};
