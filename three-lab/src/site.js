import {
  MOCK_IMPRESSIONS,
  NOTES,
  PHOTOS,
} from "./content.js";
import {
  getImpressions,
  getPublishedQuestions,
  submitInterview,
  submitQuestion,
} from "./api.js";
import { createInterviewScrollScene } from "./interview-scroll-scene.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = window.matchMedia("(max-width: 720px)");
const interviewDraftKey = "ray-notes-interview-draft-v1";

const sectionLinks = [
  ...document.querySelectorAll('.site-nav a[href^="#"]'),
];
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const mobileSectionTargets = new Map([
  ["#impressions", document.querySelector("#impression-content")],
  ["#letters", document.querySelector("#qa-content")],
]);

sectionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      !mobileQuery.matches ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = mobileSectionTargets.get(link.getAttribute("href"));
    if (!target) {
      return;
    }
    event.preventDefault();
    history.replaceState(null, "", link.getAttribute("href"));
    target.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

const revealTargets = [
  ...document.querySelectorAll(
    ".paper-sheet, .section-intro, .note-card, .interview-sheet, .bubble-field-wrap, .letters-layout",
  ),
];

revealTargets.forEach((element, index) => {
  element.classList.add("scroll-reveal");
  element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 60}ms`);
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
  );
  revealTargets.forEach((element) => revealObserver.observe(element));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        sectionLinks.forEach((link) => {
          const isCurrent =
            link.getAttribute("href") === `#${entry.target.id}`;
          link.toggleAttribute("aria-current", isCurrent);
        });
      });
    },
    { rootMargin: "-24% 0px -62% 0px", threshold: 0 },
  );
  observedSections.forEach((section) => sectionObserver.observe(section));
} else {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
}

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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildNoteLedger() {
  const ledger = document.querySelector("#note-ledger");
  if (!ledger) {
    return;
  }

  NOTES.forEach((note) => {
    const article = createElement("article", "note-card");
    article.style.setProperty("--note-accent", note.accent);

    const imageWrap = createElement("div", "note-card-image");
    const image = createElement("img");
    image.src = note.image;
    image.alt = note.alt;
    image.loading = "lazy";
    image.decoding = "async";
    imageWrap.append(image);

    const copy = createElement("div", "note-card-copy");
    const meta = createElement(
      "p",
      "note-card-meta",
      `${note.number} / ${note.date}`,
    );
    const title = createElement("h3", null, note.title);
    const eyebrow = createElement("p", "note-card-eyebrow", note.eyebrow);
    const summary = createElement("p", "note-card-summary", note.summary);
    const button = createElement("button", "note-open", "在信纸上阅读");
    button.type = "button";
    button.setAttribute("aria-label", `阅读手记：${note.title}`);
    button.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("ray:open-note", { detail: { index: note.index } }),
      );
    });
    copy.append(meta, title, eyebrow, summary, button);
    article.append(imageWrap, copy);
    ledger.append(article);
  });
}

buildNoteLedger();

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

let allImpressions = [...MOCK_IMPRESSIONS];
let selectedImpression = allImpressions[0];
let bubbleModels = [];
const bubbleField = document.querySelector("#bubble-field");
const bubbleSelectedLabel = document.querySelector("#bubble-selected-label");
const bubbleSelectedCount = document.querySelector("#bubble-selected-count");
const bubbleNote = document.querySelector(".bubble-note");
const impressionDialog = document.querySelector("#impression-dialog");
const allImpressionsList = document.querySelector("#all-impressions-list");
let impressionReadoutTimer = 0;
let impressionReadoutSequence = 0;

function setSelectedImpression(keyword) {
  selectedImpression = keyword;
  const sequence = ++impressionReadoutSequence;
  window.clearTimeout(impressionReadoutTimer);
  bubbleNote.classList.remove("is-leaving", "is-entering");

  const applyText = () => {
    bubbleSelectedLabel.textContent = keyword.label;
    bubbleSelectedCount.textContent = `${keyword.count}次提及`;
  };

  if (reducedMotion.matches) {
    applyText();
  } else {
    void bubbleNote.offsetWidth;
    bubbleNote.classList.add("is-leaving");
    impressionReadoutTimer = window.setTimeout(() => {
      if (sequence !== impressionReadoutSequence) {
        return;
      }
      applyText();
      bubbleNote.classList.remove("is-leaving");
      void bubbleNote.offsetWidth;
      bubbleNote.classList.add("is-entering");
      impressionReadoutTimer = window.setTimeout(() => {
        if (sequence === impressionReadoutSequence) {
          bubbleNote.classList.remove("is-entering");
        }
      }, 440);
    }, 235);
  }

  document.querySelectorAll(".impression-bubble").forEach((bubble) => {
    const selected = bubble.dataset.keywordId === keyword.id;
    bubble.classList.toggle("is-selected", selected);
    bubble.setAttribute("aria-pressed", String(selected));
  });
}

window.addEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin ||
    event.data?.type !== "ray:bubble-select" ||
    !event.data.item
  ) {
    return;
  }
  setSelectedImpression(event.data.item);
});

function packBubblePositions(keywords, width, height) {
  const largestCount = Math.max(...keywords.map((keyword) => keyword.count), 1);
  const mobile = width < 620;
  const minimum = mobile ? 28 : 30;
  const maximum = mobile ? 92 : 140;
  const padding = mobile ? 5 : 9;
  const positioned = [];

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
      let placement = null;

      for (let attempt = 0; attempt < 720; attempt += 1) {
        const progress = attempt / 720;
        const angle = startAngle + attempt * 2.399963;
        const distance = Math.sqrt(progress);
        const x =
          width / 2 +
          Math.cos(angle) * distance * (width / 2 - radius - padding);
        const y =
          height / 2 +
          Math.sin(angle) * distance * (height / 2 - radius - padding);

        const fits = positioned.every((placed) => {
          const gap = mobile ? 4 : 7;
          return (
            Math.hypot(x - placed.x, y - placed.y) >
            radius + placed.radius + gap
          );
        });

        if (fits) {
          placement = { x, y };
          break;
        }
      }

      if (!placement) {
        placement = {
          x: width / 2 + (random() - 0.5) * Math.max(1, width - diameter),
          y: height / 2 + (random() - 0.5) * Math.max(1, height - diameter),
        };
      }

      positioned.push({ keyword, diameter, radius, ...placement });
    });

  return { positioned, largestCount };
}

function renderBubbleField() {
  if (!bubbleField || allImpressions.length === 0) {
    return;
  }

  const width = Math.max(280, bubbleField.clientWidth);
  const height = Math.max(420, bubbleField.clientHeight);
  const visibleLimit = width < 620 ? 24 : 48;
  const visible = allImpressions
    .slice()
    .sort((first, second) => second.count - first.count)
    .slice(0, visibleLimit);
  const { positioned } = packBubblePositions(visible, width, height);
  bubbleModels = positioned;

  bubbleField.replaceChildren();
  positioned.forEach(({ keyword, diameter, x, y }, index) => {
    const bubble = createElement("button", "impression-bubble");
    bubble.type = "button";
    bubble.dataset.keywordId = keyword.id;
    bubble.setAttribute("role", "listitem");
    bubble.setAttribute("aria-pressed", "false");
    bubble.setAttribute(
      "aria-label",
      `${keyword.label}，来自 ${keyword.count} 次审核后的提及`,
    );
    bubble.style.width = `${diameter}px`;
    bubble.style.height = `${diameter}px`;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.setProperty("--bubble-delay", `${-((index * 1.7) % 9)}s`);
    bubble.style.setProperty(
      "--bubble-tone",
      index % 5 === 0 ? "accent" : index % 3 === 0 ? "deep" : "paper",
    );
    bubble.textContent = keyword.label;
    const model = positioned[index];
    bubble.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      bubble.setPointerCapture(event.pointerId);
      const bounds = bubbleField.getBoundingClientRect();
      bubble.dataset.dragging = "true";
      bubble.dataset.dragMoved = "false";
      bubble.dataset.pointerId = String(event.pointerId);
      bubble.dataset.dragOffsetX = String(
        event.clientX - bounds.left - model.x,
      );
      bubble.dataset.dragOffsetY = String(
        event.clientY - bounds.top - model.y,
      );
      bubble.classList.add("is-dragging");
    });
    bubble.addEventListener("pointermove", (event) => {
      if (
        bubble.dataset.dragging !== "true" ||
        bubble.dataset.pointerId !== String(event.pointerId)
      ) {
        return;
      }

      const bounds = bubbleField.getBoundingClientRect();
      const nextX = Math.max(
        model.radius,
        Math.min(
          bounds.width - model.radius,
          event.clientX -
            bounds.left -
            Number(bubble.dataset.dragOffsetX),
        ),
      );
      const nextY = Math.max(
        model.radius,
        Math.min(
          bounds.height - model.radius,
          event.clientY -
            bounds.top -
            Number(bubble.dataset.dragOffsetY),
        ),
      );
      if (
        Math.hypot(nextX - model.x, nextY - model.y) > 4 ||
        bubble.dataset.dragMoved === "true"
      ) {
        bubble.dataset.dragMoved = "true";
      }
      model.x = nextX;
      model.y = nextY;
      bubble.style.left = `${nextX}px`;
      bubble.style.top = `${nextY}px`;
      resolveBubbleCollisions(keyword.id, 5);
    });
    const finishDrag = (event) => {
      if (bubble.dataset.dragging !== "true") {
        return;
      }
      bubble.dataset.dragging = "false";
      bubble.classList.remove("is-dragging");
      bubble.releasePointerCapture?.(event.pointerId);
      if (bubble.dataset.dragMoved === "true") {
        compactBubbleCluster();
      }
    };
    bubble.addEventListener("pointerup", finishDrag);
    bubble.addEventListener("pointercancel", finishDrag);
    bubble.addEventListener("click", () => {
      setSelectedImpression(keyword);
      bubble.focus({ preventScroll: true });
    });
    bubbleField.append(bubble);
  });

  setSelectedImpression(
    visible.find((keyword) => keyword.id === selectedImpression?.id) ??
      visible[0],
  );
}

function compactBubbleCluster() {
  if (bubbleModels.length === 0) {
    return;
  }

  const width = Math.max(280, bubbleField.clientWidth);
  const height = Math.max(420, bubbleField.clientHeight);
  const targets = packBubblePositions(
    bubbleModels.map((model) => model.keyword),
    width,
    height,
  ).positioned;
  const modelsByKeyword = new Map(
    bubbleModels.map((model) => [model.keyword.id, model]),
  );

  targets.forEach((target) => {
    const model = modelsByKeyword.get(target.keyword.id);
    if (!model) {
      return;
    }
    const bubble = bubbleField.querySelector(
      `[data-keyword-id="${model.keyword.id}"]`,
    );
    if (!bubble) {
      return;
    }
    model.x = target.x;
    model.y = target.y;
    bubble.classList.add("is-gathering");
    bubble.style.left = `${model.x}px`;
    bubble.style.top = `${model.y}px`;
    window.setTimeout(
      () => bubble.classList.remove("is-gathering"),
      reducedMotion.matches ? 0 : 760,
    );
  });
}

function resolveBubbleCollisions(anchorId, iterations = 6) {
  if (bubbleModels.length < 2) {
    return;
  }

  const width = Math.max(280, bubbleField.clientWidth);
  const height = Math.max(420, bubbleField.clientHeight);
  const gap = 7;

  for (let pass = 0; pass < iterations; pass += 1) {
    let moved = false;
    for (let firstIndex = 0; firstIndex < bubbleModels.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < bubbleModels.length;
        secondIndex += 1
      ) {
        const first = bubbleModels[firstIndex];
        const second = bubbleModels[secondIndex];
        let deltaX = second.x - first.x;
        let deltaY = second.y - first.y;
        let distance = Math.hypot(deltaX, deltaY);
        const minimum = first.radius + second.radius + gap;

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

        const overlap = minimum - distance;
        const normalX = deltaX / distance;
        const normalY = deltaY / distance;
        const firstIsAnchor = first.keyword.id === anchorId;
        const secondIsAnchor = second.keyword.id === anchorId;
        const firstShare = firstIsAnchor ? 0 : secondIsAnchor ? 1 : 0.5;
        const secondShare = 1 - firstShare;

        first.x -= normalX * overlap * firstShare;
        first.y -= normalY * overlap * firstShare;
        second.x += normalX * overlap * secondShare;
        second.y += normalY * overlap * secondShare;
        moved = true;
      }
    }

    bubbleModels.forEach((model) => {
      model.x = Math.max(
        model.radius,
        Math.min(width - model.radius, model.x),
      );
      model.y = Math.max(
        model.radius,
        Math.min(height - model.radius, model.y),
      );
      const bubble = bubbleField.querySelector(
        `[data-keyword-id="${model.keyword.id}"]`,
      );
      if (bubble) {
        bubble.style.left = `${model.x}px`;
        bubble.style.top = `${model.y}px`;
      }
    });

    if (!moved) {
      break;
    }
  }
}

function renderAllImpressions() {
  allImpressionsList.replaceChildren();
  if (allImpressions.length === 0) {
    const empty = createElement("li");
    empty.textContent = "还没有通过审核的印象。";
    allImpressionsList.append(empty);
    return;
  }
  allImpressions
    .slice()
    .sort((first, second) => second.count - first.count)
    .forEach((keyword, index) => {
      const item = createElement("li");
      const rank = createElement(
        "span",
        "impression-rank",
        String(index + 1).padStart(2, "0"),
      );
      const label = createElement("strong", null, keyword.label);
      const count = createElement(
        "span",
        "impression-count",
        `${keyword.count} 次`,
      );
      item.append(rank, label, count);
      allImpressionsList.append(item);
    });
}

async function loadImpressions() {
  bubbleField?.setAttribute("aria-busy", "true");
  try {
    const response = await getImpressions();
    allImpressions = response.data;
    if (allImpressions.length === 0) {
      selectedImpression = null;
      bubbleSelectedLabel.textContent = "等待审核";
      bubbleSelectedCount.textContent = "暂无公开印象";
      bubbleField?.replaceChildren(
        createElement(
          "p",
          "module-status",
          "这里还没有通过审核的关键词。",
        ),
      );
      renderAllImpressions();
      return;
    }
    selectedImpression = allImpressions[0];
    bubbleSelectedLabel.textContent = selectedImpression.label;
    bubbleSelectedCount.textContent = `${selectedImpression.count}次提及`;
    if (bubbleField) {
      renderBubbleField();
    }
    renderAllImpressions();
  } catch {
    allImpressions = [];
    selectedImpression = null;
    bubbleSelectedLabel.textContent = "暂时离线";
    bubbleSelectedCount.textContent = "印象读取失败";
    bubbleField?.replaceChildren(
      createElement(
        "p",
        "module-status module-status--error",
        "印象暂时没有抵达。请稍后再来看。",
      ),
    );
    const unavailableItem = createElement("li");
    unavailableItem.textContent = "印象暂时没有抵达。请稍后再来看。";
    allImpressionsList.replaceChildren(unavailableItem);
    const note = createElement(
      "p",
      "module-status module-status--error",
      "没有用旧数据代替实时结果。",
    );
    if (bubbleField?.firstElementChild) {
      bubbleField.firstElementChild.after(note);
    }
  } finally {
    bubbleField?.setAttribute("aria-busy", "false");
  }
}

let bubbleResizeFrame = 0;
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(bubbleResizeFrame);
  bubbleResizeFrame = window.requestAnimationFrame(renderBubbleField);
});

document
  .querySelector("#open-all-impressions")
  ?.addEventListener("click", () => impressionDialog.showModal());

impressionDialog?.addEventListener("click", (event) => {
  if (
    event.target === impressionDialog ||
    event.target.closest(".dialog-close")
  ) {
    impressionDialog.close();
  }
});

function loadInterviewDraft() {
  try {
    return JSON.parse(localStorage.getItem(interviewDraftKey) ?? "{}");
  } catch {
    return {};
  }
}

function saveInterviewDraft(answers) {
  try {
    localStorage.setItem(
      interviewDraftKey,
      JSON.stringify({ answers, updatedAt: Date.now() }),
    );
  } catch {
    // A private browsing session may reject storage. The form still works.
  }
}

const interviewForm = document.querySelector("#interview-form");
const interviewSteps = [...document.querySelectorAll(".interview-step")];
const interviewAnswers = [
  document.querySelector("#interview-answer-0"),
  document.querySelector("#interview-answer-1"),
  document.querySelector("#interview-answer-2"),
];
const interviewDots = [
  ...document.querySelectorAll(".interview-progress span"),
];
const interviewBack = document.querySelector("#interview-back");
const interviewNext = document.querySelector("#interview-next");
const interviewHint = document.querySelector("#interview-hint");
const interviewStatus = document.querySelector("#interview-status");
const interviewCompletion = document.querySelector(
  "#interview-preview-complete",
);
const interviewScene = createInterviewScrollScene(
  document.querySelector("#interview-scroll-canvas"),
  { showPageLabels: false },
);
let interviewStep = 0;
let interviewSubmitting = false;
let interviewTransitioning = false;

const interviewDraft = loadInterviewDraft();
interviewAnswers.forEach((input, index) => {
  input.value = interviewDraft.answers?.[index] ?? "";
});

function layoutInterviewStepPages(position) {
  interviewSteps.forEach((panel, index) => {
    const distance = index - position;
    panel.style.transform = `translate3d(${distance * 100}%, 0, 0)`;
    panel.style.visibility =
      Math.abs(distance) < 1.01 ? "visible" : "hidden";
  });
}

function updateInterviewStep({ focus = true } = {}) {
  interviewSteps.forEach((step, index) => {
    const current = index === interviewStep;
    step.classList.toggle("is-current", current);
    step.setAttribute("aria-hidden", String(!current));
    interviewAnswers[index].disabled = !current;
  });
  interviewDots.forEach((dot, index) => {
    dot.classList.toggle("is-current", index === interviewStep);
    dot.classList.toggle("is-done", index < interviewStep);
  });
  interviewBack.disabled =
    interviewStep === 0 || interviewTransitioning || interviewSubmitting;
  interviewNext.disabled = interviewTransitioning || interviewSubmitting;
  interviewHint.textContent = `${String(interviewStep + 1).padStart(2, "0")} / 03`;
  interviewNext.textContent =
    interviewStep === 2
      ? "寄出这份印象"
      : interviewAnswers[interviewStep].value.trim()
        ? "下一问"
        : "跳过这一问";
  if (focus) {
    interviewAnswers[interviewStep].focus({ preventScroll: true });
  }
}

async function transitionToInterviewStep(nextStep) {
  if (
    interviewTransitioning ||
    nextStep < 0 ||
    nextStep >= interviewSteps.length ||
    nextStep === interviewStep
  ) {
    return;
  }

  const turnDuration = reducedMotion.matches ? 0 : 900;
  interviewTransitioning = true;
  interviewForm.setAttribute("aria-busy", "true");
  updateInterviewStep({ focus: false });
  const pageTurn = interviewScene.showPage(
    nextStep,
    turnDuration,
    layoutInterviewStepPages,
  );
  const turnDeadline = new Promise((resolve) =>
    window.setTimeout(resolve, turnDuration + 80),
  );
  await Promise.race([pageTurn, turnDeadline]);
  interviewStep = nextStep;
  updateInterviewStep({ focus: false });
  layoutInterviewStepPages(interviewStep);
  interviewTransitioning = false;
  interviewForm.removeAttribute("aria-busy");
  updateInterviewStep();
}

interviewAnswers.forEach((input) => {
  input.addEventListener("input", () => {
    saveInterviewDraft(interviewAnswers.map((answer) => answer.value));
    if (interviewStep === 2) {
      return;
    }
    interviewNext.textContent = input.value.trim() ? "下一问" : "跳过这一问";
  });
});

interviewBack.addEventListener("click", () => {
  transitionToInterviewStep(Math.max(0, interviewStep - 1));
});

interviewNext.addEventListener("click", async () => {
  if (interviewStep < 2) {
    transitionToInterviewStep(interviewStep + 1);
    return;
  }

  if (interviewSubmitting) {
    return;
  }

  interviewSubmitting = true;
  interviewNext.disabled = true;
  interviewNext.textContent = "正在把字迹烘干…";
  interviewStatus.textContent = "";
  interviewStatus.classList.remove("is-error", "is-success");

  try {
    await submitInterview({
      answers: interviewAnswers.map((answer, index) => ({
        promptId: `impression-${index + 1}`,
        text: answer.value.trim(),
      })),
      consentToKeywords: true,
    });
    localStorage.removeItem(interviewDraftKey);
    interviewForm.classList.add("is-sent");
    interviewAnswers.forEach((answer) => {
      answer.disabled = true;
    });
    interviewBack.disabled = true;
    interviewNext.disabled = true;
    interviewStatus.textContent =
      "已经寄出。原始回答只会进入审核，页面上不会出现这些文字。";
    interviewStatus.classList.add("is-success");
    interviewNext.textContent = "已寄出";
    await completeInterviewSheet();
  } catch {
    interviewStatus.textContent =
      "这次没有寄到。回答已经留在本机，可以稍后再试。";
    interviewStatus.classList.add("is-error");
    interviewNext.disabled = false;
    interviewNext.textContent = "再寄一次";
  } finally {
    interviewSubmitting = false;
  }
});

async function completeInterviewSheet() {
  if (reducedMotion.matches) {
    interviewForm.hidden = true;
    interviewForm.classList.add("is-removed");
    interviewCompletion.hidden = false;
    return;
  }

  interviewForm.classList.add("is-rolling");
  await interviewScene.merge(1080);
  interviewForm.classList.add("is-rolled");

  await new Promise((resolve) => window.setTimeout(resolve, 360));
  const vanish = interviewForm.animate(
    [
      { opacity: 1 },
      { opacity: 0 },
    ],
    {
      duration: 460,
      easing: "cubic-bezier(0.4, 0, 0.8, 0.3)",
      fill: "forwards",
    },
  );
  await vanish.finished;
  interviewForm.classList.add("is-removed");
  interviewForm.hidden = true;
  interviewCompletion.hidden = false;
}

updateInterviewStep();
layoutInterviewStepPages(interviewStep);

const replyStack = document.querySelector("#reply-stack");

function renderQuestions(questions) {
  replyStack.replaceChildren();
  if (questions.length === 0) {
    replyStack.append(
      createElement("p", "module-status", "还没有已经寄回的信。"),
    );
    return;
  }

  questions.slice(0, 4).forEach((question, index) => {
    const article = createElement("article", "reply-card");
    const meta = createElement(
      "p",
      "reply-meta",
      `REPLY ${String(index + 1).padStart(2, "0")} / ${formatDate(question.askedAt)}`,
    );
    const title = createElement("h3", null, question.question);
    const answer = createElement("p", "reply-answer", question.answer);
    const from = createElement(
      "p",
      "reply-from",
      `FROM / ${question.displayName || "匿名来信"}`,
    );
    article.append(meta, title, answer, from);
    replyStack.append(article);
  });
}

async function loadQuestions() {
  try {
    const response = await getPublishedQuestions();
    renderQuestions(response.data);
  } catch {
    renderQuestions([
      {
        id: "offline",
        question: "来信暂时没有送到。",
        answer:
          "公开问答读取失败。你仍然可以留下问题，它会在恢复后进入审核队列。",
        askedAt: new Date().toISOString(),
        displayName: "系统便签",
      },
    ]);
  }
}

const askForm = document.querySelector("#ask-form");
const questionStatus = document.querySelector("#question-status");
const questionSubmit = document.querySelector("#question-submit");
let questionSubmitting = false;

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (questionSubmitting) {
    return;
  }

  const formData = new FormData(askForm);
  const question = String(formData.get("question") ?? "").trim();
  if (!question) {
    questionStatus.textContent = "至少留下一句话，再把它寄出去。";
    questionStatus.classList.add("is-error");
    return;
  }

  if (String(formData.get("website") ?? "")) {
    questionStatus.textContent = "这封信没有通过检查。";
    questionStatus.classList.add("is-error");
    return;
  }

  questionSubmitting = true;
  questionSubmit.disabled = true;
  questionSubmit.classList.add("is-folding");
  questionStatus.textContent = "正在折好这封信…";
  questionStatus.classList.remove("is-error", "is-success");

  try {
    await submitQuestion({
      question,
      displayName: String(formData.get("displayName") ?? "").trim(),
      consentToPublish: true,
      website: "",
    });
    askForm.reset();
    questionStatus.textContent =
      "已经寄到。它会先留在后台，回答与审核完成之前不会公开。";
    questionStatus.classList.add("is-success");
  } catch {
    questionStatus.textContent =
      "信没有寄出去。内容还在表格里，可以稍后再试。";
    questionStatus.classList.add("is-error");
  } finally {
    questionSubmitting = false;
    questionSubmit.disabled = false;
    questionSubmit.classList.remove("is-folding");
  }
});

const photoSky = document.querySelector("#photo-sky");
const photoAccessibleList = document.querySelector("#photo-accessible-list");
const photoDialog = document.querySelector("#photo-dialog");
const photoDialogImage = document.querySelector("#photo-dialog-image");
const photoDialogDate = document.querySelector("#photo-dialog-date");
const photoDialogTitle = document.querySelector("#photo-dialog-title");
const photoDialogStory = document.querySelector("#photo-dialog-story");
const photoDialogTags = document.querySelector("#photo-dialog-tags");
let lastPhotoTrigger = null;

function photoRenderSource(photo) {
  return photo.srcset.split(",")[0].trim().split(/\s+/)[0] || photo.src;
}

function openPhoto(photo, trigger) {
  lastPhotoTrigger = trigger ?? null;
  photoDialogImage.src = photoRenderSource(photo);
  photoDialogImage.removeAttribute("srcset");
  photoDialogImage.alt = photo.alt;
  photoDialogDate.textContent = `${photo.date} / FIELD IMAGE`;
  photoDialogTitle.textContent = photo.title;
  photoDialogStory.textContent = photo.story;
  photoDialogTags.replaceChildren(
    ...photo.tags.map((tag) => createElement("li", null, tag)),
  );
  if (!photoDialog.open) {
    photoDialog.showModal();
  }
}

function closePhoto() {
  if (photoDialog.open) {
    photoDialog.close();
  }
  lastPhotoTrigger?.focus?.({ preventScroll: true });
}

photoDialog.addEventListener("click", (event) => {
  if (
    event.target === photoDialog ||
    event.target.closest(".dialog-close") ||
    event.target.closest("#photo-dialog-return")
  ) {
    closePhoto();
  }
});

function buildPhotoAccess() {
  photoAccessibleList.replaceChildren();

  PHOTOS.forEach((photo) => {
    const listItem = createElement("li");
    const accessibleButton = createElement(
      "button",
      null,
      `${photo.title}，${photo.date}`,
    );
    accessibleButton.type = "button";
    accessibleButton.addEventListener("click", () =>
      openPhoto(photo, accessibleButton),
    );
    listItem.append(accessibleButton);
    photoAccessibleList.append(listItem);
  });
}

let rainFrame = 0;
let rainLastTime = 0;
let skyVisible = false;
let rainQueue = [];
let activeRainCards = [];
let rainSpawnTimer = 0;
let lastRainedPhotoId = null;
const rainSpeedMultiplier = 2;

function makeRandomPhotoQueue() {
  const queue = PHOTOS.slice();
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [queue[index], queue[randomIndex]] = [queue[randomIndex], queue[index]];
  }
  if (
    queue.length > 1 &&
    queue[0].id === lastRainedPhotoId
  ) {
    const swapIndex = 1 + Math.floor(Math.random() * (queue.length - 1));
    [queue[0], queue[swapIndex]] = [queue[swapIndex], queue[0]];
  }
  return queue;
}

function getRainFallSpeed(progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped < 0.48) {
    const entryProgress = clamped / 0.48;
    return 1.48 - 0.78 * Math.sin(entryProgress * Math.PI * 0.5);
  }
  const exitProgress = (clamped - 0.48) / 0.52;
  return 0.7 + 0.72 * exitProgress * exitProgress;
}

function removeRainCards() {
  window.clearTimeout(rainSpawnTimer);
  document.querySelectorAll(".falling-photo").forEach((card) => card.remove());
  activeRainCards = [];
  rainQueue = [];
}

function createRainCard(photo) {
  const card = createElement("button", "falling-photo");
  card.type = "button";
  card.dataset.photoId = photo.id;
  card.setAttribute("aria-label", `接住照片：${photo.title}`);
  const photoShape = Math.floor(Math.random() * 3);
  card.dataset.shape =
    photoShape === 0 ? "square" : photoShape === 1 ? "wide" : "portrait";

  const image = document.createElement("img");
  image.src = photoRenderSource(photo);
  image.alt = photo.alt;
  image.decoding = "async";
  image.addEventListener("error", () => card.classList.add("has-image-error"));

  const caption = createElement("span", "falling-photo-caption", photo.title);
  card.append(image, caption);

  const width = photoSky.clientWidth;
  const slotCount = 4;
  const slotWidth = width / slotCount;
  const occupiedSlots = new Set(
    activeRainCards
      .filter((item) => !item.caught)
      .map((item) => item.slot),
  );
  const freeSlots = Array.from(
    { length: slotCount },
    (_, index) => index,
  ).filter((slot) => !occupiedSlots.has(slot));
  const slot = freeSlots[Math.floor(Math.random() * freeSlots.length)] ?? 0;
  const cardWidth = Math.min(180, Math.max(62, slotWidth - 22));
  const cardHeight = cardWidth * (photoSky.clientHeight < 520 ? 0.72 : 0.78);
  const item = {
    card,
    photo,
    slot,
    x: slot * slotWidth + (slotWidth - cardWidth) / 2,
    y: -cardHeight - Math.random() * 320,
    width: cardWidth,
    height: cardHeight,
    speed: 30 + Math.random() * 50,
    drift: 0,
    rotation: -7 + Math.random() * 14,
    rotationSpeed: -1.8 + Math.random() * 3.6,
    time: Math.random() * 8,
    caught: false,
    dragging: false,
    dragged: false,
    suppressClick: false,
  };

  card.style.width = `${cardWidth}px`;
  card.style.transform =
    `translate3d(${item.x}px, ${item.y}px, 0) ` +
    `rotate(${item.rotation}deg)`;
  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    card.setPointerCapture(event.pointerId);
    const bounds = photoSky.getBoundingClientRect();
    item.dragging = true;
    item.dragged = false;
    item.suppressClick = false;
    item.slot = null;
    item.pointerOffsetX = event.clientX - bounds.left - item.x;
    item.pointerOffsetY = event.clientY - bounds.top - item.y;
    card.classList.add("is-dragging");
  });
  card.addEventListener("pointermove", (event) => {
    if (!item.dragging || item.caught) {
      return;
    }
    const bounds = photoSky.getBoundingClientRect();
    const nextX = Math.max(
      8,
      Math.min(
        bounds.width - item.width - 8,
        event.clientX - bounds.left - item.pointerOffsetX,
      ),
    );
    const nextY = Math.max(
      8,
      Math.min(
        bounds.height - item.height - 8,
        event.clientY - bounds.top - item.pointerOffsetY,
      ),
    );
    if (Math.hypot(nextX - item.x, nextY - item.y) > 4) {
      item.dragged = true;
    }
    item.x = nextX;
    item.y = nextY;
    card.style.transform =
      `translate3d(${item.x}px, ${item.y}px, 0) ` +
      `rotate(${item.rotation}deg)`;
  });
  const releasePhoto = (event) => {
    if (!item.dragging) {
      return;
    }
    item.dragging = false;
    card.classList.remove("is-dragging");
    card.releasePointerCapture?.(event.pointerId);

    if (!item.dragged) {
      return;
    }

    item.suppressClick = true;
    window.setTimeout(() => {
      item.suppressClick = false;
    }, 0);
  };
  card.addEventListener("pointerup", releasePhoto);
  card.addEventListener("pointercancel", releasePhoto);
  card.addEventListener("click", () => {
    if (item.suppressClick || item.dragging) {
      item.suppressClick = false;
      return;
    }
    catchRainPhoto(item);
  });
  photoSky.append(card);
  activeRainCards.push(item);
  return item;
}

function catchRainPhoto(item) {
  if (item.caught || !item.card.isConnected) {
    return;
  }

  item.caught = true;
  item.card.classList.add("is-caught");
  const centerX = (photoSky.clientWidth - item.width) / 2;
  const centerY = (photoSky.clientHeight - item.height) / 2;
  item.card.style.transform =
    `translate3d(${centerX}px, ${centerY}px, 0) ` +
    "rotate(0deg) scale(1.08)";
  window.setTimeout(() => {
    openPhoto(item.photo, item.card);
    activeRainCards = activeRainCards.filter(
      (candidate) => candidate !== item,
    );
    item.card.remove();
  }, reducedMotion.matches ? 0 : 480);
}

function animateRain(now) {
  if (
    !skyVisible ||
    document.visibilityState !== "visible" ||
    photoDialog.open
  ) {
    rainLastTime = now;
    rainFrame = window.requestAnimationFrame(animateRain);
    return;
  }

  const delta = Math.min((now - rainLastTime) / 1000, 0.04);
  rainLastTime = now;
  const skyHeight = photoSky.clientHeight;

  activeRainCards = activeRainCards.filter((item) => {
    if (item.caught) {
      return item.card.isConnected;
    }

    if (item.dragging) {
      return true;
    }

    item.time += delta;
    const fallProgress = (item.y + item.height) / (skyHeight + item.height);
    item.y +=
      item.speed *
      rainSpeedMultiplier *
      getRainFallSpeed(fallProgress) *
      delta;
    item.x += Math.sin(item.time * 0.8) * item.drift * delta;
    item.rotation += item.rotationSpeed * delta;
    item.card.style.transform =
      `translate3d(${item.x}px, ${item.y}px, 0) ` +
      `rotate(${item.rotation}deg)`;

    if (item.y > skyHeight + 20) {
      item.card.remove();
      return false;
    }
    return true;
  });

  rainFrame = window.requestAnimationFrame(animateRain);
}

function spawnNextPhoto() {
  if (!skyVisible) {
    return;
  }

  if (rainQueue.length === 0) {
    rainQueue = makeRandomPhotoQueue();
  }

  const concurrentLimit = 4;
  const available = concurrentLimit - activeRainCards.length;
  if (available <= 0) {
    rainSpawnTimer = window.setTimeout(spawnNextPhoto, 360);
    return;
  }
  const spawnCount = 1;

  for (let index = 0; index < spawnCount && rainQueue.length; index += 1) {
    const photo = rainQueue.shift();
    lastRainedPhotoId = photo.id;
    createRainCard(photo);
  }

  const buildingFirstWave = activeRainCards.length < concurrentLimit;
  const baseDelay = buildingFirstWave
    ? 180 + Math.random() * 360
    : 420 + Math.random() * 900;
  rainSpawnTimer = window.setTimeout(
    spawnNextPhoto,
    Math.max(140, baseDelay / rainSpeedMultiplier),
  );
}

function renderReducedPhotoGrid() {
  removeRainCards();
  photoSky.classList.add("is-reduced-motion");
  photoSky.replaceChildren();
  const header = createElement(
    "p",
    "sky-instruction",
    "REDUCED MOTION — 照片已按顺序落下",
  );
  const grid = createElement("div", "photo-grid");
  PHOTOS.forEach((photo) => {
    const card = createElement("button", "falling-photo is-static");
    card.type = "button";
    card.setAttribute("aria-label", `查看照片：${photo.title}`);
    const image = document.createElement("img");
    image.src = photoRenderSource(photo);
    image.alt = photo.alt;
    image.loading = "lazy";
    const caption = createElement(
      "span",
      "falling-photo-caption",
      photo.title,
    );
    card.append(image, caption);
    card.addEventListener("click", () => openPhoto(photo, card));
    grid.append(card);
  });
  photoSky.append(header, grid);
}

function launchRain() {
  if (reducedMotion.matches) {
    renderReducedPhotoGrid();
    return;
  }

  removeRainCards();
  photoSky.classList.remove("is-reduced-motion");
  photoSky.replaceChildren(
    createElement(
      "p",
      "sky-instruction",
      "DRAG ANYWHERE — TAP TO CATCH",
    ),
  );
  rainQueue = makeRandomPhotoQueue();
  rainLastTime = performance.now();
  spawnNextPhoto();
  window.cancelAnimationFrame(rainFrame);
  rainFrame = window.requestAnimationFrame(animateRain);
}

if ("IntersectionObserver" in window) {
  const skyObserver = new IntersectionObserver(
    ([entry]) => {
      skyVisible = entry.isIntersecting;
      if (!entry.isIntersecting) {
        return;
      }
      if (activeRainCards.length === 0) {
        launchRain();
      } else if (rainQueue.length > 0) {
        window.clearTimeout(rainSpawnTimer);
        spawnNextPhoto();
      }
    },
    { threshold: 0.18, rootMargin: "80px 0px" },
  );
  skyObserver.observe(photoSky);
} else {
  skyVisible = true;
  launchRain();
}

if (reducedMotion.matches) {
  renderReducedPhotoGrid();
}
reducedMotion.addEventListener?.("change", (event) => {
  if (event.matches) {
    renderReducedPhotoGrid();
  } else {
    launchRain();
  }
});

window.addEventListener("beforeunload", () => {
  window.cancelAnimationFrame(rainFrame);
});

window.addEventListener("error", () => {
  document.documentElement.classList.add("webgl-failed");
});

buildPhotoAccess();
loadImpressions();
loadQuestions();

function initTextWipeReveal() {
  if (reducedMotion.matches) {
    return;
  }

  const ignoredSelector = [
    "script",
    "style",
    "textarea",
    "input",
    "select",
    "option",
    "svg",
    "iframe",
    ".sr-only",
    "[aria-hidden='true']",
    ".text-wipe-unit",
    ".title-reveal-unit",
    ".impression-title-line",
    ".impression-copy-line",
    ".bubble-note",
    ".reader-overlay",
    ".reader-sheet",
  ].join(",");

  const titleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          entry.target.classList.remove("is-title-visible");
          return;
        }
        entry.target.classList.remove("is-title-visible");
        void entry.target.offsetWidth;
        entry.target.classList.add("is-title-visible");
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -2% 0px" },
  );

  const wrapTitleElement = (heading) => {
    if (
      heading.dataset.titleRevealReady === "true" ||
      heading.closest(
        ".reader-overlay, .reader-sheet, .sr-only, [aria-hidden='true']",
      )
    ) {
      return;
    }

    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue?.trim()) {
        textNodes.push(walker.currentNode);
      }
    }
    if (textNodes.length === 0) {
      return;
    }

    heading.setAttribute(
      "aria-label",
      heading.textContent.trim().replace(/\s+/g, " "),
    );
    let characterIndex = 0;
    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      Array.from(textNode.nodeValue).forEach((character) => {
        const unit = document.createElement("span");
        unit.className = "title-reveal-unit";
        unit.textContent = character;
        unit.setAttribute("aria-hidden", "true");
        unit.style.setProperty("--title-index", String(characterIndex));
        characterIndex += 1;
        fragment.append(unit);
      });
      textNode.replaceWith(fragment);
    });

    heading.dataset.titleRevealReady = "true";
    heading.classList.add("title-reveal-ready");
    titleObserver.observe(heading);
  };

  document.querySelectorAll("h1, h2, h3").forEach(wrapTitleElement);

  const textObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("is-visible");
        textObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -2% 0px" },
  );

  const wrapTextNode = (textNode) => {
    const parent = textNode.parentElement;
    const value = textNode.nodeValue;
    if (
      !parent ||
      !value ||
      !value.trim() ||
      parent.closest(ignoredSelector) ||
      window.getComputedStyle(parent).writingMode !== "horizontal-tb"
    ) {
      return;
    }

    const unit = document.createElement("span");
    unit.className = "text-wipe-unit";
    unit.textContent = value;
    unit.style.setProperty(
      "--wipe-color",
      window.getComputedStyle(parent).color,
    );
    unit.style.setProperty(
      "--wipe-duration",
      `${Math.min(1100, Math.max(460, value.trim().length * 24))}ms`,
    );
    textNode.replaceWith(unit);
    textObserver.observe(unit);
    unit.addEventListener(
      "animationend",
      () => {
        unit.classList.remove("text-wipe-unit", "is-visible");
        unit.style.removeProperty("--wipe-color");
        unit.style.removeProperty("--wipe-duration");
      },
      { once: true },
    );
  };

  const wrapTextNodes = (root) => {
    if (root.nodeType === Node.TEXT_NODE) {
      wrapTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document) {
      return;
    }

    if (root.matches?.("h1, h2, h3")) {
      wrapTitleElement(root);
    }
    root.querySelectorAll?.("h1, h2, h3").forEach(wrapTitleElement);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    nodes.forEach(wrapTextNode);
  };

  wrapTextNodes(document.body);

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => wrapTextNodes(node));
    });
  });
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

initTextWipeReveal();

window.addEventListener("beforeunload", () => {
  interviewScene.destroy();
});
