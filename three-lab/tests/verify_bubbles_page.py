"""Verify the isolated bubble physics page."""

import argparse
import json
import math
from pathlib import Path

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5173/bubbles.html")
    parser.add_argument("--out", default="review-bubbles-page")
    args = parser.parse_args()

    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: errors.append(message.text)
            if message.type == "error"
            else None,
        )
        response = page.goto(args.url, wait_until="networkidle")
        assert response and response.ok
        page.wait_for_selector(".impression-bubble")
        page.wait_for_timeout(500)

        assert page.locator("#bubble-canvas canvas").count() == 1
        assert page.locator("#interview-form").count() == 0
        assert page.locator(".impression-bubble").count() >= 12
        assert page.locator(".bubble-label").first.evaluate(
            "element => getComputedStyle(element).animationName"
        ) == "none"
        assert page.evaluate("window.bubbleLab.renderer") == "three"
        assert page.evaluate("window.bubbleLab.data.length") >= 12
        assert page.locator('input[type="range"]').count() == 5
        assert not page.evaluate(
            "document.documentElement.scrollWidth > document.documentElement.clientWidth"
        )
        hover_bubble = page.locator(".impression-bubble").nth(2)
        hover_id = hover_bubble.get_attribute("data-keyword-id")
        hover_box = hover_bubble.bounding_box()
        assert hover_box
        page.mouse.move(
            hover_box["x"] + hover_box["width"] / 2,
            hover_box["y"] + hover_box["height"] / 2,
        )
        page.wait_for_timeout(260)
        hover_motion = page.evaluate(
            f"window.bubbleLab.motion.find(model => model.id === '{hover_id}')"
        )
        assert abs(hover_motion["wobble"]) > 0.001
        assert math.hypot(hover_motion["vx"], hover_motion["vy"]) > 1

        second_bubble_box = page.locator(".impression-bubble").nth(1).bounding_box()
        assert second_bubble_box
        page.mouse.click(
            second_bubble_box["x"] + second_bubble_box["width"] / 2,
            second_bubble_box["y"] + second_bubble_box["height"] / 2,
        )
        page.wait_for_timeout(45)
        assert page.locator(".bubble-lab-readout").evaluate(
            "element => element.classList.contains('is-leaving') || element.classList.contains('is-entering')"
        )
        page.wait_for_timeout(220)
        assert page.locator(".bubble-lab-readout").evaluate(
            "element => element.classList.contains('is-entering')"
        )
        selected_styles = page.locator(".impression-bubble.is-selected").evaluate(
            """element => {
                const style = getComputedStyle(element);
                return {
                    outline: style.outlineColor,
                    border: style.borderColor,
                    shadow: style.boxShadow,
                };
            }"""
        )
        assert selected_styles["shadow"] == "none"
        assert selected_styles["outline"] not in ("rgb(212, 75, 54)", "rgb(139, 46, 32)")
        assert selected_styles["border"] not in ("rgb(212, 75, 54)", "rgb(139, 46, 32)")
        page.screenshot(path=output_dir / "desktop-bubbles.png")

        page.locator("#bubble-roughness").evaluate(
            "input => { input.value = '0.51'; input.dispatchEvent(new Event('input', { bubbles: true })); }"
        )
        page.locator("#bubble-normal").evaluate(
            "input => { input.value = '1.43'; input.dispatchEvent(new Event('input', { bubbles: true })); }"
        )
        page.locator("#bubble-transmission").evaluate(
            "input => { input.value = '0.71'; input.dispatchEvent(new Event('input', { bubbles: true })); }"
        )
        page.wait_for_timeout(100)
        assert page.evaluate("window.bubbleLab.material.roughness") == 0.51
        assert page.evaluate("window.bubbleLab.material.normal") == 1.43
        assert page.evaluate("window.bubbleLab.material.transmission") == 0.71
        assert (
            page.locator(".impression-bubble.is-selected").evaluate(
                "element => getComputedStyle(element).boxShadow"
            )
            == "none"
        )

        field_box = page.locator("#bubble-field").bounding_box()
        bubble_box = page.locator(".impression-bubble").first.bounding_box()
        assert field_box and bubble_box
        page.mouse.move(
            bubble_box["x"] + bubble_box["width"] / 2,
            bubble_box["y"] + bubble_box["height"] / 2,
        )
        page.mouse.down()
        page.mouse.move(
            field_box["x"] + field_box["width"] * 0.8,
            field_box["y"] + field_box["height"] * 0.25,
            steps=8,
        )
        page.wait_for_timeout(80)
        dragged_motion = page.evaluate(
            "window.bubbleLab.motion.find(model => model.id === 'gentle')"
        )
        expected_angle = math.atan2(
            field_box["y"] + field_box["height"] * 0.25
            - (bubble_box["y"] + bubble_box["height"] / 2),
            field_box["x"] + field_box["width"] * 0.8
            - (bubble_box["x"] + bubble_box["width"] / 2),
        )
        angle_error = math.atan2(
            math.sin(expected_angle - dragged_motion["directionAngle"]),
            math.cos(expected_angle - dragged_motion["directionAngle"]),
        )
        assert abs(angle_error) < 0.45
        assert abs(dragged_motion["wobble"]) > 0.01
        page.mouse.up()
        page.wait_for_timeout(100)
        released_box = page.locator(".impression-bubble").first.bounding_box()
        early_label_offset = page.locator(".impression-bubble").first.evaluate(
            """element => {
                const bubble = element.getBoundingClientRect();
                const label = element.querySelector(".bubble-label").getBoundingClientRect();
                return Math.hypot(
                    (label.left + label.width / 2) - (bubble.left + bubble.width / 2),
                    (label.top + label.height / 2) - (bubble.top + bubble.height / 2)
                );
            }"""
        )
        page.wait_for_timeout(500)
        gliding_box = page.locator(".impression-bubble").first.bounding_box()
        later_label_offset = page.locator(".impression-bubble").first.evaluate(
            """element => {
                const bubble = element.getBoundingClientRect();
                const label = element.querySelector(".bubble-label").getBoundingClientRect();
                return Math.hypot(
                    (label.left + label.width / 2) - (bubble.left + bubble.width / 2),
                    (label.top + label.height / 2) - (bubble.top + bubble.height / 2)
                );
            }"""
        )
        assert released_box and gliding_box
        assert (
            abs(released_box["x"] - gliding_box["x"])
            + abs(released_box["y"] - gliding_box["y"])
            > 2
        )
        assert early_label_offset > 1
        assert later_label_offset < early_label_offset
        assert "is-selected" in page.locator(".impression-bubble").first.get_attribute(
            "class"
        )

        page.wait_for_timeout(900)
        assert page.evaluate(
            """() => {
                const bubbles = [...document.querySelectorAll(".impression-bubble")].map((bubble) => {
                    const rect = bubble.getBoundingClientRect();
                    return {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        radius: Number(bubble.dataset.diameter) / 2,
                    };
                });
                for (let first = 0; first < bubbles.length; first += 1) {
                    for (let second = first + 1; second < bubbles.length; second += 1) {
                        const a = bubbles[first];
                        const b = bubbles[second];
                        if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius - 2) {
                            return false;
                        }
                    }
                }
                return true;
            }"""
        )

        assert page.locator("#reset-bubbles").count() == 0
        assert page.locator("#open-all-impressions").count() == 0
        assert page.locator("#impression-dialog").count() == 0
        page.locator("#reset-controls").click()
        assert page.evaluate("window.bubbleLab.material.roughness") == 0.32
        assert not errors, f"Browser errors: {errors}"
        results["desktop"] = {
            "status": "pass",
            "bubble_count": page.locator(".impression-bubble").count(),
            "renderer": "three",
            "surface_sliders": 5,
            "hover_motion": "pass",
            "inertia": "pass",
            "text_damping": "pass",
            "collisions": "pass",
            "readout_reveal": "pass",
            "drag": "pass",
            "reset": "pass",
            "console_errors": [],
        }
        page.close()

        mobile = browser.new_page(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
        )
        mobile_errors = []
        mobile.on("pageerror", lambda error: mobile_errors.append(str(error)))
        mobile.goto(args.url, wait_until="networkidle")
        mobile.wait_for_selector(".impression-bubble")
        mobile.wait_for_timeout(350)
        assert not mobile.evaluate(
            "document.documentElement.scrollWidth > document.documentElement.clientWidth"
        )
        assert not mobile_errors
        mobile.screenshot(path=output_dir / "mobile-bubbles.png")
        results["mobile"] = {"status": "pass", "overflow": "pass"}

        browser.close()

    (output_dir / "functional-results.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
