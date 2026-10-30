"""Run the browser checks against the built app on an ephemeral local port."""

import subprocess
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread


ROOT = Path(__file__).parents[1]
DIST = ROOT / "dist"
handler = partial(SimpleHTTPRequestHandler, directory=DIST)
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
Thread(target=server.serve_forever, daemon=True).start()

try:
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "tests" / "verify_three_lab.py"),
            "--url",
            f"http://127.0.0.1:{server.server_port}",
            "--out",
            str(ROOT / "review-envelope-mouth-final"),
        ],
        check=True,
        cwd=ROOT,
    )
finally:
    server.shutdown()
