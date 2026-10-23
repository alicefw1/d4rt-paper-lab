"""Dev utility: static sanity checks for the browser JS (no engine required).

Checks
  1. single/double-quoted strings that contain a raw newline (fatal in JS)
  2. unbalanced (), {}, [] after stripping strings and comments
  3. trailing commas (harmless in ES5+, reported for the ES3 gate)
  4. JSON payload of scene-data.js / golden.js actually parses

Usage: python tools/check-js.py
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

WEB = pathlib.Path(__file__).resolve().parent.parent / "web" / "js"


def scan(src: str):
    """Yield (kind, index) tokens: 'open', 'close' and report string problems."""
    problems = []
    stack = []
    pairs = {")": "(", "}": "{", "]": "["}
    i, n, line = 0, len(src), 1
    while i < n:
        c = src[i]
        if c == "\n":
            line += 1
            i += 1
            continue
        if c in "'\"`":
            q = c
            start_line = line
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == "\n":
                    if q != "`":
                        problems.append(f"unclosed string starting line {start_line}")
                    line += 1
                    i += 1
                    continue
                if src[i] == q:
                    break
                i += 1
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            while i < n and src[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                if src[i] == "\n":
                    line += 1
                i += 1
            i += 2
            continue
        if c in "([{":
            stack.append((c, line))
        elif c in ")]}":
            if not stack:
                problems.append(f"stray '{c}' at line {line}")
            else:
                op, ol = stack.pop()
                if op != pairs[c]:
                    problems.append(f"mismatch: '{op}' (line {ol}) closed by '{c}' (line {line})")
        i += 1
    for op, ol in stack:
        problems.append(f"unclosed '{op}' opened at line {ol}")
    return problems


def strip_strings(src: str) -> str:
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in "'\"`":
            q, i = c, i + 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == q:
                    break
                i += 1
            out.append(q + q)
            i += 1
        elif c == "/" and i + 1 < n and src[i + 1] == "/":
            while i < n and src[i] != "\n":
                i += 1
        elif c == "/" and i + 1 < n and src[i + 1] == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                i += 1
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def main() -> int:
    bad = 0
    for p in sorted(WEB.glob("*.js")):
        raw = p.read_text(encoding="utf-8")
        problems = scan(raw)
        for m in re.finditer(r",\s*[}\]]", strip_strings(raw)):
            line = strip_strings(raw).count("\n", 0, m.start()) + 1
            problems.append(f"trailing comma at line {line}")
        status = "ok" if not problems else "PROBLEM"
        print(f"{p.name:16s} {len(raw)//1024:4d} KB  {status}")
        for pr in problems[:8]:
            print("    " + pr)
        bad += len(problems)
    for name, var in (("scene-data.js", "window.SCENE_DATA"), ("golden.js", "window.GOLDEN")):
        raw = (WEB / name).read_text(encoding="utf-8")
        m = re.match(r"/\*.*?\*/\s*window\.\w+\s*=\s*(\{.*\});\s*$", raw, re.S)
        if not m:
            print(f"{name}: payload not found"); bad += 1; continue
        try:
            json.loads(m.group(1))
            print(f"{name:16s} payload ok ({len(m.group(1))//1024} KB)")
        except json.JSONDecodeError as e:
            print(f"{name}: bad JSON: {e}"); bad += 1
    print("CLEAN" if bad == 0 else f"{bad} problem(s)")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
