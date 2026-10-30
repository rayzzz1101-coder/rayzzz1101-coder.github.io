"""Capture the close sequence at fixed intervals for visual diagnosis."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from time import monotonic

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUTPUT = Path(__file__).parents[1] / "review-letter"
DIST = Path(__file__).parents[1] / "dist"
handler = partial(SimpleHTTPRequestHandler, directory=DIST)
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
Thread(target=server.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{server.server_port}"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=CHROME_PATH,
        headless=True,
    )
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(900)
    page.locator("#toggle-letter").click()
    page.wait_for_timeout(4000)
    page.locator("#toggle-letter").click()
    started_at = monotonic()

    timestamps = (
        300,
        650,
        1000,
        1350,
        1700,
        2100,
        2600,
        3000,
        3400,
        3800,
        4400,
    )
    for target in timestamps:
        remaining = target - (monotonic() - started_at) * 1000
        if remaining > 0:
            page.wait_for_timeout(remaining)
        page.screenshot(path=OUTPUT / f"return-{target}.png")

    browser.close()
    server.shutdown()
