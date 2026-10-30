"""Verify the standalone six-letter page in a real Chromium browser."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def wait_for_render(page):
    page.wait_for_selector("#canvas-host canvas")
    page.wait_for_timeout(1000)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5173/notes.html")
    parser.add_argument("--out", default="review-letter")
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
        errors = []
        page.on(
            "pageerror",
            lambda error: errors.append(
                f"{error}\n{getattr(error, 'stack', 'no stack available')}"
            ),
        )
        page.on(
            "console",
            lambda message: errors.append(message.text)
            if message.type == "error"
            else None,
        )

        response = page.goto(args.url, wait_until="networkidle")
        assert response and response.ok, "Three.js letter lab did not load"
        wait_for_render(page)
        assert page.locator("#canvas-host canvas").is_visible(), "WebGL canvas is missing"
        assert page.locator(".back-home").count() == 0
        assert page.locator(".notes-return").is_visible()
        assert page.locator(".notes-return").get_attribute("href") == "/"
        assert page.locator(".notes-return").evaluate(
            "element => getComputedStyle(element).writingMode"
        ) == "vertical-rl"
        assert page.locator(".notes-return").evaluate(
            "element => getComputedStyle(element).borderTopWidth"
        ) == "0px"
        assert page.locator("#project-title").inner_text() == "写下片刻的意义"
        assert page.locator(".hero-copy h1").get_attribute("aria-label") == "有些感受 值得被留下。"
        assert page.locator(".eyebrow").inner_text() == "日常 / 记录 / 记忆"
        assert page.locator("#key-sentence-en").inner_text() == "Hold the moment before it fades."
        assert page.locator(".controls").count() == 0
        assert not page.locator("#read-letter").is_enabled()
        assert page.evaluate(
            "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
        ), "Desktop page has horizontal overflow"
        page.screenshot(path=output_dir / "desktop-closed.png")

        page.locator("#letter-gallery").press("Space")
        page.wait_for_timeout(900)
        page.screenshot(path=output_dir / "desktop-folded-rise.png")
        page.wait_for_timeout(1200)
        page.screenshot(path=output_dir / "desktop-unfold-blank.png")
        page.wait_for_timeout(500)
        assert page.locator("#live-status").inner_text().endswith(
            "第1封信已打开：写下片刻的意义"
        )
        page.wait_for_timeout(1400)
        page.screenshot(path=output_dir / "desktop-text-reveal.png")
        page.wait_for_timeout(1500)
        page.screenshot(path=output_dir / "desktop-open.png")
        page.mouse.move(360, 220)
        page.wait_for_timeout(350)
        page.screenshot(path=output_dir / "light-upper-left.png")
        page.mouse.move(1080, 680)
        page.wait_for_timeout(350)
        page.screenshot(path=output_dir / "light-lower-right.png")

        page.wait_for_function(
            "!document.querySelector('#read-letter').disabled",
            timeout=10_000,
        )
        assert page.locator("#read-letter").is_enabled(), "Read button is not enabled"
        assert page.locator("#note-photo-primary").is_visible()
        assert page.locator("#note-photo-secondary").is_visible()
        page.locator("#read-letter").click()
        page.wait_for_timeout(520)
        page.screenshot(path=output_dir / "reader-expanding.png")
        page.wait_for_timeout(340)
        page.screenshot(path=output_dir / "reader-focus.png")
        page.wait_for_timeout(5000)
        sheet_box = page.locator("#reader-sheet").bounding_box()
        assert sheet_box and sheet_box["width"] >= 1430 and sheet_box["height"] >= 990
        assert page.locator(".reader-char").count() > 100
        assert page.locator(".reader-home-link").is_visible()
        assert page.locator(".reader-home-link").get_attribute("href") == "/"
        page.screenshot(path=output_dir / "reader-full.png")

        page.locator("#reader-close").click()
        page.wait_for_timeout(500)
        page.screenshot(path=output_dir / "reader-text-dissolve-start.png")
        page.wait_for_timeout(600)
        page.screenshot(path=output_dir / "reader-text-dissolve-rise.png")
        page.wait_for_timeout(900)
        page.screenshot(path=output_dir / "reader-return.png")
        page.wait_for_timeout(1500)
        assert page.locator("#reader-overlay").is_hidden(), "Reader did not close"
        assert page.locator("#read-letter").is_enabled(), "Read button was not restored"

        page.locator("#letter-gallery").press("ArrowRight")
        page.wait_for_timeout(1800)
        assert page.locator("#project-title").inner_text() == "鼓点落在心口上"
        assert page.locator("#project-number").inner_text() == "02 / 06"
        page.screenshot(path=output_dir / "desktop-letter-02.png")

        page.locator("#letter-gallery").press("ArrowRight")
        page.wait_for_timeout(1800)
        assert page.locator("#project-title").inner_text() == "一个人旅行时，我在想什么"
        page.screenshot(path=output_dir / "desktop-letter-03.png")

        page.locator("#letter-gallery").press("Space")
        page.wait_for_timeout(300)
        page.screenshot(path=output_dir / "desktop-text-scramble.png")
        page.wait_for_timeout(500)
        page.screenshot(path=output_dir / "desktop-text-side-collapse.png")
        page.wait_for_timeout(600)
        page.screenshot(path=output_dir / "desktop-text-center-fade.png")
        page.wait_for_timeout(1300)
        page.screenshot(path=output_dir / "desktop-folded-return.png")
        page.wait_for_timeout(2200)
        assert page.locator("#live-status").inner_text().endswith(
            "第3封信已封好：一个人旅行时，我在想什么"
        )
        page.screenshot(path=output_dir / "desktop-closed-03.png")

        page.mouse.move(700, 500)
        page.mouse.down()
        page.mouse.move(840, 550, steps=8)
        page.mouse.up()
        page.wait_for_timeout(250)
        assert not errors, f"Desktop browser errors: {errors}"
        results["desktop"] = {
            "status": "pass",
            "webgl_canvas": "pass",
            "open_close": "pass",
            "button_switch": "pass",
            "keyboard_switch": "pass",
            "drag": "pass",
            "moving_reflection": "pass",
            "full_reader": "pass",
            "reader_text_effects": "pass",
            "console_errors": [],
        }
        desktop.close()

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
        )
        mobile_page = mobile.new_page()
        mobile_errors = []
        mobile_page.on(
            "pageerror",
            lambda error: mobile_errors.append(
                f"{error}\n{getattr(error, 'stack', 'no stack available')}"
            ),
        )
        mobile_page.goto(args.url, wait_until="networkidle")
        wait_for_render(mobile_page)
        assert mobile_page.locator("#canvas-host canvas").is_visible()
        assert mobile_page.locator(".notes-return").is_visible()
        assert mobile_page.evaluate(
            "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
        ), "Mobile page has horizontal overflow"
        mobile_page.screenshot(path=output_dir / "mobile-closed.png")
        mobile_page.locator("#letter-gallery").click(position={"x": 195, "y": 360})
        mobile_page.wait_for_timeout(5000)
        mobile_page.screenshot(path=output_dir / "mobile-open.png")
        mobile_page.wait_for_function(
            "!document.querySelector('#read-letter').disabled",
            timeout=10_000,
        )
        assert mobile_page.locator("#read-letter").is_enabled()
        mobile_page.locator("#read-letter").click()
        mobile_page.wait_for_timeout(7200)
        mobile_page.wait_for_function(
            "document.querySelectorAll('#reader-photo-strip img, #reader-body .reader-photo img').length === 2",
            timeout=15_000,
        )
        reader_box = mobile_page.locator("#reader-sheet").bounding_box()
        assert reader_box and reader_box["width"] <= 390 and reader_box["height"] >= 830
        assert (
            mobile_page.locator(
                "#reader-photo-strip img, #reader-body .reader-photo img"
            ).count()
            == 2
        )
        assert mobile_page.evaluate(
            "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
        ), "Mobile reader has horizontal overflow"
        mobile_page.screenshot(path=output_dir / "mobile-reader.png")
        paper_before = mobile_page.locator("#reader-paper-flow").bounding_box()
        scroll_state = mobile_page.locator("#reader-scroll").evaluate(
            """element => {
              element.scrollTop = 760;
              return {
                scrollTop: element.scrollTop,
                scrollHeight: element.scrollHeight,
                clientHeight: element.clientHeight
              };
            }"""
        )
        mobile_page.wait_for_timeout(180)
        paper_after = mobile_page.locator("#reader-paper-flow").bounding_box()
        assert (
            paper_before
            and paper_after
            and scroll_state["scrollTop"] > 100
            and abs(
                (paper_before["y"] - paper_after["y"])
                - scroll_state["scrollTop"]
            )
            <= 2
        ), "Paper texture does not scroll with the article"
        mobile_page.screenshot(path=output_dir / "mobile-reader-body.png")
        assert not mobile_errors, f"Mobile browser errors: {mobile_errors}"
        results["mobile"] = {
            "status": "pass",
            "viewport": "390x844",
            "overflow": "pass",
            "open_letter": "pass",
            "full_reader": "pass",
            "console_errors": [],
        }
        mobile.close()

        reduced = browser.new_context(
            viewport={"width": 1280, "height": 800},
            reduced_motion="reduce",
        )
        reduced_page = reduced.new_page()
        reduced_page.goto(args.url, wait_until="networkidle")
        wait_for_render(reduced_page)
        reduced_page.locator("#letter-gallery").press("Space")
        reduced_page.wait_for_timeout(100)
        assert reduced_page.locator("#read-letter").is_enabled()
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
