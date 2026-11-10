(() => {
  /* ==========================================================================
     1. 落地页精确逐字矢量书法与笔尖光点同步引擎
        - 原理：使用 macOS CoreText 提取的 Snell Roundhand 逐字精确矢量轮廓作为独立 <clipPath>，
          未书写到的笔画 stroke-dashoffset = 1（完全透明，无任何提前虚影）。
        - 每一帧由同一个 requestAnimationFrame 同时设置当前笔画的 strokeDashoffset 与
          getPointAtLength() 光点坐标，保证光点与笔锋 100% 严丝合缝重合。
     ========================================================================== */
  const calligraphyStage = document.querySelector("[data-calligraphy-stage]");
  let handwritingRafId = 0;

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const runHandwritingAnimation = () => {
    if (!calligraphyStage) return;
    window.cancelAnimationFrame(handwritingRafId);

    const strokes = [...calligraphyStage.querySelectorAll("[data-write-stroke]")];
    const penNib = calligraphyStage.querySelector("[data-pen-nib]");
    if (!strokes.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 初始化所有笔画的真实几何长度，确保 dasharray / dashoffset 与 getPointAtLength 使用完全一致的坐标系
    const strokeMeta = [];
    let cursorTime = 160;

    strokes.forEach((path) => {
      const totalLen = path.getTotalLength ? path.getTotalLength() : 100;
      const duration = Number(path.dataset.duration) || 300;
      path.style.strokeDasharray = `${totalLen}`;
      path.style.strokeDashoffset = reduceMotion ? "0" : `${totalLen}`;
      strokeMeta.push({
        path,
        totalLen,
        start: cursorTime,
        duration,
        end: cursorTime + duration,
      });
      cursorTime += duration + 18;
    });

    if (reduceMotion) {
      if (penNib) penNib.style.opacity = "0";
      return;
    }

    const startTime = performance.now();
    const totalDuration = strokeMeta[strokeMeta.length - 1].end;

    const tick = (now) => {
      const elapsed = now - startTime;
      let activeItem = null;

      for (let i = 0; i < strokeMeta.length; i += 1) {
        const item = strokeMeta[i];
        if (elapsed <= item.start) {
          item.path.style.strokeDashoffset = `${item.totalLen}`;
        } else if (elapsed >= item.end) {
          item.path.style.strokeDashoffset = "0";
        } else {
          const rawProgress = (elapsed - item.start) / item.duration;
          const eased = easeInOutCubic(Math.min(1, Math.max(0, rawProgress)));
          item.path.style.strokeDashoffset = `${(1 - eased) * item.totalLen}`;
          activeItem = { item, eased };
        }
      }

      if (penNib) {
        if (activeItem) {
          const pt = activeItem.item.path.getPointAtLength(
            activeItem.eased * activeItem.item.totalLen,
          );
          penNib.style.opacity = "1";
          penNib.setAttribute(
            "transform",
            `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`,
          );
        } else {
          penNib.style.opacity = "0";
        }
      }

      if (elapsed < totalDuration + 60) {
        handwritingRafId = window.requestAnimationFrame(tick);
      } else if (penNib) {
        penNib.style.opacity = "0";
      }
    };

    handwritingRafId = window.requestAnimationFrame(tick);
  };

  window.startOpeningHandwriting = runHandwritingAnimation;

  if (!document.body.classList.contains("is-locked")) {
    runHandwritingAnimation();
  }

  // 点击标题字迹可随时重新观看书写过程（无需额外按钮）
  calligraphyStage?.addEventListener("click", runHandwritingAnimation);

  /* ==========================================================================
     2. 极简黑胶唱盘与 S 型唱臂三段式落针交互
     ========================================================================== */
  const section = document.querySelector("[data-record-section]");
  const svg = section?.querySelector(".turntable__svg");
  const arm = section?.querySelector("[data-tonearm]");
  const platterToggle = section?.querySelector("[data-platter-toggle]");
  const dropTarget = section?.querySelector("[data-drop-target]");
  const needleContact = section?.querySelector("[data-needle-contact]");
  const status = section?.querySelector("[data-record-status]");
  const audio = document.querySelector("[data-audio]");
  const soundToggle = document.querySelector("[data-sound-toggle]");

  if (!section || !svg || !arm || !dropTarget || !audio) return;

  // S型唱臂旋转轴心 (740, 120)，静止位唱针尖 (727, 420)
  // 当旋转 36° 时，唱针尖恰好落在 (554, 354) 外圈音轨上
  const pivot = { x: 740, y: 120 };
  const stylusLocal = { dx: -13, dy: 300 };
  const restAngle = 0;
  const leadInAngle = 36;
  const innerGrooveAngle = 48;
  const targetMin = 24;
  const targetMax = 49;

  let angle = restAngle;
  let dragging = false;
  let playing = false;
  let fadingTimer;
  let progressTimer;
  let dragRect;
  let audioCtx;
  let candidateSources = [];
  let sourceIndex = 0;
  let targetVolume = 0.55;

  const configureAudio = (contentObj) => {
    if (!contentObj?.audio) return;
    candidateSources =
      Array.isArray(contentObj.audio.preferredSources) && contentObj.audio.preferredSources.length
        ? contentObj.audio.preferredSources
        : [contentObj.audio.src].filter(Boolean);
    sourceIndex = 0;
    targetVolume = Number(contentObj.audio.volume) || 0.55;
    if (candidateSources[0]) {
      audio.src = candidateSources[0];
    }
    audio.volume = 0;
    audio.loop = Boolean(contentObj.audio.loop);
    audio.setAttribute("aria-label", contentObj.audio.title || "孙燕姿 - 我要的幸福");
  };

  window.initTurntableAudio = configureAudio;
  if (window.BIRTHDAY_CONTENT) {
    configureAudio(window.BIRTHDAY_CONTENT);
  }

  const getAudioCtx = () => {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  };

  // 合成黑胶落针触盘的温暖低频轻响与微弱黑胶纹理声
  const playNeedleDropSound = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = "sine";
    thumpOsc.frequency.setValueAtTime(110, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(34, now + 0.14);
    thumpGain.gain.setValueAtTime(0.24, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.16);
  };

  const updateStylusContactPosition = (currentAngle) => {
    const rad = (currentAngle * Math.PI) / 180;
    const tipX =
      pivot.x + stylusLocal.dx * Math.cos(rad) - stylusLocal.dy * Math.sin(rad);
    const tipY =
      pivot.y + stylusLocal.dx * Math.sin(rad) + stylusLocal.dy * Math.cos(rad);

    if (needleContact) {
      needleContact.querySelectorAll("circle").forEach((c) => {
        c.setAttribute("cx", tipX.toFixed(1));
        c.setAttribute("cy", tipY.toFixed(1));
        c.style.transformOrigin = `${tipX.toFixed(1)}px ${tipY.toFixed(1)}px`;
      });
    }
  };

  const setAngle = (nextAngle, immediate = false) => {
    angle = Math.max(-2, Math.min(50, nextAngle));
    arm.style.transition = immediate ? "none" : "";
    arm.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    arm.setAttribute("aria-valuenow", String(Math.round(angle)));
    updateStylusContactPosition(angle);
  };

  const setState = (state, message) => {
    section.dataset.state = state;
    if (status && message) status.textContent = message;
  };

  const triggerNeedleRipple = () => {
    section.classList.remove("is-rippling");
    void section.offsetWidth;
    section.classList.add("is-rippling");
  };

  const startGrooveTracking = () => {
    window.clearInterval(progressTimer);
    progressTimer = window.setInterval(() => {
      if (!playing || dragging || audio.paused) return;
      const duration = audio.duration || 60;
      const ratio = Math.min(1, Math.max(0, audio.currentTime / duration));
      const trackedAngle = leadInAngle + ratio * (innerGrooveAngle - leadInAngle);
      setAngle(trackedAngle, true);
    }, 300);
  };

  const fadeIn = () => {
    window.clearInterval(fadingTimer);
    const steps = 22;
    let step = 0;
    audio.volume = 0;
    fadingTimer = window.setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / steps);
      audio.volume = targetVolume * Math.sin((progress * Math.PI) / 2);
      if (progress >= 1) window.clearInterval(fadingTimer);
    }, 40);
  };

  const startPlayback = async () => {
    if (playing) return;
    try {
      await audio.play();
      playing = true;
      setState("playing", "声音开始了。往下翻，我把话慢慢说给你。");
      if (soundToggle) {
        soundToggle.hidden = false;
        soundToggle.textContent = audio.muted ? "声音关" : "声音开";
        soundToggle.setAttribute("aria-pressed", String(!audio.muted));
      }
      fadeIn();
      startGrooveTracking();
    } catch {
      playing = false;
      setState("error", "音乐暂时没有响起，但下面的信还在。");
    }
  };

  const dropNeedle = (customAngle) => {
    const dropAngle =
      typeof customAngle === "number" && customAngle >= targetMin
        ? Math.min(innerGrooveAngle, customAngle)
        : leadInAngle;

    setState("dropping", "正在落针…");
    setAngle(dropAngle, false);

    window.setTimeout(() => {
      updateStylusContactPosition(dropAngle);
      playNeedleDropSound();
      triggerNeedleRipple();
      startPlayback();
    }, 520);
  };

  const liftNeedle = () => {
    window.clearInterval(fadingTimer);
    window.clearInterval(progressTimer);
    audio.pause();
    playing = false;
    setAngle(restAngle, false);
    setState("idle", "轻触唱片，或拨动唱臂落针。");
  };

  const pointAngle = (event) => {
    const rect = dragRect || svg.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * 880;
    const viewY = ((event.clientY - rect.top) / rect.height) * 580;
    const dx = viewX - pivot.x;
    const dy = Math.max(25, viewY - pivot.y);
    return (Math.atan2(-dx, dy) * 180) / Math.PI;
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    event.preventDefault();
    setAngle(pointAngle(event), true);
    const armed = angle >= targetMin && angle <= targetMax;
    setState(armed ? "armed" : "dragging", armed ? "松手落针。" : "移向唱片外圈。");
  };

  const finishDrag = () => {
    if (!dragging) return;
    dragging = false;
    dragRect = null;
    section.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", finishDrag);
    window.removeEventListener("pointercancel", finishDrag);

    if (angle >= targetMin && angle <= targetMax) {
      playing = false;
      dropNeedle(angle);
    } else {
      liftNeedle();
    }
  };

  arm.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dragging = true;
    dragRect = svg.getBoundingClientRect();
    section.classList.add("is-dragging");
    if (playing) {
      audio.pause();
      playing = false;
    }
    setAngle(pointAngle(event), true);
    setState("dragging", "移向唱片外圈。");
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
  });

  arm.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (playing) liftNeedle();
      else dropNeedle(leadInAngle);
    }
  });

  const toggleRecordPlayback = () => {
    if (playing) liftNeedle();
    else dropNeedle(leadInAngle);
  };

  dropTarget.addEventListener("click", () => dropNeedle(leadInAngle));
  platterToggle?.addEventListener("click", toggleRecordPlayback);
  platterToggle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleRecordPlayback();
    }
  });

  soundToggle?.addEventListener("click", () => {
    if (!playing && audio.paused) {
      dropNeedle(leadInAngle);
      return;
    }
    audio.muted = !audio.muted;
    soundToggle.textContent = audio.muted ? "声音关" : "声音开";
    soundToggle.setAttribute("aria-pressed", String(!audio.muted));
  });

  audio.addEventListener("error", () => {
    if (sourceIndex + 1 < candidateSources.length) {
      sourceIndex += 1;
      audio.src = candidateSources[sourceIndex];
      if (playing || section.dataset.state === "dropping") {
        startPlayback();
      }
      return;
    }
    setState("error", "音乐暂时没有响起，但下面的信还在。");
  });

  audio.addEventListener("ended", () => {
    liftNeedle();
    setState("idle", "音乐播完了。信还在往下继续。");
  });

  setAngle(restAngle, true);
})();
