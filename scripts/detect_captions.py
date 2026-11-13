"""Find the printed caption bands on the mascot sheet."""

from __future__ import annotations

import numpy as np
from PIL import Image

WHITE = 245


def load_mask(path: str) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    arr = np.asarray(img).astype(np.int16)
    return (arr.min(axis=2) < WHITE)


def label_components(mask: np.ndarray) -> tuple[np.ndarray, list[tuple[int, int, int, int, int]]]:
    """Return (labels, boxes) using run-length union-find."""
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
        previous = runs_per_row[y - 1]
        current = runs_per_row[y]
        i = j = 0
        while i < len(previous) and j < len(current):
            a_start, a_end, a_id = previous[i]
            b_start, b_end, b_id = current[j]
            if a_end < b_start:
                i += 1
            elif b_end < a_start:
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
    return labels, [tuple(v) for v in boxes.values()]


def main() -> None:
    mask = load_mask("docs/assets/mascote.png")
    labels, boxes = label_components(mask)
    height, width = mask.shape

    small_per_row = np.zeros(height, dtype=np.int32)
    for x0, y0, x1, y1, area in boxes:
        if (y1 - y0 + 1) <= 34:
            small_per_row[y0 : y1 + 1] += 1

    for y in range(height):
        if small_per_row[y] >= 8:
            print(y, small_per_row[y])


if __name__ == "__main__":
    main()
