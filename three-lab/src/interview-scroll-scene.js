import * as THREE from "three";

function createParchmentTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768 * 3;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const random = (() => {
    let seed = 9317;
    return () => {
      seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
      return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const wash = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  wash.addColorStop(0, "#efdfbf");
  wash.addColorStop(0.48, "#e8d4ad");
  wash.addColorStop(1, "#d9c095");
  context.fillStyle = wash;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(220, 120, 0, 220, 120, 560);
  glow.addColorStop(0, "rgba(255,255,255,.38)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let fiber = 0; fiber < 2200; fiber += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const length = 1 + random() * 10;
    context.strokeStyle =
      random() > 0.48
        ? `rgba(94,70,40,${0.018 + random() * 0.025})`
        : `rgba(255,248,226,${0.04 + random() * 0.05})`;
    context.lineWidth = 0.35 + random() * 0.55;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + (random() - 0.5) * 1.2);
    context.stroke();
  }

  const lineGap = 72;
  context.strokeStyle = "rgba(89,70,44,.09)";
  context.lineWidth = 1;
  for (let y = 118; y < canvas.height - 40; y += lineGap) {
    context.beginPath();
    context.moveTo(92, y);
    context.lineTo(canvas.width - 92, y);
    context.stroke();
  }

  const shade = context.createLinearGradient(0, 0, 0, canvas.height);
  shade.addColorStop(0, "rgba(255,250,235,.16)");
  shade.addColorStop(0.1, "rgba(255,255,255,0)");
  shade.addColorStop(0.9, "rgba(86,58,30,0)");
  shade.addColorStop(1, "rgba(86,58,30,.12)");
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / 3, 1);
  return texture;
}

function createPageLabelTexture(page) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(48,42,31,.78)";
  context.font =
    '300 410px "Bodoni 72", "Didot", "Songti SC", serif';
  context.fillText(String(page + 1), canvas.width / 2, 360);
  context.fillStyle = "rgba(105,79,46,.53)";
  context.font = '22px "SFMono-Regular", Menlo, monospace';
  context.fillText(
    `FIELD NOTE / 0${page + 1}`,
    canvas.width / 2,
    625,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createWrapSeamGeometry(direction) {
  const points = [];
  const turns = 5.5;
  const segments = 132;
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const angle = direction * progress * turns * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * 1.045,
        progress - 0.5,
        Math.sin(angle) * 1.045,
      ),
    );
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

export function createInterviewScrollScene(
  host,
  { showPageLabels = true } = {},
) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 6000);
  camera.position.set(0, 0, 1400);
  const scrollGroup = new THREE.Group();
  scrollGroup.rotation.x = -0.13;
  scene.add(scrollGroup);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xfff6e8, 1.65));
  const keyLight = new THREE.DirectionalLight(0xffedcb, 3.1);
  keyLight.position.set(-3, 5, 7);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xb8cbd1, 0.55);
  rimLight.position.set(4, -2, 5);
  scene.add(rimLight);

  const paperTexture = createParchmentTexture();
  const wrapTexture = paperTexture.clone();
  wrapTexture.repeat.set(1, 1);
  wrapTexture.offset.set(0, 0);
  const paperGeometry = new THREE.PlaneGeometry(1, 1, 24, 32);
  const paperPositions = paperGeometry.attributes.position;
  for (let index = 0; index < paperPositions.count; index += 1) {
    const y = paperPositions.getY(index) + 0.5;
    const curve = Math.sin(y * Math.PI) * 2.4;
    paperPositions.setZ(index, curve);
  }
  paperPositions.needsUpdate = true;
  paperGeometry.computeVertexNormals();
  const paperMaterial = new THREE.MeshPhysicalMaterial({
    map: paperTexture,
    color: 0xf1dfbd,
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.62,
    side: THREE.DoubleSide,
  });
  const paper = new THREE.Mesh(paperGeometry, paperMaterial);
  paper.position.z = 0;
  scrollGroup.add(paper);

  const backingMaterial = new THREE.MeshPhysicalMaterial({
    map: wrapTexture,
    color: 0xdbc59e,
    roughness: 0.76,
    metalness: 0,
    clearcoat: 0.03,
    clearcoatRoughness: 0.75,
    side: THREE.DoubleSide,
  });
  const backingGeometry = new THREE.PlaneGeometry(1, 1, 16, 20);
  const paperUnderlays = Array.from({ length: 4 }, (_, index) => {
    const layer = new THREE.Mesh(backingGeometry, backingMaterial.clone());
    layer.position.set(0, 0, -1.2 - index * 0.75);
    layer.material.color.offsetHSL(
      0,
      -0.008 * index,
      -0.018 * (index + 1),
    );
    layer.renderOrder = 1;
    scrollGroup.add(layer);
    return layer;
  });

  const pageLabelGeometry = new THREE.PlaneGeometry(1, 1);
  const labelClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 1),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1),
  ];
  const pageLabelTextures = [0, 1, 2].map((page) =>
    createPageLabelTexture(page),
  );
  const pageLabels = pageLabelTextures.map((texture) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      clippingPlanes: labelClipPlanes,
    });
    const label = new THREE.Mesh(pageLabelGeometry, material);
    label.position.z = 18;
    label.renderOrder = 6;
    label.visible = showPageLabels;
    scrollGroup.add(label);
    return label;
  });

  const rodMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x9f7b4e,
    roughness: 0.38,
    metalness: 0.14,
    clearcoat: 0.34,
    clearcoatRoughness: 0.32,
  });
  const capMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x5f4028,
    roughness: 0.3,
    metalness: 0.22,
    emissive: 0x25160b,
    emissiveIntensity: 0.08,
  });
  const rodGeometry = new THREE.CylinderGeometry(1, 1, 1, 36, 1);
  const capGeometry = new THREE.SphereGeometry(1, 24, 14);
  const wrapGeometry = new THREE.CylinderGeometry(
    1,
    1,
    1,
    48,
    1,
    true,
  );
  const wrapMaterial = new THREE.MeshPhysicalMaterial({
    map: wrapTexture,
    color: 0xf0dfbd,
    roughness: 0.68,
    metalness: 0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const wrapSeamMaterial = new THREE.LineBasicMaterial({
    color: 0x715237,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const leftWrapSeamGeometry = createWrapSeamGeometry(1);
  const rightWrapSeamGeometry = createWrapSeamGeometry(-1);
  const leftRod = new THREE.Mesh(rodGeometry, rodMaterial);
  const rightRod = new THREE.Mesh(rodGeometry, rodMaterial);
  const leftWrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
  const rightWrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
  const leftWrapSeam = new THREE.Line(
    leftWrapSeamGeometry,
    wrapSeamMaterial,
  );
  const rightWrapSeam = new THREE.Line(
    rightWrapSeamGeometry,
    wrapSeamMaterial,
  );
  leftWrapSeam.renderOrder = 4;
  rightWrapSeam.renderOrder = 4;
  const leftTop = new THREE.Mesh(capGeometry, capMaterial);
  const leftBottom = new THREE.Mesh(capGeometry, capMaterial);
  const rightTop = new THREE.Mesh(capGeometry, capMaterial);
  const rightBottom = new THREE.Mesh(capGeometry, capMaterial);
  const leftRodGroup = new THREE.Group();
  const rightRodGroup = new THREE.Group();
  leftRodGroup.add(
    leftRod,
    leftWrap,
    leftWrapSeam,
    leftTop,
    leftBottom,
  );
  rightRodGroup.add(
    rightRod,
    rightWrap,
    rightWrapSeam,
    rightTop,
    rightBottom,
  );
  scrollGroup.add(leftRodGroup, rightRodGroup);

  let width = 1;
  let height = 1;
  let paperWidth = 1;
  let paperHeight = 1;
  let rodRadius = 1;
  let mergeProgress = 0;
  let pageIndex = 0;
  let pageOffset = 0;
  let rodTurn = 0;
  let rodWrapEnergy = 0;
  let animationFrame = 0;
  let mergeFrame = 0;
  let pageFrame = 0;
  const clock = new THREE.Clock();

  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    camera.position.z =
      (Math.max(height * 1.2, width / camera.aspect) / 2) /
      Math.tan(verticalFov / 2);
    camera.updateProjectionMatrix();

    rodRadius = THREE.MathUtils.clamp(width * 0.012, 8, 14);
    paperWidth = Math.max(1, width - rodRadius * 2.7);
    paperHeight = Math.max(1, height - rodRadius * 0.5);
    const rodHeight = Math.max(1, height - rodRadius * 0.4);
    paper.scale.set(paperWidth, paperHeight, 1);
    paperUnderlays.forEach((layer, index) => {
      layer.scale.set(
        paperWidth * (1 - index * 0.001),
        paperHeight * (1 - index * 0.001),
        1,
      );
      layer.position.set(0, 0, -1.2 - index * 0.75);
    });
    pageLabels.forEach((label, index) => {
      label.scale.setScalar(Math.min(paperWidth * 0.7, paperHeight * 0.55));
      label.position.x = index * paperWidth;
    });

    [leftRod, rightRod].forEach((rod) => {
      rod.scale.set(rodRadius, rodHeight, rodRadius);
    });
    [leftWrap, rightWrap].forEach((wrap) => {
      wrap.scale.set(rodRadius, rodHeight * 1.01, rodRadius);
      wrap.renderOrder = 2;
    });
    [leftWrapSeam, rightWrapSeam].forEach((seam) => {
      seam.scale.set(rodRadius, rodHeight * 1.01, rodRadius);
    });
    [leftTop, rightTop, leftBottom, rightBottom].forEach((cap) => {
      cap.scale.set(rodRadius * 1.15, rodRadius * 0.46, rodRadius * 1.15);
      cap.renderOrder = 3;
    });
    leftTop.position.y = rodHeight / 2;
    leftBottom.position.y = -rodHeight / 2;
    rightTop.position.y = rodHeight / 2;
    rightBottom.position.y = -rodHeight / 2;
    setMergeProgress(mergeProgress);
  }

  function setMergeProgress(progress) {
    mergeProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = mergeProgress * mergeProgress * (3 - 2 * mergeProgress);
    const paperScale = 1 - eased * 0.985;
    paper.scale.x = paperWidth * paperScale;
    paperMaterial.map.offset.x = pageOffset;
    paperUnderlays.forEach((layer, index) => {
      const stagger = index * 0.026;
      const layerProgress = THREE.MathUtils.clamp(
        (mergeProgress - stagger) / (1 - stagger),
        0,
        1,
      );
      const layerEased =
        layerProgress * layerProgress * (3 - 2 * layerProgress);
      const stackReveal = Math.sin(
        Math.PI * Math.min(mergeProgress / 0.88, 1),
      );
      const layerScale = 1 - layerEased * 0.982;
      const edgeOverhang = (index + 1) * 0.0025 * stackReveal;
      layer.scale.set(
        paperWidth * Math.min(1, layerScale + edgeOverhang),
        paperHeight * (1 - index * 0.001),
        1,
      );
      layer.position.x = (index + 1) * 1.15 * stackReveal;
      layer.position.y = -(index + 1) * 1.05 * stackReveal;
      layer.rotation.z =
        -(index + 1) * 0.00065 * stackReveal;
    });
    const pageProgress = pageOffset * 3;
    const paperOpening = paperWidth * paperScale;
    const wrapRadius = rodRadius * (1.02 + eased * 1.08);
    const labelSize = Math.min(
      paperHeight * 0.55,
      paperOpening * 0.7,
    );
    const rollOpacity = THREE.MathUtils.clamp(
      (1 - mergeProgress) / 0.26,
      0,
      1,
    );
    pageLabels.forEach((label, index) => {
      label.position.x = (index - pageProgress) * paperWidth;
      label.scale.setScalar(labelSize);
      label.material.opacity = rollOpacity;
    });

    const edge = paperWidth * 0.5 * paperScale;
    const clipBoundary = Math.max(0, edge - 2);
    labelClipPlanes[0].constant = clipBoundary;
    labelClipPlanes[1].constant = clipBoundary;
    const axisOffset = edge + wrapRadius + 2;
    leftRodGroup.position.set(-axisOffset, 0, 2);
    rightRodGroup.position.set(axisOffset, 0, 2);
    const rollAngle =
      Math.log(1 + eased * 1.8) / Math.log(2.8) * Math.PI * 6;
    leftRodGroup.rotation.y = rodTurn + rollAngle;
    rightRodGroup.rotation.y = rodTurn - rollAngle;
    const wrapOpacity = THREE.MathUtils.clamp(
      0.32 + rodWrapEnergy * 0.58 + mergeProgress * 0.45,
      0,
      1,
    );
    wrapMaterial.opacity = wrapOpacity;
    wrapSeamMaterial.opacity = THREE.MathUtils.clamp(
      wrapOpacity * 1.35,
      0,
      1,
    );
    const animatedWrapRadius =
      wrapRadius + rodRadius * rodWrapEnergy * 0.16;
    [leftWrap, rightWrap, leftWrapSeam, rightWrapSeam].forEach((wrap) => {
      wrap.scale.x = animatedWrapRadius;
      wrap.scale.z = animatedWrapRadius;
    });
  }

  function showPage(nextPage, duration = 900, onProgress) {
    const targetPage = THREE.MathUtils.clamp(nextPage, 0, 2);
    window.cancelAnimationFrame(pageFrame);
    const startOffset = pageOffset;
    const targetOffset = targetPage / 3;
    const startTurn = rodTurn;
    const targetTurn = targetPage * Math.PI * 2.4;
    const startedAt = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = progress * progress * (3 - 2 * progress);
        pageOffset = THREE.MathUtils.lerp(startOffset, targetOffset, eased);
        rodTurn = THREE.MathUtils.lerp(startTurn, targetTurn, eased);
        rodWrapEnergy = Math.sin(progress * Math.PI);
        paperTexture.offset.x = pageOffset;
        setMergeProgress(mergeProgress);
        onProgress?.(
          THREE.MathUtils.lerp(startOffset * 3, targetPage, eased),
        );
        if (progress < 1) {
          pageFrame = window.requestAnimationFrame(tick);
        } else {
          pageIndex = targetPage;
          pageFrame = 0;
          resolve(pageIndex);
        }
      };
      pageFrame = window.requestAnimationFrame(tick);
    });
  }

  function animateTo(targetProgress, duration = 980) {
    window.cancelAnimationFrame(mergeFrame);
    const startProgress = mergeProgress;
    const startedAt = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = progress * progress * (3 - 2 * progress);
        setMergeProgress(
          THREE.MathUtils.lerp(startProgress, targetProgress, eased),
        );
        if (progress < 1) {
          mergeFrame = window.requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      mergeFrame = window.requestAnimationFrame(tick);
    });
  }

  function animate() {
    const time = clock.getElapsedTime();
    scrollGroup.rotation.x = -0.13 + Math.sin(time * 0.55) * 0.004;
    scrollGroup.rotation.z = Math.sin(time * 0.38) * 0.0015;
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  animate();

  return {
    animateTo,
    showPage,
    get page() {
      return pageIndex;
    },
    merge(duration) {
      return animateTo(1, duration);
    },
    reset() {
      window.cancelAnimationFrame(mergeFrame);
      window.cancelAnimationFrame(pageFrame);
      pageIndex = 0;
      pageOffset = 0;
      rodTurn = 0;
      rodWrapEnergy = 0;
      paperTexture.offset.x = 0;
      setMergeProgress(0);
    },
    destroy() {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(mergeFrame);
      window.cancelAnimationFrame(pageFrame);
      resizeObserver.disconnect();
      paperGeometry.dispose();
      backingGeometry.dispose();
      pageLabelGeometry.dispose();
      rodGeometry.dispose();
      capGeometry.dispose();
      wrapGeometry.dispose();
      leftWrapSeamGeometry.dispose();
      rightWrapSeamGeometry.dispose();
      paperMaterial.dispose();
      paperUnderlays.forEach((layer) => layer.material.dispose());
      pageLabels.forEach((label) => label.material.dispose());
      pageLabelTextures.forEach((texture) => texture.dispose());
      backingMaterial.dispose();
      rodMaterial.dispose();
      capMaterial.dispose();
      wrapMaterial.dispose();
      wrapSeamMaterial.dispose();
      paperTexture.dispose();
      wrapTexture.dispose();
      renderer.dispose();
    },
  };
}
