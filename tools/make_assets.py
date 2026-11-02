#!/usr/bin/env python3
"""
Generate the Android launcher icons, splash screens and PWA icons from the
Quizz mark.

    python3 tools/make_assets.py

The mark is drawn with Pillow on the same 48-unit grid as the SVG
(src/components/Logo.tsx, public/logo.svg) so every surface shows the identical
art: a magnifier whose lens is the bowl of a Q and whose tick is the answer.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"

DARK_BG = (8, 10, 17)
LIGHT_BG = (244, 245, 250)

# plate gradient stops (violet → indigo → cyan), matching public/logo.svg
PLATE_STOPS = [
    (0.00, (155, 134, 255)),
    (0.42, (108, 92, 255)),
    (0.78, (75, 99, 245)),
    (1.00, (22, 199, 217)),
]
WHITE = (255, 255, 255)
GLYPH_A = (255, 255, 255)
GLYPH_B = (207, 224, 255)
CHECK_A = (125, 249, 255)
CHECK_B = (34, 211, 238)
SPARK_B = (125, 249, 255)

DENSITIES = {
    "mdpi": 1.0,
    "hdpi": 1.5,
    "xhdpi": 2.0,
    "xxhdpi": 3.0,
    "xxxhdpi": 4.0,
}


def _lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def _stop_color(t: float) -> tuple[int, int, int]:
    t = min(max(t, 0.0), 1.0)
    for i in range(len(PLATE_STOPS) - 1):
        t0, c0 = PLATE_STOPS[i]
        t1, c1 = PLATE_STOPS[i + 1]
        if t <= t1:
            return _lerp(c0, c1, (t - t0) / (t1 - t0) if t1 > t0 else 0.0)
    return PLATE_STOPS[-1][1]


def gradient(size: int) -> Image.Image:
    """Diagonal brand gradient over a square."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            px[x, y] = _stop_color((x + y) / (2 * size - 2))
    return img


def glow_overlay(size: int) -> Image.Image:
    """Soft white highlight in the top-left corner, so the plate reads as glass."""
    small = 64
    img = Image.new("L", (small, small), 0)
    px = img.load()
    cx, cy = 0.26 * small, 0.16 * small
    reach = 0.78 * small
    for y in range(small):
        for x in range(small):
            d = math.hypot(x - cx, y - cy) / reach
            if d >= 1:
                continue
            # smooth quadratic falloff — no visible banding after upscaling
            px[x, y] = int(64 * (1 - d) ** 2)
    img = img.resize((size, size), Image.BICUBIC)
    overlay = Image.new("RGBA", (size, size), WHITE + (255,))
    overlay.putalpha(img)
    return overlay


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    return mask


def plate(size: int, radius_ratio: float = 0.30) -> Image.Image:
    """The app-icon plate: gradient + glow + inner rim."""
    ss = 3
    s = size * ss
    base = gradient(s).convert("RGBA")
    base.alpha_composite(glow_overlay(s))
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(base, (0, 0), rounded_mask(s, radius_ratio))
    # inner rim
    draw = ImageDraw.Draw(canvas)
    rim = max(2, int(s * 0.006))
    draw.rounded_rectangle(
        [rim, rim, s - rim - 1, s - rim - 1],
        radius=int(s * radius_ratio) - rim,
        outline=(255, 255, 255, 56),
        width=rim,
    )
    # bottom inner shadow for depth
    shade = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shade).rounded_rectangle(
        [0, int(s * 0.55), s - 1, s - 1], radius=int(s * radius_ratio), fill=(6, 10, 34, 46)
    )
    shade = shade.filter(ImageFilter.GaussianBlur(radius=s * 0.05))
    shade.putalpha(Image.composite(shade.split()[-1], Image.new("L", (s, s), 0), rounded_mask(s, radius_ratio)))
    canvas.alpha_composite(shade)
    return canvas.resize((size, size), Image.LANCZOS)


def _astroid(cx: float, cy: float, reach: float, steps: int = 96) -> list[tuple[float, float]]:
    """4-point sparkle with concave sides."""
    pts = []
    for i in range(steps):
        t = i * 2 * math.pi / steps
        pts.append((cx + reach * math.cos(t) ** 3, cy + reach * math.sin(t) ** 3))
    return pts


def draw_mark(size: int, *, with_plate: bool = False, glyph_scale: float = 0.86) -> Image.Image:
    """
    The mark. `glyph_scale` is the fraction of the canvas the 48-unit grid spans.
    """
    ss = 4
    s = size * ss
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    if with_plate:
        canvas.alpha_composite(plate(s))

    grid = s * glyph_scale
    unit = grid / 48
    ox = (s - grid) / 2
    oy = (s - grid) / 2

    def pt(x: float, y: float) -> tuple[float, float]:
        return (ox + x * unit, oy + y * unit)

    draw = ImageDraw.Draw(canvas)

    def ring() -> None:
        cx, cy, r = 21.6, 23.4, 11.6
        width = max(2, int(4.0 * unit))
        box = [ox + (cx - r) * unit, oy + (cy - r) * unit, ox + (cx + r) * unit, oy + (cy + r) * unit]
        draw.ellipse(box, outline=GLYPH_A + (255,), width=width)

    def tail() -> None:
        width = max(2, int(4.4 * unit))
        a, b = pt(28.7, 30.5), pt(35.6, 37.6)
        draw.line([a, b], fill=GLYPH_A + (255,), width=width)
        # rounded caps
        for x, y in (a, b):
            r = width / 2
            draw.ellipse([x - r, y - r, x + r, y + r], fill=GLYPH_A + (255,))

    def tick() -> None:
        width = max(2, int(3.8 * unit))
        pts = [pt(15.4, 23.3), pt(19.3, 27.2), pt(27.0, 18.7)]
        draw.line(pts, fill=CHECK_B + (255,), width=width, joint="curve")
        for x, y in (pts[0], pts[-1]):
            r = width / 2
            draw.ellipse([x - r, y - r, x + r, y + r], fill=CHECK_B + (255,))

    ring()
    tail()
    tick()
    spark = [pt(x, y) for x, y in _astroid(39.0, 10.4, 4.6)]
    draw.polygon(spark, fill=SPARK_B + (255,))

    return canvas.resize((size, size), Image.LANCZOS)


def app_icon(size: int) -> Image.Image:
    """Legacy icon: the plate itself (the launcher applies its own mask)."""
    ss = 3
    s = size * ss
    canvas = plate(s, radius_ratio=0.27)
    canvas.alpha_composite(draw_mark(s, glyph_scale=0.72))
    return canvas.resize((size, size), Image.LANCZOS)


def round_icon(size: int) -> Image.Image:
    ss = 3
    s = size * ss
    canvas = plate(s, radius_ratio=0.5)
    canvas.alpha_composite(draw_mark(s, glyph_scale=0.72))
    return canvas.resize((size, size), Image.LANCZOS)


def write_icons() -> None:
    for density, scale in DENSITIES.items():
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)

        legacy = int(48 * scale)
        app_icon(legacy).save(folder / "ic_launcher.png")
        round_icon(legacy).save(folder / "ic_launcher_round.png")

        # adaptive foreground: 108dp canvas, art kept inside the 72dp safe zone
        fg_size = int(108 * scale)
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        glyph = draw_mark(fg_size, glyph_scale=0.80)
        fg.alpha_composite(glyph)
        fg.save(folder / "ic_launcher_foreground.png")

        # monochrome layer (themed icons, Android 13+)
        mono = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        alpha = draw_mark(fg_size, glyph_scale=0.80).split()[-1]
        mono.paste(Image.new("RGBA", (fg_size, fg_size), WHITE + (255,)), (0, 0), alpha)
        mono.save(folder / "ic_launcher_monochrome.png")


SPLASH_SIZES = {
    "drawable": (1080, 1920),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}


def _night_name(folder: str) -> str:
    """Android needs qualifiers in a fixed order: …-<orientation>-night-<density>."""
    parts = folder.split("-")
    if parts and parts[-1] in DENSITIES:
        return "-".join(parts[:-1] + ["night", parts[-1]])
    return f"{folder}-night"


def splash_image(w: int, h: int, background: tuple[int, int, int], glow_rgb: tuple[int, int, int]) -> Image.Image:
    """Plate on a soft radial brand glow, centred like the native splash."""
    small_w, small_h = 64, max(64, int(64 * h / w))
    halo = Image.new("L", (small_w, small_h), 0)
    px = halo.load()
    cx, cy = small_w / 2, small_h / 2
    reach = min(small_w, small_h) * 0.62
    for y in range(small_h):
        for x in range(small_w):
            d = math.hypot(x - cx, y - cy) / reach
            if d < 1:
                px[x, y] = int(60 * (1 - d) ** 1.8)
    halo = halo.resize((w, h), Image.BICUBIC)

    img = Image.new("RGBA", (w, h), background + (255,))
    glow = Image.new("RGBA", (w, h), glow_rgb + (255,))
    glow.putalpha(halo)
    img.alpha_composite(glow)

    mark_size = int(min(w, h) * 0.31)
    mark = draw_mark(mark_size, with_plate=True, glyph_scale=0.82)
    img.alpha_composite(mark, ((w - mark_size) // 2, (h - mark_size) // 2))
    return img.convert("RGB")


def write_splash() -> None:
    """Light splash in drawable-*, dark splash in *-night-*."""
    for folder_name, (w, h) in SPLASH_SIZES.items():
        for night in (False, True):
            folder = RES / (_night_name(folder_name) if night else folder_name)
            folder.mkdir(parents=True, exist_ok=True)
            if night:
                splash_image(w, h, DARK_BG, (108, 92, 255)).save(folder / "splash.png")
            else:
                splash_image(w, h, LIGHT_BG, (108, 92, 255)).save(folder / "splash.png")


def write_pwa_icons() -> None:
    out = ROOT / "public"
    out.mkdir(parents=True, exist_ok=True)
    app_icon(512).save(out / "icon-512.png")
    app_icon(192).save(out / "icon-192.png")
    round_icon(180).save(out / "apple-touch-icon.png")


def main() -> int:
    if not RES.exists():
        raise SystemExit("android/ project not found — run `npx cap add android` first")
    write_icons()
    write_splash()
    write_pwa_icons()
    print("icons + splash written")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
