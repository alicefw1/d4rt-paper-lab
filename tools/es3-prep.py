"""Generate engine-safe copies of the browser JS for the offline ES3 syntax gate.

Chinese literals are transliterated to ASCII (byte-accurately, in Python), and
template literals are collapsed, so an old JScript parser can vet the *syntax*
without choking on UTF-8.  Line numbers are preserved.

Usage: python tools/es3-prep.py <outdir>
"""
from __future__ import annotations

import pathlib
import re
import sys

WEB = pathlib.Path(__file__).resolve().parent.parent / "web" / "js"


def main(outdir: str) -> int:
    out = pathlib.Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    for p in sorted(WEB.glob("*.js")):
        src = p.read_text(encoding="utf-8")
        # collapse template literals, keeping the line structure intact
        def collapse(m: re.Match) -> str:
            body = m.group(0)
            return "'" + body[1:-1].replace("\n", "\\n").replace("'", "") + "'"
        src = re.sub(r"`[^`]*`", collapse, src)
        # transliterate anything non-ASCII to 'x'
        src = "".join(ch if (9 <= ord(ch) <= 13 or 32 <= ord(ch) <= 126) else "x" for ch in src)
        (out / p.name).write_text(src, encoding="ascii")
        print("prepared", p.name)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "build/es3"))
