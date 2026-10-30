"""Capture mobile GitHub Pages sections and report runtime data state."""

from pathlib import Path
import sys

from playwright.sync_api import sync_playwright


URL = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "https://rayzzz1101-coder.github.io/"
)
OUTPUT = Path(__file__).parents[1] / "review-github-mobile"
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=CHROME_PATH,
        headless=True,
    )
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(1800)

    page.locator('.site-nav a[href="#impressions"]').click()
    page.wait_for_timeout(1200)
    page.screenshot(path=OUTPUT / "mobile-impressions.png")
    bubble_frame = page.frame_locator('iframe[src*="/bubbles"]')
    impression_state = page.evaluate(
        """() => ({
          label: document.querySelector('#bubble-selected-label')?.textContent,
          count: document.querySelector('#bubble-selected-count')?.textContent,
          iframe: document.querySelector('.bubble-embed-frame')?.getBoundingClientRect().toJSON(),
          impressionSection: document.querySelector('#impressions')?.getBoundingClientRect().toJSON()
        })"""
    )
    impression_state["bubbles"] = bubble_frame.locator(
        ".impression-bubble"
    ).count()
    impression_state["bubbleText"] = bubble_frame.locator(
        "#bubble-field"
    ).inner_text()

    page.locator('.site-nav a[href="#letters"]').click()
    page.wait_for_timeout(1200)
    page.screenshot(path=OUTPUT / "mobile-letters.png")
    question_state = page.evaluate(
        """() => ({
          replies: document.querySelectorAll('#reply-stack .reply-card').length,
          replyText: document.querySelector('#reply-stack')?.innerText,
          letters: document.querySelector('#letters')?.getBoundingClientRect().toJSON()
        })"""
    )
    browser.close()

print(
    {
        "impressions": impression_state,
        "questions": question_state,
        "errors": errors,
    }
)
