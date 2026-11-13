"""Slice the Spendly mascot pose sheet and build the PWA icons.

Run from the repo root:  python scripts/assets.py

docs/assets/mascote.png is a 1254 x 1254 contact sheet: five columns of cartoon
poses over four rows, each pose printed with a caption underneath it. The paper
is a very light blue grey, so the artwork is found by growing a background mask
inwards from the border; everything the mask does not reach stays opaque. That
keeps the white cap of the character solid while the paper disappears.

Outputs:
  public/mascot/<pose>.webp   one transparent file per pose
  public/icons/*.png          the PWA icon set
"""

from __future__ import annotations

import os
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "docs", "assets", "mascote.png")
ICON = os.path.join(ROOT, "docs", "assets", "icon.png")
MASCOT_OUT = os.path.join(ROOT, "public", "mascot")
ICON_OUT = os.path.join(ROOT, "public", "icons")

COLS = 5
PAPER = 240  # a pixel is paper when every channel is at least this light

# Vertical bands that hold artwork only, captions sit between them.
ART_BANDS = [(30, 297), (372, 614), (660, 890), (952, 1168)]

# Cell order, row major, matching the captions printed on the sheet.
POSES = [
    "icon",
    "welcome",
    "login",
    "signup",
    "home",
    "add-expense",
    "details",
    "edit",
    "categories",
    "calendar",
    "reports",
    "notifications",
    "settings",
    "help",
    "empty",
    "success",
    "loading",
    "error",
    "motivational",
    "goodbye",
]


def background_mask(rgb: np.ndarray) -> np.ndarray:
    """True where the pixel belongs to the paper, found from the border."""
    height, width, _ = rgb.shape
    light = rgb.min(axis=2) >= PAPER
    seen = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if 0 <= x < width and 0 <= y < height and not seen[y, x] and light[y, x]:
            seen[y, x] = True
            queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)
    return seen


def label(mask: np.ndarray) -> tuple[np.ndarray, dict[int, list[int]]]:
    """Connected components of a boolean mask, 4 neighbours, via run lengths."""
    height, width = mask.shape
    parent: list[int] = []

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    runs_per_row: list[list[tuple[int, int, int]]] = []
    for y in range(height):
        row = mask[y]
        runs: list[tuple[int, int, int]] = []
        x = 0
        while x < width:
            if row[x]:
                start = x
                while x < width and row[x]:
                    x += 1
                idx = len(parent)
                parent.append(idx)
                runs.append((start, x - 1, idx))
            else:
                x += 1
        runs_per_row.append(runs)

    for y in range(1, height):
        previous, current = runs_per_row[y - 1], runs_per_row[y]
        i = j = 0
        while i < len(previous) and j < len(current):
            _, a_end, a_id = previous[i]
            _, b_end, b_id = current[j]
            if a_end < current[j][0]:
                i += 1
            elif b_end < previous[i][0]:
                j += 1
            else:
                union(a_id, b_id)
                if a_end < b_end:
                    i += 1
                else:
                    j += 1

    labels = np.zeros((height, width), dtype=np.int32)
    boxes: dict[int, list[int]] = {}
    for y in range(height):
        for start, end, idx in runs_per_row[y]:
            root = find(idx)
            labels[y, start : end + 1] = root
            if root not in boxes:
                boxes[root] = [start, y, end, y, 0]
            else:
                box = boxes[root]
                box[0] = min(box[0], start)
                box[1] = min(box[1], y)
                box[2] = max(box[2], end)
                box[3] = max(box[3], y)
                box[4] += end - start + 1
    return labels, boxes


def foreground(sheet: Image.Image) -> np.ndarray:
    rgb = np.asarray(sheet.convert("RGB")).astype(np.int16)
    paper = background_mask(rgb)
    art = ~paper
    labels, boxes = label(art)
    cleaned = np.zeros_like(art)
    for root, values in boxes.items():
        if values[4] < 18:
            continue
        cleaned[labels == root] = True
    return cleaned


def art_boxes(art: np.ndarray) -> list[tuple[int, int, int, int]]:
    height, width = art.shape
    labels, boxes = label(art)
    column_width = width / COLS
    out: list[tuple[int, int, int, int]] = []
    for top, bottom in ART_BANDS:
        for col in range(COLS):
            lo = col * column_width
            hi = (col + 1) * column_width
            box: list[int] | None = None
            for values in boxes.values():
                x0, y0, x1, y1, area = values
                if area < 18:
                    continue
                center_x = (x0 + x1) / 2
                center_y = (y0 + y1) / 2
                if not (lo - 10 <= center_x <= hi + 10):
                    continue
                if not (top <= center_y <= bottom):
                    continue
                if box is None:
                    box = [x0, y0, x1, y1]
                else:
                    box[0] = min(box[0], x0)
                    box[1] = min(box[1], y0)
                    box[2] = max(box[2], x1)
                    box[3] = max(box[3], y1)
            if box is None:
                box = [int(lo), top, int(hi), bottom]
            pad = 4
            out.append(
                (
                    max(0, box[0] - pad),
                    max(0, box[1] - pad),
                    min(width, box[2] + 1 + pad),
                    min(height, box[3] + 1 + pad),
                )
            )
    return out


def write_mascots() -> None:
    os.makedirs(MASCOT_OUT, exist_ok=True)
    sheet = Image.open(SHEET).convert("RGB")
    art = foreground(sheet)
    alpha = Image.fromarray(np.where(art, 255, 0).astype(np.uint8), mode="L")
    boxes = art_boxes(art)
    for name, box in zip(POSES, boxes):
        piece = sheet.crop(box).convert("RGBA")
        piece.putalpha(alpha.crop(box))
        bbox = piece.getbbox()
        if bbox:
            piece = piece.crop(bbox)
        piece.thumbnail((400, 400), Image.LANCZOS)
        piece.save(os.path.join(MASCOT_OUT, f"{name}.webp"), "WEBP", quality=92, method=6)
        print(f"mascot {name}: {piece.size}")


def write_icons() -> None:
    os.makedirs(ICON_OUT, exist_ok=True)
    source = Image.open(ICON).convert("RGBA")

    for name, size in (("icon-192", 192), ("icon-512", 512), ("apple-touch-icon", 180)):
        source.resize((size, size), Image.LANCZOS).save(
            os.path.join(ICON_OUT, f"{name}.png"), "PNG", optimize=True
        )

    # Maskable: the canvas is filled with the brand blue and the mark sits in
    # the middle 80 percent so every platform mask stays safe.
    blue = (47, 107, 240, 255)
    maskable = Image.new("RGBA", (512, 512), blue)
    inner = source.copy()
    inner.thumbnail((400, 400), Image.LANCZOS)
    maskable.paste(inner, ((512 - inner.width) // 2, (512 - inner.height) // 2), inner)
    maskable.save(os.path.join(ICON_OUT, "icon-maskable-512.png"), "PNG", optimize=True)
    print("icons written")


if __name__ == "__main__":
    write_mascots()
    write_icons()
