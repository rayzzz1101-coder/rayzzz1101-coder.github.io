"""Verify the standalone wax seal lab and its GLB export."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).parents[1]
DIST = ROOT / "dist"
OUTPUT = ROOT / "review-wax-seal-lab"
OUTPUT.mkdir(parents=True, exist_ok=True)

handler = partial(SimpleHTTPRequestHandler, directory=DIST)
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}/wax-seal-lab.html"

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: errors.append(message.text)
            if message.type == "error"
            else None,
        )

        response = page.goto(url, wait_until="networkidle")
        assert response and response.ok
        page.wait_for_selector("#seal-canvas canvas")
        page.wait_for_timeout(1000)
        assert page.locator("#seal-canvas canvas").is_visible()
        assert not errors, errors
        assert page.locator("#wax-color").input_value() == "#76271e"

        page.locator('[data-variant="2"]').click()
        page.wait_for_timeout(850)
        assert page.locator("#wax-color").input_value() == "#233c32"
        page.locator("#roughness").fill("0.42")
        page.locator("#emboss").fill("0.011")
        assert "roughness: 0.42" in page.locator("#settings-output").inner_text()
        assert "displacement: 0.0110" in page.locator("#settings-output").inner_text()
        page.screenshot(path=OUTPUT / "desktop.png")

        page.locator("#seal-stage").click(position={"x": 760, "y": 520})
        page.wait_for_timeout(220)
        assert page.locator("#seal-stage").get_attribute("aria-pressed") == "true"

        stage_box = page.locator("#seal-stage").bounding_box()
        assert stage_box
        drag_y = stage_box["y"] + stage_box["height"] * 0.55
        page.mouse.move(stage_box["x"] + stage_box["width"] * 0.52, drag_y)
        page.mouse.down()
        page.mouse.move(
            stage_box["x"] + stage_box["width"] * 0.82,
            drag_y,
            steps=12,
        )
        page.mouse.up()
        page.wait_for_timeout(500)
        page.screenshot(path=OUTPUT / "side.png")

        with page.expect_download(timeout=15000) as download_info:
            page.locator("#export-seal").click()
        download = download_info.value
        target = OUTPUT / download.suggested_filename
        download.save_as(target)
        assert target.stat().st_size > 10_000
        assert page.locator("#export-status").inner_text().startswith("GLB 已导出")
        assert not errors, errors

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
        )
        mobile_page = mobile.new_page()
        mobile_page.goto(url, wait_until="networkidle")
        mobile_page.wait_for_selector("#seal-canvas canvas")
        mobile_page.wait_for_timeout(900)
        assert mobile_page.evaluate(
            "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
        )
        mobile_page.screenshot(
            path=OUTPUT / "mobile.png",
            full_page=True,
        )
        mobile.close()
        browser.close()
finally:
    server.shutdown()

print(f"verified: {OUTPUT}")
