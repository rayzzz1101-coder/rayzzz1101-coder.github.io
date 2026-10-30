"""Verify that each project carries its own paper tone into the full reader."""

from pathlib import Path
from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL = "http://127.0.0.1:5174"
OUTPUT = Path(__file__).parents[1] / "review-letter"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=CHROME_PATH,
        headless=True,
    )
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        reduced_motion="reduce",
    )
    page = context.new_page()
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(200)
    page.locator("#toggle-letter").click()
    page.wait_for_timeout(120)

    colors = []
    names = ("light", "medium", "dark")
    for index, name in enumerate(names):
        if index:
            page.locator("#next").click()
            page.wait_for_timeout(160)

        page.locator("#read-letter").click()
        page.wait_for_timeout(180)
        sheet = page.locator("#reader-sheet")
        colors.append(
            sheet.evaluate(
                """element => {
                  const style = getComputedStyle(element);
                  return {
                    color: style.backgroundColor,
                    image: style.backgroundImage.slice(0, 40)
                  };
                }"""
            )
        )
        assert page.locator("#reader-title").inner_text() == (
            "INTELLIGENT SPACE",
            "QUIET COMPUTING",
            "DECISION FIELD",
        )[index]
        page.screenshot(path=OUTPUT / f"reader-palette-{name}.png")
        page.locator("#reader-close").click()
        page.wait_for_timeout(160)

    print(colors)
    assert len({entry["color"] for entry in colors}) == 3, colors
    assert all("data:image/png" in entry["image"] for entry in colors)
    browser.close()
