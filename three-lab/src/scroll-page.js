import { createInterviewScrollScene } from "./interview-scroll-scene.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scene = createInterviewScrollScene(
  document.querySelector("#scroll-object"),
);
const toggle = document.querySelector("#toggle-scroll");
const toggleLabel = toggle.querySelector("span:first-child");
const toggleIcon = toggle.querySelector("span:last-child");
const status = document.querySelector("#scroll-status");
const pageButtons = [...document.querySelectorAll("[data-page]")];

let rolled = false;
let animating = false;
let page = 0;

function updateControls() {
  toggle.disabled = animating;
  pageButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === page);
    button.disabled = rolled || animating;
  });

  if (rolled) {
    toggleLabel.textContent = "展开纸面";
    toggleIcon.textContent = "→";
    status.textContent = "ROLLED / 卷轴状态";
    return;
  }

  toggleLabel.textContent = page === 2 ? "收纸" : "下一张";
  toggleIcon.textContent = page === 2 ? "←" : "→";
  status.textContent =
    `PAGE ${String(page + 1).padStart(2, "0")} / 03 · UNROLLED`;
}

async function goToPage(nextPage) {
  if (animating || rolled || nextPage === page) {
    return;
  }

  animating = true;
  updateControls();
  status.textContent = `TURNING / 正在转到第 ${nextPage + 1} 张`;
  await scene.showPage(nextPage, reducedMotion.matches ? 0 : 900);
  page = nextPage;
  animating = false;
  updateControls();
}

async function toggleScroll() {
  if (animating) {
    return;
  }

  if (!rolled && page < 2) {
    await goToPage(page + 1);
    return;
  }

  animating = true;
  toggle.disabled = true;
  rolled = !rolled;
  status.textContent = rolled
    ? "ROLLING / 正在收纸"
    : "UNROLLING / 正在展开";
  updateControls();
  await scene.animateTo(rolled ? 1 : 0, reducedMotion.matches ? 0 : 1100);
  toggle.disabled = false;
  animating = false;
  updateControls();
}

toggle.addEventListener("click", toggleScroll);
pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    goToPage(Number(button.dataset.page));
  });
});

updateControls();

window.addEventListener("beforeunload", () => {
  scene.destroy();
});
