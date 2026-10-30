import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/zzz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5175/scroll.html";
const output =
  "/Users/zzz/Documents/ChatGPT/个人主页设计/three-lab/review-scroll-stack";
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
  await page.waitForSelector("#scroll-object canvas");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${output}/${prefix}-page-1.png` });
  await page.locator('[data-page="1"]').click();
  await page.waitForTimeout(430);
  await page.screenshot({
    path: `${output}/${prefix}-page-transition.png`,
  });
  await page.waitForTimeout(600);
  await page.locator('[data-page="2"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/${prefix}-open.png` });

  const labelMetrics = await page.evaluate(() => ({
    canvas: document.querySelector("#scroll-object canvas").getBoundingClientRect(),
    toggle: document
      .querySelector("#toggle-scroll span:first-child")
      .textContent.trim(),
    overflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  }));

  await page.locator("#toggle-scroll").click();
  let previous = 0;
  for (const elapsed of [140, 300, 480, 680, 900, 1180]) {
    await page.waitForTimeout(elapsed - previous);
    await page.screenshot({
      path: `${output}/${prefix}-rolling-${String(elapsed).padStart(4, "0")}.png`,
    });
    previous = elapsed;
  }

  await context.close();
  return { labelMetrics, errors };
}

const desktop = await capture({ width: 1440, height: 1000 }, "desktop");
const mobile = await capture(
  { width: 390, height: 844 },
  "mobile",
);

await browser.close();

if (desktop.errors.length || mobile.errors.length) {
  throw new Error(
    JSON.stringify({ desktop: desktop.errors, mobile: mobile.errors }),
  );
}

console.log(
  JSON.stringify(
    {
      desktop: desktop.labelMetrics,
      mobile: mobile.labelMetrics,
    },
    null,
    2,
  ),
);
