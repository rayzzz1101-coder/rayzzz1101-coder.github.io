"""Verify the standalone impression module page."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def collect_errors(page):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: errors.append(message.text)
        if message.type == "error"
        else None,
    )
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5173/impressions.html")
    parser.add_argument("--out", default="review-impressions-page")
    args = parser.parse_args()

    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )

        desktop = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = desktop.new_page()
        errors = collect_errors(page)
        response = page.goto(args.url, wait_until="networkidle")
        assert response and response.ok
        page.wait_for_selector(".impression-bubble")
        page.wait_for_timeout(500)

        assert page.locator("#canvas-host").count() == 0
        assert page.locator(".impression-bubble").count() >= 12
        assert page.locator(".lab-home").get_attribute("href") == "/"
        assert not page.evaluate(
            "document.documentElement.scrollWidth > document.documentElement.clientWidth"
        )
        page.screenshot(path=output_dir / "desktop-full.png", full_page=True)

        field_box = page.locator("#bubble-field").bounding_box()
        bubbles = page.locator(".impression-bubble")
        first_box = bubbles.first.bounding_box()
        assert field_box and first_box
        page.mouse.move(
            first_box["x"] + first_box["width"] / 2,
            first_box["y"] + first_box["height"] / 2,
        )
        page.mouse.down()
        page.mouse.move(
            field_box["x"] + field_box["width"] * 0.82,
            field_box["y"] + field_box["height"] * 0.22,
            steps=9,
        )
        page.mouse.up()
        page.wait_for_timeout(900)
        assert "is-selected" in bubbles.first.get_attribute("class")
        page.screenshot(path=output_dir / "desktop-after-drag.png")

        page.locator("#open-all-impressions").click()
        assert page.locator("#impression-dialog").get_attribute("open") is not None
        page.locator("#impression-dialog .dialog-close").click()

        page.locator("#interview-answer-0").fill("一次安静的聊天。")
        page.locator("#interview-next").click()
        page.locator("#interview-answer-1").fill("会认真听完别人说话。")
        page.locator("#interview-next").click()
        page.locator("#interview-answer-2").fill("温柔、清楚")
        page.locator("#interview-next").click()
        page.wait_for_selector("#interview-status.is-success")

        assert not errors, f"Desktop browser errors: {errors}"
        results["desktop"] = {
            "status": "pass",
            "bubble_count": bubbles.count(),
            "bubble_drag": "pass",
            "all_impressions": "pass",
            "interview_submit": "pass",
            "console_errors": [],
        }
        desktop.close()

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
        )
        mobile_page = mobile.new_page()
        mobile_errors = collect_errors(mobile_page)
        mobile_page.goto(args.url, wait_until="networkidle")
        mobile_page.wait_for_selector(".impression-bubble")
        mobile_page.wait_for_timeout(350)
        assert not mobile_page.evaluate(
            "document.documentElement.scrollWidth > document.documentElement.clientWidth"
        )
        mobile_page.screenshot(path=output_dir / "mobile-full.png", full_page=True)
        assert not mobile_errors, f"Mobile browser errors: {mobile_errors}"
        results["mobile"] = {"status": "pass", "overflow": "pass"}
        mobile.close()

        reduced = browser.new_context(
            viewport={"width": 1280, "height": 820},
            reduced_motion="reduce",
        )
        reduced_page = reduced.new_page()
        reduced_errors = collect_errors(reduced_page)
        reduced_page.goto(args.url, wait_until="networkidle")
        reduced_page.wait_for_selector(".impression-bubble")
        assert not reduced_errors, f"Reduced-motion browser errors: {reduced_errors}"
        results["reduced_motion"] = {"status": "pass"}
        reduced.close()
        browser.close()

    (output_dir / "functional-results.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
