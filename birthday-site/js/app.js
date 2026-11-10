(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // RC4-drop1024 解密器（支持 file:// 本地直接打开与 https:// 静态部署）
  const decryptPayload = (b64Cipher, passcode) => {
    try {
      const keyBytes = new TextEncoder().encode(`ag-salt-2026:${passcode.trim()}`);
      const binaryStr = window.atob(b64Cipher);
      const data = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i += 1) {
        data[i] = binaryStr.charCodeAt(i);
      }

      const S = new Uint8Array(256);
      for (let i = 0; i < 256; i += 1) S[i] = i;
      let j = 0;
      for (let i = 0; i < 256; i += 1) {
        j = (j + S[i] + keyBytes[i % keyBytes.length]) & 0xff;
        const tmp = S[i];
        S[i] = S[j];
        S[j] = tmp;
      }

      let x = 0;
      let y = 0;
      for (let n = 0; n < 1024; n += 1) {
        x = (x + 1) & 0xff;
        y = (y + S[x]) & 0xff;
        const tmp = S[x];
        S[x] = S[y];
        S[y] = tmp;
      }

      const out = new Uint8Array(data.length);
      for (let k = 0; k < data.length; k += 1) {
        x = (x + 1) & 0xff;
        y = (y + S[x]) & 0xff;
        const tmp = S[x];
        S[x] = S[y];
        S[y] = tmp;
        out[k] = data[k] ^ S[(S[x] + S[y]) & 0xff];
      }

      const decoded = new TextDecoder().decode(out);
      if (!decoded.startsWith("AG_OK:")) return null;
      return JSON.parse(decoded.slice(6));
    } catch {
      return null;
    }
  };

  const getPath = (object, path) =>
    path.split(".").reduce((value, key) => value?.[key], object);

  const observeRevealNodes = () => {
    const revealNodes = [...document.querySelectorAll("[data-reveal]:not(.is-in)")];
    if ("IntersectionObserver" in window && !reduceMotion.matches) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.06 },
      );
      revealNodes.forEach((node) => observer.observe(node));
    } else {
      revealNodes.forEach((node) => node.classList.add("is-in"));
    }
  };

  const applyContent = (content) => {
    window.BIRTHDAY_CONTENT = content;

    document.querySelectorAll("[data-bind]").forEach((node) => {
      const value = getPath(content, node.dataset.bind);
      if (typeof value === "string" && value.trim()) node.textContent = value;
    });

    const setPhoto = (selector, photo) => {
      if (!photo) return;
      const slot = document.querySelector(selector);
      const image = slot?.querySelector("img");
      const caption = slot?.querySelector("figcaption");
      if (!slot || !image) return;
      if (photo.src) image.src = photo.src;
      if (photo.alt) image.alt = photo.alt;
      image.style.objectPosition = photo.position || "center";
      if (caption && typeof photo.caption === "string") {
        caption.textContent = photo.caption;
      }
    };

    setPhoto('[data-photo-slot="first"]', content.photos?.first);
    setPhoto('[data-photo-slot="distanceLeft"]', content.photos?.distanceLeft);
    setPhoto('[data-photo-slot="distanceRight"]', content.photos?.distanceRight);

    const smallGallery = document.querySelector("[data-small-gallery]");
    if (smallGallery && Array.isArray(content.photos?.small) && content.photos.small.length) {
      smallGallery.replaceChildren(
        ...content.photos.small.map((photo, index) => {
          const figure = document.createElement("figure");
          figure.className = "small-things__photo";
          figure.dataset.reveal = "";
          figure.style.setProperty("--photo-index", index);

          const image = document.createElement("img");
          image.src = photo.src;
          image.alt = photo.alt || "";
          image.loading = "lazy";
          image.decoding = "async";
          image.style.objectPosition = photo.position || "center";

          const caption = document.createElement("figcaption");
          caption.textContent = photo.caption || "";

          figure.append(image, caption);
          return figure;
        }),
      );
    }

    document.querySelectorAll("[data-letter-group]").forEach((group) => {
      const paragraphs = content.letter?.groups?.[group.dataset.letterGroup];
      if (!Array.isArray(paragraphs) || !paragraphs.length) return;
      group.replaceChildren(
        ...paragraphs.map((text) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = text;
          return paragraph;
        }),
      );
    });

    observeRevealNodes();
    window.initTurntableAudio?.(content);
  };

  // 拆信锁屏控制
  const lockScreen = document.querySelector("[data-lock-screen]");
  const lockForm = document.querySelector("[data-lock-form]");
  const lockInput = document.querySelector("[data-lock-input]");
  const lockError = document.querySelector("[data-lock-error]");
  const lockCard = lockScreen?.querySelector(".lock-screen__card");

  const tryUnlock = (code) => {
    const encrypted = window.ENCRYPTED_BIRTHDAY_PAYLOAD;
    if (!encrypted) return false;
    const decrypted = decryptPayload(encrypted, code);
    if (!decrypted) return false;

    applyContent(decrypted);
    document.body.classList.remove("is-locked");
    lockScreen?.classList.add("is-unlocked");
    lockInput?.blur();
    try {
      window.sessionStorage.setItem("ag_pass_code", code.trim());
    } catch {}

    window.setTimeout(() => {
      window.startOpeningHandwriting?.();
    }, 180);
    return true;
  };

  if (lockScreen && window.ENCRYPTED_BIRTHDAY_PAYLOAD) {
    document.body.classList.add("is-locked");

    let savedCode = null;
    try {
      savedCode = window.sessionStorage.getItem("ag_pass_code");
    } catch {}

    if (savedCode && tryUnlock(savedCode)) {
      // 已在当前会话解锁
    } else {
      lockInput?.addEventListener("input", () => {
        if (lockError) lockError.textContent = "";
        const val = lockInput.value.trim();
        if (val.length === 4) {
          if (!tryUnlock(val)) {
            if (lockError) lockError.textContent = "暗号不对，再想想？";
            lockCard?.classList.remove("is-shaking");
            void lockCard?.offsetWidth;
            lockCard?.classList.add("is-shaking");
          }
        }
      });

      lockForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const val = lockInput?.value.trim() || "";
        if (!tryUnlock(val)) {
          if (lockError) lockError.textContent = "暗号不对，再想想？";
          lockCard?.classList.remove("is-shaking");
          void lockCard?.offsetWidth;
          lockCard?.classList.add("is-shaking");
        }
      });
    }
  } else if (window.BIRTHDAY_CONTENT) {
    applyContent(window.BIRTHDAY_CONTENT);
  }

  observeRevealNodes();

  const finale = document.querySelector(".finale");
  const lightButton = document.querySelector("[data-light-candle]");
  const candleStatus = document.querySelector("[data-candle-status]");
  const emberLayer = document.querySelector("[data-embers]");

  const scatterEmbers = () => {
    if (!emberLayer || reduceMotion.matches) return;
    emberLayer.replaceChildren();
    for (let index = 0; index < 18; index += 1) {
      const ember = document.createElement("span");
      ember.style.setProperty("--x", `${Math.random() * 360 - 180}px`);
      ember.style.setProperty("--y", `${-90 - Math.random() * 220}px`);
      ember.style.setProperty("--drift", `${Math.random() * 60 - 30}px`);
      ember.style.setProperty("--delay", `${Math.random() * 280}ms`);
      ember.style.setProperty("--size", `${2 + Math.random() * 5}px`);
      emberLayer.append(ember);
    }
    window.setTimeout(() => emberLayer.replaceChildren(), 2_800);
  };

  lightButton?.addEventListener("click", () => {
    const lit = finale?.classList.toggle("is-lit");
    lightButton.setAttribute("aria-pressed", String(Boolean(lit)));
    lightButton.firstChild.textContent = lit ? "光已经亮着" : "点亮这盏灯";
    if (candleStatus) {
      candleStatus.textContent = lit
        ? "生日快乐。愿这一束光真的被你看见。"
        : "光还没有亮起来。";
    }
    if (lit) scatterEmbers();
  });
})();
