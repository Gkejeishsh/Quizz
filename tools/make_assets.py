#!/usr/bin/env python3
"""
Generate the Android launcher icons and splash screens from the Quizz mark.

    python3 tools/make_assets.py

Draws the brand mark (gradient plate, Q ring, check, spark) with Pillow so the
assets stay in sync with public/logo.svg without needing an SVG rasteriser.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"

DARK_BG = (8, 10, 17)
BRAND_A = (123, 107, 255)
BRAND_B = (90, 91, 240)
BRAND_C = (15, 181, 201)
CYAN = (56, 225, 240)
PALE = (201, 255, 255)
WHITE = (237, 239, 248)

DENSITIES = {
    "mdpi": 1.0,
    "hdpi": 1.5,
    "xhdpi": 2.0,
    "xxhdpi": 3.0,
    "xxxhdpi": 4.0,
}


def gradient(size: int) -> Image.Image:
    """Diagonal brand gradient."""
    img = Image.new("RGB", (size, size))
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            if t < 0.55:
                u = t / 0.55
                color = tuple(int(BRAND_A[i] + (BRAND_B[i] - BRAND_A[i]) * u) for i in range(3))
            else:
                u = (t - 0.55) / 0.45
                color = tuple(int(BRAND_B[i] + (BRAND_C[i] - BRAND_B[i]) * u) for i in range(3))
            pixels[x, y] = color
    return img


def draw_mark(size: int, *, plate: bool = True, glyph_scale: float = 0.62) -> Image.Image:
    """The Q + check + spark glyph on an optional gradient plate."""
    ss = 4  # supersample for smooth edges
    s = size * ss
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    if plate:
        plate_img = gradient(s).convert("RGBA")
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.30), fill=255)
        canvas.paste(plate_img, (0, 0), mask)

    draw = ImageDraw.Draw(canvas)
    unit = s / 48 * glyph_scale / 0.62  # glyph coordinates are on a 48 grid
    ox = (s - 48 * unit) / 2
    oy = (s - 48 * unit) / 2

    def pt(x: float, y: float) -> tuple[float, float]:
        return (ox + x * unit, oy + y * unit)

    stroke = max(1, int(3.6 * unit))
    # Q ring
    cx, cy, r = 21.5, 23.5, 12.0
    draw.ellipse(
        [ox + (cx - r) * unit, oy + (cy - r) * unit, ox + (cx + r) * unit, oy + (cy + r) * unit],
        outline=WHITE,
        width=stroke,
    )
    # tail
    draw.line([pt(28.2, 30.2), pt(35.6, 37.8)], fill=WHITE, width=stroke)
    # check
    draw.line([pt(15.8, 23.6), pt(19.4, 27.2), pt(26.8, 19.2)], fill=CYAN, width=stroke, joint="curve")
    # spark
    spark = [pt(38.4, 9.4), pt(39.5, 12.7), pt(42.8, 13.8), pt(39.5, 14.9), pt(38.4, 18.2), pt(37.3, 14.9), pt(34, 13.8), pt(37.3, 12.7)]
    draw.polygon(spark, fill=PALE)

    return canvas.resize((size, size), Image.LANCZOS)


def rounded_tile(size: int) -> Image.Image:
    """Square app icon: dark tile with a gradient plate inside."""
    ss = 4
    s = size * ss
    canvas = Image.new("RGBA", (s, s), DARK_BG + (255,))
    plate = gradient(s).convert("RGBA")
    mask = Image.new("L", (s, s), 0)
    pad = int(s * 0.06)
    ImageDraw.Draw(mask).rounded_rectangle([pad, pad, s - pad, s - pad], radius=int(s * 0.22), fill=255)
    # soften the plate
    plate.putalpha(200)
    canvas.paste(plate, (0, 0), mask)
    glyph = draw_mark(s, plate=False, glyph_scale=0.70)
    canvas.alpha_composite(glyph)
    return canvas.resize((size, size), Image.LANCZOS)


def circular_tile(size: int) -> Image.Image:
    ss = 4
    s = size * ss
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    base = Image.new("RGBA", (s, s), DARK_BG + (255,))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, s - 1, s - 1], fill=255)
    canvas.paste(base, (0, 0), mask)
    plate = gradient(s).convert("RGBA")
    plate.putalpha(200)
    plate_mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(plate_mask).ellipse([int(s * 0.07)] * 2 + [s - int(s * 0.07)] * 2, fill=255)
    canvas.paste(plate, (0, 0), plate_mask)
    canvas.alpha_composite(draw_mark(s, plate=False, glyph_scale=0.70))
    return canvas.resize((size, size), Image.LANCZOS)


def write_icons() -> None:
    for density, scale in DENSITIES.items():
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)

        legacy = int(48 * scale)
        rounded_tile(legacy).save(folder / "ic_launcher.png")
        circular_tile(legacy).save(folder / "ic_launcher_round.png")

        # adaptive foreground: 108dp canvas, glyph inside the 72dp safe zone
        fg_size = int(108 * scale)
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        glyph = draw_mark(int(fg_size * 0.62), plate=False, glyph_scale=1.0)
        fg.alpha_composite(glyph, ((fg_size - glyph.width) // 2, (fg_size - glyph.height) // 2))
        fg.save(folder / "ic_launcher_foreground.png")

        # monochrome layer (themed icons, Android 13+)
        mono = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        mono_glyph = draw_mark(int(fg_size * 0.62), plate=False, glyph_scale=1.0)
        alpha = mono_glyph.split()[-1]
        mono.paste(Image.new("RGBA", mono_glyph.size, (255, 255, 255, 255)), ((fg_size - mono_glyph.width) // 2, (fg_size - mono_glyph.height) // 2), alpha)
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


LIGHT_BG = (244, 245, 250)


def write_splash() -> None:
    """Light splash in drawable-*, dark splash in drawable-night-*."""
    def night_name(folder: str) -> str:
        """Android needs qualifiers in a fixed order: …-<orientation>-night-<density>."""
        parts = folder.split("-")
        if parts and parts[-1] in DENSITIES:
            return "-".join(parts[:-1] + ["night", parts[-1]])
        return f"{folder}-night"

    for folder_name, (w, h) in SPLASH_SIZES.items():
        for suffix, background in (("", LIGHT_BG), ("", DARK_BG)):
            name = folder_name if background == LIGHT_BG else night_name(folder_name)
            folder = RES / name
            folder.mkdir(parents=True, exist_ok=True)
            img = Image.new("RGB", (w, h), background)
            mark_size = int(min(w, h) * 0.24)
            mark = draw_mark(mark_size, plate=True)
            img.paste(mark, ((w - mark_size) // 2, (h - mark_size) // 2 - int(h * 0.03)), mark)
            img.save(folder / "splash.png")


def write_pwa_icons() -> None:
    out = ROOT / "public"
    out.mkdir(parents=True, exist_ok=True)
    rounded_tile(512).save(out / "icon-512.png")
    rounded_tile(192).save(out / "icon-192.png")
    circular_tile(180).save(out / "apple-touch-icon.png")


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
