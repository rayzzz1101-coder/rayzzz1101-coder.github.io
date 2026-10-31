"""End-to-end visual and interaction checks for the Ray / Notes homepage."""

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


def assert_no_horizontal_overflow(page, label, failures):
    overflow = page.evaluate(
        "document.documentElement.scrollWidth > document.documentElement.clientWidth"
    )
    if overflow:
        failures.append(f"{label}: horizontal overflow")


def capture_section(page, selector, path):
    page.locator(selector).scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    page.screenshot(path=path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5177")
    parser.add_argument("--out", default="review-public-home")
    args = parser.parse_args()

    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}
    failures = []

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
        page.wait_for_selector("#canvas-host canvas")
        page.wait_for_timeout(900)

        assert page.locator("#hero-title").inner_text().replace("\n", "") == "把日子写成一封封信。"
        assert page.locator(".note-card").count() == 0
        assert page.locator('.site-nav a[href="/notes.html"]').count() == 1
        assert page.locator(".side-note-entry").inner_text().startswith("进入手记")
        assert page.locator(".hero-actions a").count() == 0
        assert page.locator(".side-note-entry").evaluate(
            "element => getComputedStyle(element).borderTopWidth"
        ) == "0px"
        assert page.locator(".side-note-entry").evaluate(
            "element => getComputedStyle(element).backgroundColor"
        ) == "rgba(0, 0, 0, 0)"
        assert page.locator(".side-note-label").inner_text() == "进入手记"
        assert page.locator(".side-note-label").evaluate(
            "element => getComputedStyle(element).writingMode"
        ) == "vertical-rl"
        assert page.locator(".side-note-label").evaluate(
            "element => element.getBoundingClientRect().height > element.getBoundingClientRect().width * 3"
        )
        assert page.locator(".brand-ray").evaluate(
            "element => parseFloat(getComputedStyle(element).fontSize)"
        ) > 35
        bubble_frame = page.frame_locator(".bubble-embed-frame")
        bubble_frame.locator(".impression-bubble").first.wait_for()
        assert bubble_frame.locator(".impression-bubble").count() >= 12
        assert page.locator(".reply-card").count() >= 1
        assert "记忆存档中" in page.locator("#impressions-title").inner_text()
        assert page.locator(".memory-archive").evaluate(
            "element => parseFloat(getComputedStyle(element).fontSize)"
        ) > page.locator(".impression-copy-line").first.evaluate(
            "element => parseFloat(getComputedStyle(element).fontSize)"
        )
        assert_no_horizontal_overflow(page, "desktop cover", failures)
        page.screenshot(path=output_dir / "desktop-cover.png")

        gallery_box = page.locator("#letter-gallery").bounding_box()
        assert gallery_box
        page.mouse.move(
            gallery_box["x"] + gallery_box["width"] * 0.53,
            gallery_box["y"] + gallery_box["height"] * 0.5,
        )
        page.mouse.down()
        page.mouse.move(
            gallery_box["x"] + gallery_box["width"] * 0.7,
            gallery_box["y"] + gallery_box["height"] * 0.38,
            steps=12,
        )
        page.screenshot(path=output_dir / "desktop-envelope-dragging.png")
        page.mouse.up()
        page.wait_for_timeout(1300)
        assert "原位" in page.locator("#live-status").inner_text()
        assert not page.locator("#read-letter").is_enabled()

        capture_section(page, "#impressions", output_dir / "desktop-impressions.png")
        page.locator(".bubble-embed-container").scroll_into_view_if_needed()
        page.wait_for_timeout(350)
        assert page.locator(".impression-art-title .title-reveal-unit").first.evaluate(
            "element => getComputedStyle(element).animationName"
        ) == "title-character-wipe"

        bubble_metrics = bubble_frame.locator(".impression-bubble").evaluate_all(
            """bubbles => bubbles.map(bubble => ({
              label: bubble.querySelector(".bubble-label")?.textContent ?? bubble.textContent,
              width: bubble.getBoundingClientRect().width,
              x: bubble.getBoundingClientRect().x + bubble.getBoundingClientRect().width / 2,
              y: bubble.getBoundingClientRect().y + bubble.getBoundingClientRect().height / 2,
              pressed: bubble.getAttribute("aria-pressed")
            }))"""
        )
        assert all(metric["width"] >= 28 for metric in bubble_metrics)
        assert abs(bubble_metrics[0]["width"] - bubble_metrics[-1]["width"]) > 20
        bubble_field_box = page.locator(".bubble-embed-container").bounding_box()
        assert bubble_field_box
        center_x = bubble_field_box["x"] + bubble_field_box["width"] / 2
        center_y = bubble_field_box["y"] + bubble_field_box["height"] / 2
        initial_bubble_distance = sum(
            ((metric["x"] - center_x) ** 2 + (metric["y"] - center_y) ** 2) ** 0.5
            for metric in bubble_metrics
        ) / len(bubble_metrics)
        first_bubble = bubble_frame.locator(".impression-bubble").first.bounding_box()
        assert first_bubble
        page.mouse.move(
            first_bubble["x"] + first_bubble["width"] / 2,
            first_bubble["y"] + first_bubble["height"] / 2,
        )
        page.mouse.down()
        page.mouse.move(
            bubble_field_box["x"] + bubble_field_box["width"] * 0.88,
            bubble_field_box["y"] + bubble_field_box["height"] * 0.18,
            steps=10,
        )
        dragged_metrics = bubble_frame.locator(".impression-bubble").evaluate_all(
            """bubbles => bubbles.map(bubble => ({
              x: bubble.getBoundingClientRect().x + bubble.getBoundingClientRect().width / 2,
              y: bubble.getBoundingClientRect().y + bubble.getBoundingClientRect().height / 2
            }))"""
        )
        dragged_distance = sum(
            ((metric["x"] - center_x) ** 2 + (metric["y"] - center_y) ** 2) ** 0.5
            for metric in dragged_metrics
        ) / len(dragged_metrics)
        page.mouse.up()
        page.wait_for_timeout(900)
        assert dragged_distance > initial_bubble_distance
        page.screenshot(path=output_dir / "desktop-bubbles-dragged.png")
        bubble_frame.locator(".impression-bubble").nth(1).evaluate("element => element.click()")
        page.wait_for_timeout(650)
        assert page.locator("#bubble-selected-label").inner_text() == "好奇"
        assert page.locator("#bubble-selected-count").inner_text() == "21次提及"
        page.locator("#open-all-impressions").click()
        assert page.locator("#impression-dialog").get_attribute("open") is not None
        page.locator("#impression-dialog .dialog-close").click()

        page.locator("#interview-answer-0").fill("一次聊到深夜的时候。")
        page.locator("#interview-next").click()
        page.wait_for_timeout(90)
        assert page.locator('.interview-step[data-step="0"]').evaluate(
            "element => getComputedStyle(element).transform"
        ) != "none"
        page.wait_for_selector('.interview-step[data-step="1"].is-current')
        page.locator("#interview-answer-1").fill("会认真记住别人说过的小事。")
        page.locator("#interview-next").click()
        page.wait_for_selector('.interview-step[data-step="2"].is-current')
        page.locator("#interview-answer-2").fill("温柔而清楚")
        page.locator("#interview-consent").check()
        page.locator("#interview-next").click()
        page.wait_for_selector("#interview-status.is-success")
        assert "已经寄出" in page.locator("#interview-status").inner_text()
        page.wait_for_function(
            "document.querySelector('#interview-form').hidden === true",
            timeout=12_000,
        )
        assert page.locator("#interview-form").is_hidden()

        page.locator("#images").scroll_into_view_if_needed()
        page.wait_for_timeout(3600)
        falling_photos = page.locator("#photo-sky .falling-photo")
        assert 0 < falling_photos.count() <= 4
        photo_boxes = falling_photos.evaluate_all(
            "photos => photos.map(photo => ({ left: photo.getBoundingClientRect().left, right: photo.getBoundingClientRect().right }))"
        )
        for index, first in enumerate(photo_boxes):
            for second in photo_boxes[index + 1 :]:
                assert (
                    first["right"] <= second["left"]
                    or second["right"] <= first["left"]
                ), "Falling photos overlap"
        falling_tops = falling_photos.evaluate_all(
            "photos => photos.map(photo => photo.getBoundingClientRect().top)"
        )
        assert len(set(round(top) for top in falling_tops)) > 1, falling_tops
        page.screenshot(path=output_dir / "desktop-images.png")
        sky_box = page.locator("#photo-sky").bounding_box()
        page.wait_for_function(
            """() => {
              const sky = document.querySelector('#photo-sky').getBoundingClientRect();
              return [...document.querySelectorAll('#photo-sky .falling-photo')]
                .some(photo => {
                  const box = photo.getBoundingClientRect();
                  return box.top > sky.top + 20 && box.top < sky.bottom - 20;
                });
            }""",
            timeout=12_000,
        )
        visible_photo = page.locator("#photo-sky .falling-photo").evaluate_all(
            """(photos, sky) => photos
              .map((photo, index) => {
                const box = photo.getBoundingClientRect();
                return { index, x: box.x, y: box.y, width: box.width, height: box.height };
              })
              .find(photo => photo.y > sky.y + 20 && photo.y < sky.y + sky.height - 20)""",
            {"y": sky_box["y"], "height": sky_box["height"]},
        )
        assert visible_photo
        dragged_photo = page.locator("#photo-sky .falling-photo").nth(
            visible_photo["index"]
        )
        photo_before = visible_photo
        page.mouse.move(
            photo_before["x"] + photo_before["width"] / 2,
            photo_before["y"] + photo_before["height"] / 2,
        )
        page.mouse.down()
        page.mouse.move(
            photo_before["x"] + photo_before["width"] / 2 + 90,
            photo_before["y"] + photo_before["height"] / 2 + 45,
            steps=8,
        )
        page.mouse.up()
        photo_after = dragged_photo.bounding_box()
        assert photo_after and photo_after["x"] > photo_before["x"] + 30
        assert page.locator("#photo-dialog").get_attribute("open") is None
        dragged_photo.dispatch_event("click")
        page.wait_for_function("document.querySelector('#photo-dialog').open")
        assert page.locator("#photo-dialog-title").inner_text()
        page.screenshot(path=output_dir / "desktop-photo-detail.png")
        page.locator("#photo-dialog-return").click()
        assert page.locator("#photo-dialog").get_attribute("open") is None
        page.locator(
            "#photo-accessible-list button", has_text="在陌生城市抬头"
        ).evaluate("button => button.click()")
        page.wait_for_function("document.querySelector('#photo-dialog').open")
        portrait_size = page.locator("#photo-dialog-image").evaluate(
            "image => ({ width: image.naturalWidth, height: image.naturalHeight })"
        )
        assert portrait_size["height"] > portrait_size["width"]
        page.locator("#photo-dialog-return").click()
        page.locator("#photo-sky .falling-photo").first.wait_for(timeout=12_000)
        assert page.locator(".fallen-photos").count() == 0
        raining_photo = page.locator("#photo-sky .falling-photo").first
        assert "sepia" in raining_photo.locator("img").evaluate(
            "image => getComputedStyle(image).filter"
        )
        first_sizes = page.locator("#photo-sky .falling-photo").evaluate_all(
            """photos => Object.fromEntries(photos.map(photo => [
              photo.dataset.photoId,
              [photo.offsetWidth, photo.offsetHeight]
            ]))"""
        )
        page.wait_for_timeout(900)
        second_sizes = page.locator("#photo-sky .falling-photo").evaluate_all(
            """photos => Object.fromEntries(photos.map(photo => [
              photo.dataset.photoId,
              [photo.offsetWidth, photo.offsetHeight]
            ]))"""
        )
        for photo_id, size in first_sizes.items():
            if photo_id in second_sizes:
                assert second_sizes[photo_id] == size

        capture_section(page, "#letters", output_dir / "desktop-letters.png")
        page.locator("#question-body").fill("你会在什么时候决定停下一个项目？")
        page.locator("#question-name").fill("测试读者")
        assert page.locator("#question-contact").count() == 0
        page.locator("#question-consent").check()
        page.locator("#question-submit").click()
        page.wait_for_selector("#question-status.is-success")
        assert "不会公开" in page.locator("#question-status").inner_text()

        assert_no_horizontal_overflow(page, "desktop full", failures)
        assert not errors, f"Desktop browser errors: {errors}"

        notes_page = desktop.new_page()
        notes_errors = collect_errors(notes_page)
        notes_page.goto(args.url, wait_until="networkidle")
        notes_page.wait_for_selector("#enter-notes")
        notes_page.locator("#enter-notes").click()
        notes_page.wait_for_timeout(420)
        assert notes_page.locator("body").get_attribute("class").find(
            "leaving-for-notes"
        ) >= 0
        notes_page.screenshot(path=output_dir / "landing-leaving-for-notes.png")
        notes_page.wait_for_url("**/notes.html", timeout=10_000)
        notes_page.wait_for_timeout(120)
        assert (
            notes_page.locator(".topbar").evaluate(
                "element => parseFloat(getComputedStyle(element).opacity)"
            )
            < 0.1
        )
        notes_page.screenshot(path=output_dir / "notes-arriving-from-right.png")
        notes_page.wait_for_selector("#canvas-host canvas")
        notes_page.wait_for_function(
            "getComputedStyle(document.querySelector('.topbar')).opacity > 0.9",
            timeout=6_000,
        )
        assert not notes_page.evaluate(
            "document.documentElement.hasAttribute('data-arrival')"
        )
        assert notes_page.locator("#project-title").inner_text() == "写下片刻的意义"
        notes_page.locator("#letter-gallery").hover()
        notes_page.mouse.wheel(0, 120)
        notes_page.wait_for_timeout(200)
        assert notes_page.locator("#return-home").evaluate(
            "element => parseFloat(getComputedStyle(element).opacity)"
        ) < 0.5
        notes_page.wait_for_timeout(1800)
        assert notes_page.locator("#project-title").inner_text() == "鼓点落在心口上"
        assert notes_page.locator("#return-home").evaluate(
            "element => parseFloat(getComputedStyle(element).opacity)"
        ) > 0.9
        notes_page.mouse.wheel(0, -120)
        notes_page.wait_for_timeout(1800)
        assert notes_page.locator("#project-title").inner_text() == "写下片刻的意义"
        notes_page.locator("#letter-gallery").press("Space")
        notes_page.wait_for_function(
            "!document.querySelector('#read-letter').disabled",
            timeout=15_000,
        )
        notes_page.locator("#read-letter").click()
        notes_page.wait_for_function(
            "document.querySelector('#reader-article').getClientRects().length > 0 && document.querySelector('#reader-close').disabled === false",
            timeout=15_000,
        )
        notes_page.wait_for_timeout(6500)
        notes_page.screenshot(path=output_dir / "notes-page-reader.png")
        assert notes_page.locator(".back-home").count() == 0
        assert notes_page.locator("#return-home").is_visible()
        assert notes_page.locator("#return-home").evaluate(
            "element => getComputedStyle(element).writingMode"
        ) == "vertical-rl"
        assert notes_page.locator("#return-home").evaluate(
            "element => getComputedStyle(element).borderTopWidth"
        ) == "0px"
        notes_page.locator("#reader-close").click()
        notes_page.wait_for_function(
            "document.querySelector('#reader-overlay').hidden",
            timeout=10_000,
        )
        notes_page.locator("#return-home").click()
        notes_page.wait_for_timeout(420)
        assert "notes-leaving" in notes_page.locator("body").get_attribute(
            "class"
        )
        assert notes_page.locator(".topbar").evaluate(
            "element => parseFloat(getComputedStyle(element).opacity)"
        ) < 0.1
        assert notes_page.locator(".note-photo-stack").evaluate(
            "element => parseFloat(getComputedStyle(element).opacity)"
        ) < 0.1
        notes_page.screenshot(path=output_dir / "notes-leaving-for-home.png")
        notes_page.wait_for_url(args.url.rstrip("/") + "/", timeout=10_000)
        notes_page.wait_for_timeout(260)
        assert notes_page.evaluate(
            "document.documentElement.hasAttribute('data-home-arrival')"
        )
        notes_page.screenshot(path=output_dir / "home-arriving-from-right.png")
        notes_page.wait_for_function(
            "getComputedStyle(document.querySelector('.site-topbar')).opacity > 0.9",
            timeout=6_000,
        )
        assert not notes_errors, f"Notes page browser errors: {notes_errors}"

        results["desktop"] = {
            "status": "pass",
            "viewport": "1440x1000",
            "hero_webgl": "pass",
            "envelope_drag": "pass",
            "cross_page_transition": "pass",
            "return_home_transition": "pass",
            "notes_page": "pass",
            "notes_wheel_switch": "pass",
            "bubble_metrics": bubble_metrics[:5],
            "bubble_embed": "pass",
            "bubble_drag_inertia": "pass",
            "bubble_collision": "pass",
            "photo_collision": "pass",
            "photo_drag": "pass",
            "photo_ground_removed": "pass",
            "photo_size_stable": "pass",
            "interview_submit": "pass",
            "photo_catch": "pass",
            "question_submit": "pass",
            "question_contact_removed": "pass",
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
        mobile_page.wait_for_selector("#canvas-host canvas")
        mobile_page.wait_for_timeout(900)
        assert_no_horizontal_overflow(mobile_page, "mobile cover", failures)
        mobile_page.screenshot(path=output_dir / "mobile-cover.png")
        capture_section(
            mobile_page,
            "#impressions",
            output_dir / "mobile-impressions.png",
        )
        assert_no_horizontal_overflow(mobile_page, "mobile impressions", failures)
        capture_section(mobile_page, "#images", output_dir / "mobile-images.png")
        mobile_page.wait_for_timeout(1400)
        mobile_page.screenshot(path=output_dir / "mobile-images-active.png")
        capture_section(mobile_page, "#letters", output_dir / "mobile-letters.png")
        assert not mobile_errors, f"Mobile browser errors: {mobile_errors}"
        results["mobile"] = {
            "status": "pass",
            "viewport": "390x844",
            "overflow": "pass",
            "console_errors": [],
        }
        mobile.close()

        narrow = browser.new_context(
            viewport={"width": 320, "height": 760},
            is_mobile=True,
            has_touch=True,
        )
        narrow_page = narrow.new_page()
        narrow_errors = collect_errors(narrow_page)
        narrow_page.goto(args.url, wait_until="networkidle")
        narrow_page.wait_for_selector("#canvas-host canvas")
        assert_no_horizontal_overflow(narrow_page, "320px cover", failures)
        narrow_page.screenshot(path=output_dir / "mobile-320-cover.png")
        capture_section(
            narrow_page,
            "#impressions",
            output_dir / "mobile-320-impressions.png",
        )
        assert_no_horizontal_overflow(narrow_page, "320px impressions", failures)
        assert not narrow_errors, f"320px browser errors: {narrow_errors}"
        results["narrow_mobile"] = {
            "status": "pass",
            "viewport": "320x760",
            "overflow": "pass",
            "console_errors": [],
        }
        narrow.close()

        reduced = browser.new_context(
            viewport={"width": 1280, "height": 820},
            reduced_motion="reduce",
        )
        reduced_page = reduced.new_page()
        reduced_errors = collect_errors(reduced_page)
        reduced_page.goto(args.url, wait_until="networkidle")
        reduced_page.locator("#images").scroll_into_view_if_needed()
        reduced_page.wait_for_timeout(500)
        assert reduced_page.locator(".photo-grid .falling-photo").count() == 12
        reduced_page.screenshot(path=output_dir / "reduced-images.png")
        assert not reduced_errors, f"Reduced motion browser errors: {reduced_errors}"
        results["reduced_motion"] = {"status": "pass"}
        reduced.close()

        browser.close()

    if failures:
        raise AssertionError("; ".join(failures))

    (output_dir / "functional-results.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
