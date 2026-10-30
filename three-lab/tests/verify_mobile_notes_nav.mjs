import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/zzz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const url = process.argv[2] ?? "http://127.0.0.1:5175/notes.html";
const output =
  "/Users/zzz/Documents/ChatGPT/个人主页设计/three-lab/review-mobile-notes-nav";
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function capture(viewport, mobile) {
  const context = await browser.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("#canvas-host canvas");
  await page.waitForTimeout(700);

  const next = page.locator("#next-letter");
  const previous = page.locator("#previous-letter");
  const result = {
    mobile,
    initialTitle: await page.locator(".hero-copy h1").getAttribute("aria-label"),
    nextVisible:
      (await next.isVisible()) &&
      (await next.evaluate((element) => element.classList.contains("is-revealed"))),
    previousVisible:
      (await previous.isVisible()) &&
      (await previous.evaluate((element) => element.classList.contains("is-revealed"))),
  };

  if (mobile) {
    result.hiddenDuringIntro = !result.nextVisible && !result.previousVisible;
    await page.waitForTimeout(1300);
    result.nextVisible =
      (await next.isVisible()) &&
      (await next.evaluate((element) => element.classList.contains("is-revealed")));
    result.previousVisible =
      (await previous.isVisible()) &&
      (await previous.evaluate((element) => element.classList.contains("is-revealed")));
    await page.screenshot({ path: `${output}/mobile-before.png` });
    await next.click();
    result.dissolvesOnChange = await next.evaluate(
      (element) => element.classList.contains("is-dissolving"),
    );
    await page.waitForTimeout(2100);
    result.nextProject = await page.locator("#project-number").innerText();
    result.nextTitle = await page.locator(".hero-copy h1").getAttribute("aria-label");
    await page.screenshot({ path: `${output}/mobile-next.png` });
    await previous.click();
    await page.waitForTimeout(2100);
    result.previousProject = await page.locator("#project-number").innerText();
    result.previousTitle = await page.locator(".hero-copy h1").getAttribute("aria-label");
    await page.screenshot({ path: `${output}/mobile-previous.png` });
    const galleryBox = await page.locator("#letter-gallery").boundingBox();
    assertGalleryBox(galleryBox);
    await page.locator("#letter-gallery").click({
      position: {
        x: galleryBox.width / 2,
        y: galleryBox.height * 0.55,
      },
    });
    await page.waitForSelector("#read-letter.is-ready", {
      state: "visible",
      timeout: 10_000,
    });
    result.readArrow = await page.locator(".read-letter-arrow").evaluate(
      (arrow) => ({
        tag: arrow.tagName.toLowerCase(),
        width: arrow.getBoundingClientRect().width,
        height: arrow.getBoundingClientRect().height,
        stroke: getComputedStyle(arrow).stroke,
      }),
    );
    await page.screenshot({ path: `${output}/mobile-reading-action.png` });
  } else {
    await page.locator("#letter-gallery").evaluate((element) => {
      element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 120,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await page.waitForTimeout(2100);
    result.nextProject = await page.locator("#project-number").innerText();
    result.nextTitle = await page.locator(".hero-copy h1").getAttribute("aria-label");
  }

  await context.close();
  return { result, errors };
}

function assertGalleryBox(box) {
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error("Letter gallery has no usable bounds.");
  }
}

const desktop = await capture({ width: 1440, height: 1000 }, false);
const mobile = await capture({ width: 390, height: 844 }, true);
await browser.close();

if (
  desktop.result.nextVisible ||
  desktop.result.previousVisible ||
  !mobile.result.nextVisible ||
  !mobile.result.previousVisible ||
  !mobile.result.hiddenDuringIntro ||
  !mobile.result.dissolvesOnChange ||
  desktop.result.nextTitle === desktop.result.initialTitle ||
  mobile.result.nextTitle === mobile.result.initialTitle ||
  mobile.result.previousTitle !== mobile.result.initialTitle ||
  mobile.result.readArrow?.tag !== "svg" ||
  mobile.result.readArrow?.width <= 0 ||
  mobile.result.readArrow?.height <= 0 ||
  desktop.errors.length ||
  mobile.errors.length
) {
  throw new Error(JSON.stringify({ desktop, mobile }, null, 2));
}
if (
  mobile.result.nextProject === "01 / 06" ||
  mobile.result.previousProject !== "01 / 06"
) {
  throw new Error(`Unexpected project transitions: ${JSON.stringify(mobile.result)}`);
}

console.log(JSON.stringify({ desktop, mobile }, null, 2));
