"""Regenerate every favicon/PWA icon from docs/assets/icon.png.

Run from the project root:  python scripts/icons.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "assets" / "icon.png"
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
ICONS.mkdir(parents=True, exist_ok=True)


def resized(size: int) -> Image.Image:
    with Image.open(SOURCE) as source:
        return source.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)


def maskable(size: int) -> Image.Image:
    """Keep the artwork inside the safe circle with a brand-blue background."""
    canvas = Image.new("RGBA", (size, size), (47, 107, 240, 255))
    art = resized(int(size * 0.78))
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


def main() -> None:
    for size in (192, 512):
        resized(size).save(ICONS / f"icon-{size}.png", optimize=True)
    resized(180).save(ICONS / "apple-touch-icon.png", optimize=True)
    resized(32).save(PUBLIC / "favicon-32.png", optimize=True)
    maskable(512).save(ICONS / "icon-maskable-512.png", optimize=True)
    resized(48).save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        optimize=True,
    )
    (PUBLIC / "favicon.ico").write_bytes((ROOT / "favicon.ico").read_bytes())
    print("icons written: favicon.ico(16/32/48), favicon-32.png, apple-touch-icon.png, 192, 512, maskable-512")


if __name__ == "__main__":
    main()
