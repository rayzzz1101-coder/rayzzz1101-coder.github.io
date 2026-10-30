import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/zzz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const outputDirectory =
  "/Users/zzz/Documents/ChatGPT/个人主页设计/three-lab/review-reader-editorial";
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function openReader(page) {
  await page.goto("http://127.0.0.1:4175", { waitUntil: "networkidle" });
  await page.waitForSelector("#canvas-host canvas");
  await page.locator("#letter-gallery").press("Space");
  await page.waitForFunction(
    () => !document.querySelector("#read-letter").disabled,
    null,
    { timeout: 10_000 },
  );
  await page.locator("#read-letter").click();
  await page.waitForTimeout(500);
}

async function captureLayout(name, viewport) {
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

  await openReader(page);
  const initialMetrics = await page.evaluate(() => {
    const scroll = document.querySelector("#reader-scroll");
    return {
      articleHeight: document.querySelector("#reader-article").scrollHeight,
      photoCount: document.querySelectorAll(".reader-photo").length,
      quoteCount: document.querySelectorAll(".reader-pullquote").length,
      highlightCount: document.querySelectorAll(".reader-highlight").length,
      overflow: scroll.scrollWidth > scroll.clientWidth + 1,
      title: document.querySelector("#reader-title").textContent,
      subtitle: document.querySelector("#reader-subtitle").textContent,
    };
  });

  await page.screenshot({ path: `${outputDirectory}/${name}-top.png` });
  for (const [suffix, scrollTop] of [
    ["middle", 720],
    ["lower", 1450],
  ]) {
    await page.locator("#reader-scroll").evaluate((element, value) => {
      element.scrollTop = value;
    }, scrollTop);
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${outputDirectory}/${name}-${suffix}.png` });
  }

  const photoBoxes = await page.locator(".reader-photo img").evaluateAll((images) =>
    images.map((image) => {
      const box = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return {
        width: Math.round(box.width),
        height: Math.round(box.height),
        mask: style.maskImage !== "none" || style.webkitMaskImage !== "none",
      };
    }),
  );
  const result = { name, initialMetrics, photoBoxes, errors };
  await context.close();
  return result;
}

const desktopResult = await captureLayout("desktop", {
  width: 1440,
  height: 1000,
});
const mobileResult = await captureLayout("mobile", {
  width: 390,
  height: 844,
});

await browser.close();
console.log(JSON.stringify({ desktopResult, mobileResult }, null, 2));
