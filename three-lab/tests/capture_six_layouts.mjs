import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/zzz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5174/";
const desktopIndexes = process.argv[3]
  ? process.argv[3].split(",").map(Number)
  : [0, 1, 2, 3, 4, 5];
const mobileIndexes = process.argv[4]
  ? process.argv[4].split(",").map(Number)
  : [5];
const outputDirectory =
  "/Users/zzz/Documents/ChatGPT/个人主页设计/three-lab/review-six-layouts";
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function openProject(index, viewport, name) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    isMobile: viewport.width <= 640,
    hasTouch: viewport.width <= 640,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#canvas-host canvas");
  await page.waitForTimeout(700);

  for (let step = 0; step < index; step += 1) {
    await page.locator("#letter-gallery").evaluate((element) => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await page.waitForTimeout(1800);
  }

  await page.locator("#letter-gallery").press("Space");
  await page.waitForFunction(
    () => !document.querySelector("#read-letter").disabled,
    null,
    { timeout: 10_000 },
  );
  await page.locator("#read-letter").click();
  await page.waitForTimeout(600);

  const metrics = await page.evaluate(() => {
    const article = document.querySelector("#reader-article");
    const scroll = document.querySelector("#reader-scroll");
    return {
      layout: article.className,
      title: document.querySelector("#reader-title").textContent,
      projectNumber: document.querySelector("#project-number").textContent,
      articleHeight: article.scrollHeight,
      overflow: scroll.scrollWidth > scroll.clientWidth + 1,
      photoCount: document.querySelectorAll(".reader-photo").length,
    };
  });

  await page.screenshot({ path: `${outputDirectory}/${name}-top.png` });
  await page.locator("#reader-scroll").evaluate((element) => {
    element.scrollTop = 760;
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outputDirectory}/${name}-body.png` });
  await context.close();
  return { ...metrics, errors };
}

const results = [];
for (const index of desktopIndexes) {
  results.push(
    await openProject(
      index,
      { width: 1440, height: 1000 },
      `desktop-${String(index + 1).padStart(2, "0")}`,
    ),
  );
}
for (const index of mobileIndexes) {
  results.push(
    await openProject(
      index,
      { width: 390, height: 844 },
      `mobile-${String(index + 1).padStart(2, "0")}`,
    ),
  );
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
