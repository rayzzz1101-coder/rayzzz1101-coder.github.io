"""Verify the production build and API through a local Worker."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8787")
    parser.add_argument("--api")
    token_source = parser.add_mutually_exclusive_group(required=True)
    token_source.add_argument("--token")
    token_source.add_argument("--token-file")
    parser.add_argument("--out", default="review-cloudflare-app")
    args = parser.parse_args()
    api_base = (args.api or args.url).rstrip("/")
    token = (
        Path(args.token_file).read_text().strip()
        if args.token_file
        else args.token
    )

    output = Path(args.out)
    output.mkdir(parents=True, exist_ok=True)
    errors = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()
        page.on(
            "pageerror",
            lambda error: errors.append(
                f"{error}\n{getattr(error, 'stack', '')}"
            ),
        )
        page.on(
            "console",
            lambda message: errors.append(message.text)
            if message.type == "error"
            else None,
        )

        page.goto(f"{args.url.rstrip('/')}/#impressions", wait_until="networkidle")
        page.wait_for_selector(
            "#interview-scroll-canvas canvas",
            state="attached",
        )
        page.locator("#interview-form").scroll_into_view_if_needed()
        page.wait_for_timeout(900)
        page.screenshot(path=output / "homepage-interview.png")

        impressions = page.evaluate(
            "url => fetch(url).then(response => response.json())",
            f"{api_base}/api/v1/impressions",
        )
        questions = page.evaluate(
            "url => fetch(url).then(response => response.json())",
            f"{api_base}/api/v1/questions",
        )
        assert isinstance(impressions.get("items"), list)
        assert isinstance(questions.get("items"), list)
        bubble_frame = page.frame_locator('iframe[src*="/bubbles"]')
        if not impressions["items"]:
            page.wait_for_timeout(600)
            assert bubble_frame.locator(".impression-bubble").count() == 0
            assert "审核" in bubble_frame.locator(".module-status").inner_text()

        admin = context.new_page()
        admin.on("pageerror", lambda error: errors.append(str(error)))
        admin.goto(f"{args.url}/admin.html", wait_until="networkidle")
        admin.locator("#admin-token").fill(token)
        admin.locator("#login-form button").click()
        admin.wait_for_selector("#dashboard:not([hidden])")
        admin.screenshot(path=output / "admin.png", full_page=True)
        assert admin.locator("#admin-questions").is_visible()
        assert admin.locator("#admin-interviews").is_visible()
        assert admin.locator("#admin-memories").is_visible()
        assert admin.locator("#public-impressions").is_visible()

        assert not errors, errors
        browser.close()

    print(
        json.dumps(
            {
                "status": "pass",
                "impressions": len(impressions["items"]),
                "public_questions": len(questions["items"]),
                "admin": "pass",
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
