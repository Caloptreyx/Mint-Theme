#!/usr/bin/env python3
"""Build the release zip, dist/dev_s4way_nebula.c7s.zip, from the repository.

Directory entries come first, then files, both in sorted walk order. Check the result with
`panel-rs extensions inspect dist/dev_s4way_nebula.c7s.zip`.
"""

import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "dev_s4way_nebula.c7s.zip")

# skipped wherever they appear
SKIP_ANYWHERE = {".git", "node_modules", "target", "dist", "__pycache__"}
# skipped only at the repository root: docs, tooling and repo metadata the panel never reads
SKIP_ROOT = {"docs", "tests", "scripts", ".github", "README.md", ".gitignore"}


def collect():
    dirs, files = [], []
    for current, subdirs, names in os.walk(ROOT):
        rel = os.path.relpath(current, ROOT)
        at_root = rel == "."
        subdirs[:] = sorted(
            d for d in subdirs if d not in SKIP_ANYWHERE and not (at_root and d in SKIP_ROOT)
        )
        if not at_root:
            dirs.append(rel.replace(os.sep, "/") + "/")
        for name in sorted(names):
            if at_root and name in SKIP_ROOT:
                continue
            files.append(name if at_root else f"{rel.replace(os.sep, '/')}/{name}")
    return dirs, files


def main():
    dirs, files = collect()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for arc in dirs + files:
            zf.write(os.path.join(ROOT, *arc.rstrip("/").split("/")), arc)
    size = os.path.getsize(OUT)
    print(f"{os.path.relpath(OUT, ROOT)}: {len(dirs) + len(files)} entries "
          f"({len(dirs)} directories, {len(files)} files), {size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
