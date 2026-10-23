"""One-command local preview: serve ./web and open it in the default browser.

    python serve.py            # http://127.0.0.1:8765
    python serve.py 9000       # pick a port

The app also works by double-clicking web/index.html (no fetch, no modules),
this script is only here so the lab can be shared as a URL.
"""
from __future__ import annotations

import functools
import http.server
import pathlib
import socketserver
import sys
import threading
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent / "web"


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))

    class Server(socketserver.TCPServer):
        allow_reuse_address = True

    with Server(("127.0.0.1", port), handler) as httpd:
        url = f"http://127.0.0.1:{port}/"
        print(f"D4RT 论文实验室: {url}   (Ctrl+C 停止)")
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")
    return 0


if __name__ == "__main__":
    sys.exit(main())
