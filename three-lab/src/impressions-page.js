import {
  MOCK_IMPRESSIONS,
} from "./content.js";
import {
  getImpressions,
  submitInterview,
} from "./api.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const draftKey = "ray-notes-interview-draft-v1";
const bubbleField = document.querySelector("#bubble-field");
const selectedLabel = document.querySelector("#bubble-selected-label");
const selectedCount = document.querySelector("#bubble-selected-count");
const impressionDialog = document.querySelector("#impression-dialog");
const allImpressionsList = document.querySelector("#all-impressions-list");

let allImpressions = [...MOCK_IMPRESSIONS];
let selectedImpression = allImpressions[0];
let bubbleModels = [];
let bubbleResizeFrame = 0;

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

function setSelectedImpression(keyword) {
  selectedImpression = keyword;
  selectedLabel.textContent = keyword.label;
  selectedCount.textContent = `来自 ${keyword.count} 次审核后的提及`;
  document.querySelectorAll(".impression-bubble").forEach((bubble) => {
    const selected = bubble.dataset.keywordId === keyword.id;
    bubble.classList.toggle("is-selected", selected);
    bubble.setAttribute("aria-pressed", String(selected));
  });
}

function packBubblePositions(keywords, width, height) {
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
        const fits = positioned.every(
          (placed) =>
            Math.hypot(x - placed.x, y - placed.y) >
            radius + placed.radius + (mobile ? 4 : 7),
        );
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

  return positioned;
}

function paintBubble(model) {
  const bubble = bubbleField.querySelector(
    `[data-keyword-id="${model.keyword.id}"]`,
  );
  if (!bubble) {
    return;
  }
  bubble.style.left = `${model.x}px`;
  bubble.style.top = `${model.y}px`;
}

function resolveCollisions(anchorId, iterations = 6) {
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
        const firstShare =
          first.keyword.id === anchorId
            ? 0
            : second.keyword.id === anchorId
              ? 1
              : 0.5;
        first.x -= normalX * overlap * firstShare;
        first.y -= normalY * overlap * firstShare;
        second.x += normalX * overlap * (1 - firstShare);
        second.y += normalY * overlap * (1 - firstShare);
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
      paintBubble(model);
    });
    if (!moved) {
      break;
    }
  }
}

function gatherBubbles() {
  const width = Math.max(280, bubbleField.clientWidth);
  const height = Math.max(420, bubbleField.clientHeight);
  const targets = packBubblePositions(
    bubbleModels.map((model) => model.keyword),
    width,
    height,
  );
  const models = new Map(
    bubbleModels.map((model) => [model.keyword.id, model]),
  );
  targets.forEach((target) => {
    const model = models.get(target.keyword.id);
    if (!model) {
      return;
    }
    model.x = target.x;
    model.y = target.y;
    paintBubble(model);
  });
}

function renderBubbleField() {
  if (allImpressions.length === 0) {
    return;
  }

  const width = Math.max(280, bubbleField.clientWidth);
  const height = Math.max(420, bubbleField.clientHeight);
  const visible = allImpressions
    .slice()
    .sort((first, second) => second.count - first.count)
    .slice(0, width < 620 ? 24 : 48);
  bubbleModels = packBubblePositions(visible, width, height);
  bubbleField.replaceChildren();

  bubbleModels.forEach((model, index) => {
    const { keyword, diameter, x, y } = model;
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
      model.x = Math.max(
        model.radius,
        Math.min(
          bounds.width - model.radius,
          event.clientX - bounds.left - Number(bubble.dataset.dragOffsetX),
        ),
      );
      model.y = Math.max(
        model.radius,
        Math.min(
          bounds.height - model.radius,
          event.clientY - bounds.top - Number(bubble.dataset.dragOffsetY),
        ),
      );
      bubble.dataset.dragMoved = "true";
      paintBubble(model);
      resolveCollisions(keyword.id, 5);
    });
    const finishDrag = (event) => {
      if (bubble.dataset.dragging !== "true") {
        return;
      }
      bubble.dataset.dragging = "false";
      bubble.classList.remove("is-dragging");
      bubble.releasePointerCapture?.(event.pointerId);
      if (bubble.dataset.dragMoved === "true") {
        gatherBubbles();
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

function renderAllImpressions() {
  allImpressionsList.replaceChildren();
  allImpressions
    .slice()
    .sort((first, second) => second.count - first.count)
    .forEach((keyword, index) => {
      const item = createElement("li");
      item.append(
        createElement("span", "impression-rank", String(index + 1).padStart(2, "0")),
        createElement("strong", null, keyword.label),
        createElement("span", "impression-count", `${keyword.count} 次`),
      );
      allImpressionsList.append(item);
    });
}

async function loadImpressions() {
  bubbleField.setAttribute("aria-busy", "true");
  try {
    const response = await getImpressions();
    allImpressions = response.data;
    if (allImpressions.length === 0) {
      bubbleField.replaceChildren(
        createElement("p", "module-status", "这里还没有通过审核的关键词。"),
      );
      return;
    }
    selectedImpression = allImpressions[0];
    renderBubbleField();
    renderAllImpressions();
  } catch {
    bubbleField.replaceChildren(
      createElement(
        "p",
        "module-status module-status--error",
        "印象暂时没有抵达。请稍后再来看。",
      ),
    );
    allImpressionsList.replaceChildren();
  } finally {
    bubbleField.setAttribute("aria-busy", "false");
  }
}

window.addEventListener("resize", () => {
  window.cancelAnimationFrame(bubbleResizeFrame);
  bubbleResizeFrame = window.requestAnimationFrame(renderBubbleField);
});

document.querySelector("#open-all-impressions").addEventListener("click", () => {
  impressionDialog.showModal();
});

impressionDialog.addEventListener("click", (event) => {
  if (
    event.target === impressionDialog ||
    event.target.closest(".dialog-close")
  ) {
    impressionDialog.close();
  }
});

const form = document.querySelector("#interview-form");
const steps = [...document.querySelectorAll(".interview-step")];
const answers = [
  document.querySelector("#interview-answer-0"),
  document.querySelector("#interview-answer-1"),
  document.querySelector("#interview-answer-2"),
];
const dots = [...document.querySelectorAll(".interview-progress span")];
const backButton = document.querySelector("#interview-back");
const nextButton = document.querySelector("#interview-next");
const hint = document.querySelector("#interview-hint");
const status = document.querySelector("#interview-status");
const consent = document.querySelector("#interview-consent");
let step = 0;
let submitting = false;

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey) ?? "{}");
  } catch {
    return {};
  }
}

function saveDraft() {
  try {
    localStorage.setItem(
      draftKey,
      JSON.stringify({ answers: answers.map((answer) => answer.value) }),
    );
  } catch {
    // Private browsing may reject storage.
  }
}

const draft = readDraft();
answers.forEach((answer, index) => {
  answer.value = draft.answers?.[index] ?? "";
  answer.addEventListener("input", () => {
    saveDraft();
    if (step < 2) {
      nextButton.textContent = answer.value.trim() ? "下一问" : "跳过这一问";
    }
  });
});

function renderStep() {
  steps.forEach((panel, index) => {
    panel.classList.toggle("is-current", index === step);
    answers[index].disabled = index !== step;
  });
  dots.forEach((dot, index) => {
    dot.classList.toggle("is-current", index === step);
    dot.classList.toggle("is-done", index < step);
  });
  backButton.disabled = step === 0;
  hint.textContent = `${String(step + 1).padStart(2, "0")} / 03`;
  nextButton.textContent =
    step === 2
      ? "寄出这份印象"
      : answers[step].value.trim()
        ? "下一问"
        : "跳过这一问";
  answers[step].focus({ preventScroll: true });
}

backButton.addEventListener("click", () => {
  step = Math.max(0, step - 1);
  renderStep();
});

nextButton.addEventListener("click", async () => {
  if (step < 2) {
    step += 1;
    renderStep();
    return;
  }
  if (!consent.checked) {
    status.textContent = "请先确认关键词的使用方式。";
    status.className = "form-status is-error";
    consent.focus();
    return;
  }
  if (submitting) {
    return;
  }

  submitting = true;
  nextButton.disabled = true;
  nextButton.textContent = "正在把字迹烘干…";
  status.textContent = "";
  status.className = "form-status";

  try {
    await submitInterview({
      answers: answers.map((answer, index) => ({
        promptId: `impression-${index + 1}`,
        text: answer.value.trim(),
      })),
      consentToKeywords: true,
    });
    localStorage.removeItem(draftKey);
    form.classList.add("is-sent");
    answers.forEach((answer) => {
      answer.disabled = true;
    });
    backButton.disabled = true;
    status.textContent =
      "已经寄出。原始回答只会进入审核，页面上不会出现这些文字。";
    status.className = "form-status is-success";
    nextButton.textContent = "已寄出";
  } catch {
    status.textContent = "这次没有寄到。回答已经留在本机，可以稍后再试。";
    status.className = "form-status is-error";
    nextButton.disabled = false;
    nextButton.textContent = "再寄一次";
  } finally {
    submitting = false;
  }
});

renderStep();
loadImpressions();
