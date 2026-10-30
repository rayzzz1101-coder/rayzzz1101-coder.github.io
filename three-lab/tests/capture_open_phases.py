"""Capture the envelope-opening sequence at fixed intervals for inspection."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from time import monotonic

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUTPUT = Path(__file__).parents[1] / "review-envelope-mouth"
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
    OUTPUT.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=OUTPUT / "phase-0000.png")
    page.locator("#toggle-letter").click()
    started_at = monotonic()

    timestamps = (
        550,
        800,
        1000,
        1200,
        1450,
        1700,
        1800,
        1850,
        1900,
        1950,
        2000,
        2050,
        2100,
        2200,
        2700,
        3600,
    )
    for target in timestamps:
        remaining = target - (monotonic() - started_at) * 1000
        if remaining > 0:
            page.wait_for_timeout(remaining)
        page.screenshot(path=OUTPUT / f"phase-{target:04d}.png")

    browser.close()
    server.shutdown()
