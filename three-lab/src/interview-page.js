import { createInterviewScrollScene } from "./interview-scroll-scene.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const form = document.querySelector("#interview-form");
const scrollScene = createInterviewScrollScene(
  document.querySelector("#interview-scroll-canvas"),
  { showPageLabels: false },
);
const steps = [...document.querySelectorAll(".interview-step")];
const answers = [
  document.querySelector("#interview-answer-0"),
  document.querySelector("#interview-answer-1"),
  document.querySelector("#interview-answer-2"),
];
const dots = [...document.querySelectorAll(".interview-progress span")];
const back = document.querySelector("#interview-back");
const next = document.querySelector("#interview-next");
const hint = document.querySelector("#interview-hint");
const consent = document.querySelector("#interview-consent");
const status = document.querySelector("#interview-status");
const completion = document.querySelector("#interview-preview-complete");
const restart = document.querySelector("#restart-interview");

let step = 0;
let transitioning = false;
let submitting = false;

function layoutStepPages(position) {
  steps.forEach((item, index) => {
    const distance = index - position;
    item.style.transform = `translate3d(${distance * 100}%, 0, 0)`;
    item.style.visibility = Math.abs(distance) < 1.01 ? "visible" : "hidden";
  });
}

function updateStep({ focus = true } = {}) {
  steps.forEach((item, index) => {
    const current = index === step;
    item.classList.toggle("is-current", current);
    item.setAttribute("aria-hidden", String(!current));
    answers[index].disabled = !current;
  });
  dots.forEach((dot, index) => {
    dot.classList.toggle("is-current", index === step);
    dot.classList.toggle("is-done", index < step);
  });
  back.disabled = step === 0 || transitioning || submitting;
  next.disabled = transitioning || submitting;
  hint.textContent = `${String(step + 1).padStart(2, "0")} / 03`;
  next.textContent =
    step === 2
      ? "寄出这份印象"
      : answers[step].value.trim()
        ? "下一问"
        : "跳过这一问";
  if (focus) {
    answers[step].focus({ preventScroll: true });
  }
}

async function moveToStep(nextStep) {
  if (
    transitioning ||
    nextStep < 0 ||
    nextStep >= steps.length ||
    nextStep === step
  ) {
    return;
  }

  const turnDuration = reducedMotion.matches ? 0 : 900;
  transitioning = true;
  form.setAttribute("aria-busy", "true");
  updateStep({ focus: false });
  const pageTurn = scrollScene.showPage(
    nextStep,
    turnDuration,
    layoutStepPages,
  );
  const turnDeadline = new Promise((resolve) =>
    window.setTimeout(resolve, turnDuration + 80),
  );

  await Promise.race([pageTurn, turnDeadline]);
  step = nextStep;
  updateStep({ focus: false });
  layoutStepPages(step);
  transitioning = false;
  form.removeAttribute("aria-busy");
  updateStep();
}

back.addEventListener("click", () => moveToStep(step - 1));

answers.forEach((answer) => {
  answer.addEventListener("input", () => {
    if (step !== 2) {
      next.textContent = answer.value.trim() ? "下一问" : "跳过这一问";
    }
  });
});

next.addEventListener("click", async () => {
  if (step < 2) {
    moveToStep(step + 1);
    return;
  }

  if (!consent.checked) {
    status.textContent = "请先确认关键词的使用方式。";
    status.classList.add("is-error");
    consent.focus();
    return;
  }

  if (submitting) {
    return;
  }

  submitting = true;
  updateStep({ focus: false });
  next.textContent = "正在把字迹烘干…";
  status.textContent = "";
  status.classList.remove("is-error", "is-success");

  await new Promise((resolve) => window.setTimeout(resolve, 620));
  status.textContent = "已经寄出。原始回答不会公开。";
  status.classList.add("is-success");
  await rollUpForm();
  submitting = false;
});

async function rollUpForm() {
  if (reducedMotion.matches) {
    form.hidden = true;
    form.classList.add("is-removed");
    completion.hidden = false;
    restart.focus({ preventScroll: true });
    return;
  }

  form.classList.add("is-rolling");
  await scrollScene.merge(1080);
  form.classList.add("is-rolled");

  await new Promise((resolve) => window.setTimeout(resolve, 360));
  const vanish = form.animate(
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
  form.hidden = true;
  form.classList.add("is-removed");
  completion.hidden = false;
  restart.focus({ preventScroll: true });
}

restart.addEventListener("click", () => {
  form.getAnimations().forEach((animation) => animation.cancel());
  scrollScene.reset();
  form.hidden = false;
  form.removeAttribute("aria-busy");
  form.removeAttribute("style");
  form.className = "interview-sheet";
  answers.forEach((answer) => {
    answer.value = "";
    answer.disabled = false;
  });
  consent.checked = false;
  status.textContent = "";
  status.className = "form-status";
  completion.hidden = true;
  step = 0;
  transitioning = false;
  submitting = false;
  updateStep();
  layoutStepPages(step);
});

updateStep({ focus: false });
layoutStepPages(step);

window.addEventListener("beforeunload", () => {
  scrollScene.destroy();
});
