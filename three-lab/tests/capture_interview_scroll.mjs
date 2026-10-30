import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/zzz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const baseUrl =
  process.argv[2] ?? "http://127.0.0.1:5175/interview.html";
const output =
  "/Users/zzz/Documents/ChatGPT/个人主页设计/three-lab/review-interview-integration";
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function capture(viewport, prefix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    ) {
      errors.push(message.text());
    }
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#interview-scroll-canvas canvas");
  await page.waitForTimeout(700);
  await page.locator("#interview-form").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${output}/${prefix}-step-1.png` });
  const initialFormHeight = await page
    .locator("#interview-form")
    .evaluate((element) => element.getBoundingClientRect().height);

  await page.locator("#interview-next").click();
  await page.waitForTimeout(430);
  await page.screenshot({
    path: `${output}/${prefix}-step-turn.png`,
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${output}/${prefix}-step-2.png` });
  const secondFormHeight = await page
    .locator("#interview-form")
    .evaluate((element) => element.getBoundingClientRect().height);

  await page.locator("#interview-next").click();
  await page.waitForTimeout(1100);
  await page.locator("#interview-consent").check();
  await page.locator("#interview-next").click();
  await page.waitForTimeout(880);
  await page.screenshot({
    path: `${output}/${prefix}-rolling.png`,
  });
  await page.waitForTimeout(2300);
  await page.screenshot({
    path: `${output}/${prefix}-complete.png`,
  });

  const result = await page.evaluate(() => ({
    completionVisible:
      !document.querySelector("#interview-preview-complete").hidden,
    formHidden: document.querySelector("#interview-form").hidden,
    overflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
    stepHeights: [...document.querySelectorAll(".interview-step")].map(
      (element) => element.getBoundingClientRect().height,
    ),
  }));
  result.initialFormHeight = initialFormHeight;
  result.secondFormHeight = secondFormHeight;
  await context.close();
  return { result, errors };
}

const desktop = await capture({ width: 1440, height: 1000 }, "desktop");
const mobile = await capture({ width: 390, height: 844 }, "mobile");
await browser.close();

if (desktop.errors.length || mobile.errors.length) {
  throw new Error(
    JSON.stringify({ desktop: desktop.errors, mobile: mobile.errors }),
  );
}

console.log(JSON.stringify({ desktop, mobile }, null, 2));
