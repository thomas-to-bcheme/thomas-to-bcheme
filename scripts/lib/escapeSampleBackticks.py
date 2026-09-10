#!/usr/bin/env python3
"""Escape bare backticks inside `code:` template literals in aiMl model files.

Code samples are authored as TS template literals. Rust doc comments (/// `x`)
and Python docstrings routinely contain backticks, which silently terminate the
literal and produce a wall of confusing parse errors far from the real line.

This walks each file with a small state machine: a code span opens at ``code: ` ``
and closes at the first unescaped backtick that is immediately followed by a
comma at end of line. Any backtick inside that span gets escaped.

Idempotent — an already-escaped backtick is left alone.
"""
import re
import sys
from pathlib import Path

OPEN = re.compile(r"code:\s*`")


def fix(text: str) -> tuple[str, int]:
    out = []
    i = 0
    fixed = 0
    n = len(text)

    while i < n:
        m = OPEN.search(text, i)
        if not m:
            out.append(text[i:])
            break

        out.append(text[i:m.end()])   # includes the opening backtick
        j = m.end()
        span = []

        while j < n:
            ch = text[j]
            if ch == "\\" and j + 1 < n:      # already-escaped pair, keep as-is
                span.append(text[j:j + 2])
                j += 2
                continue
            if ch == "`":
                # A real closing delimiter is a backtick whose LINE ends right
                # after it (allowing a comma and whitespace). Anything else is
                # prose: Rust doc comments routinely write `q`, `k`, `v`, and
                # an earlier version of this check mistook the second backtick
                # there for the end of the template literal.
                line_end = text.find("\n", j)
                if line_end == -1:
                    line_end = n
                if re.fullmatch(r"`\s*,?\s*", text[j:line_end]):
                    span.append(ch)            # real closing delimiter
                    j += 1
                    break
                span.append("\\`")             # bare backtick inside the sample
                fixed += 1
                j += 1
                continue
            span.append(ch)
            j += 1

        out.append("".join(span))
        i = j

    return "".join(out), fixed


def main() -> int:
    total = 0
    for arg in sys.argv[1:]:
        path = Path(arg)
        original = path.read_text()
        updated, count = fix(original)
        if count:
            path.write_text(updated)
            print(f"level=INFO file={path.name} escaped={count} msg=\"escaped bare backticks\"")
        total += count
    if total == 0:
        print("level=INFO msg=\"no bare backticks found\"")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
