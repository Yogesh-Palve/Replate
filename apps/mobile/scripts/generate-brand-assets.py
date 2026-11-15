"""Regenerate the RePlate PNG brand assets from the geometric SVG mark.

Requires Pillow (`python -m pip install Pillow`). The mobile app itself has no
Python or rasterization dependency; generated PNGs are committed as assets.
"""

from math import cos, pi, sin
from pathlib import Path
import os

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "branding"
SCALE = 3
SIZE = 1024
FOREST = "#176B45"
SAGE = "#8BAF91"
GOLD = "#E6AD55"
IVORY = "#F8F9F5"
INK = "#202B25"


def cubic(p0, p1, p2, p3, steps=36):
    points = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        points.append((
            u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
        ))
    return points


def scaled(points):
    return [(round(x * SCALE), round(y * SCALE)) for x, y in points]


def font_file(*candidates):
    for candidate in candidates:
        if Path(candidate).is_file():
            return candidate
    raise FileNotFoundError("Install a Segoe UI or DejaVu Sans system font to regenerate the wordmark artwork")


def mark_image():
    side = SIZE * SCALE
    image = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # A near-complete circular stroke represents redistribution and returns.
    bounds = tuple(round(value * SCALE) for value in (156, 156, 868, 868))
    draw.arc(bounds, start=130, end=410, fill=FOREST, width=28 * SCALE)
    theta = 50 * pi / 180
    cx, cy, radius = 512, 512, 356
    end = (cx + radius * cos(theta), cy + radius * sin(theta))
    tangent = (-sin(theta), cos(theta))
    normal = (cos(theta), sin(theta))
    tip = (end[0] + tangent[0] * 48, end[1] + tangent[1] * 48)
    base = (end[0] - tangent[0] * 9, end[1] - tangent[1] * 9)
    arrow = [tip, (base[0] + normal[0] * 37, base[1] + normal[1] * 37), (base[0] - normal[0] * 37, base[1] - normal[1] * 37)]
    draw.polygon(scaled(arrow), fill=GOLD)

    # Plate and double rim.
    draw.ellipse((324 * SCALE, 324 * SCALE, 700 * SCALE, 700 * SCALE), fill="#FFFFFF", outline=FOREST, width=18 * SCALE)
    draw.ellipse((361 * SCALE, 361 * SCALE, 663 * SCALE, 663 * SCALE), outline=SAGE, width=8 * SCALE)

    # Two leaves and a warm stem form a simple, recognizable food mark.
    main_leaf = cubic((500, 540), (487, 457), (552, 354), (657, 346))[:-1]
    main_leaf += cubic((657, 346), (650, 442), (584, 515), (500, 540))[:-1]
    small_leaf = cubic((500, 528), (437, 515), (409, 462), (423, 402))[:-1]
    small_leaf += cubic((423, 402), (484, 418), (523, 475), (500, 528))[:-1]
    draw.polygon(scaled(main_leaf), fill=FOREST)
    draw.polygon(scaled(small_leaf), fill=SAGE)
    draw.line(scaled([(500, 540), (535, 493), (579, 438), (630, 382)]), fill=GOLD, width=12 * SCALE, joint="curve")

    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def save_assets():
    BRAND.mkdir(parents=True, exist_ok=True)
    mark = mark_image()
    mark.save(BRAND / "replate-mark.png", optimize=True)

    icon = Image.new("RGBA", (SIZE, SIZE), IVORY)
    icon.alpha_composite(mark)
    icon.save(BRAND / "replate-app-icon.png", optimize=True)

    # Keep adaptive foreground artwork inside the platform's central safe area.
    foreground_mark = mark.resize((660, 660), Image.Resampling.LANCZOS)
    foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    foreground.alpha_composite(foreground_mark, ((SIZE - 660) // 2, (SIZE - 660) // 2))
    foreground.save(BRAND / "replate-adaptive-foreground.png", optimize=True)

    splash = Image.new("RGBA", (900, 1100), (0, 0, 0, 0))
    splash_mark = mark.resize((590, 590), Image.Resampling.LANCZOS)
    splash.alpha_composite(splash_mark, ((900 - 590) // 2, 90))
    bold_font = font_file(
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "segoeuib.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    )
    regular_font_file = font_file(
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "segoeui.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    )
    regular_font = ImageFont.truetype(bold_font, 94)
    tagline_font = ImageFont.truetype(regular_font_file, 38)
    draw = ImageDraw.Draw(splash)
    wordmark = "RePlate"
    wordmark_box = draw.textbbox((0, 0), wordmark, font=regular_font)
    draw.text(((900 - (wordmark_box[2] - wordmark_box[0])) / 2, 735), wordmark, font=regular_font, fill=INK)
    tagline = "Good Food. Shared Better."
    tagline_box = draw.textbbox((0, 0), tagline, font=tagline_font)
    draw.text(((900 - (tagline_box[2] - tagline_box[0])) / 2, 865), tagline, font=tagline_font, fill=FOREST)
    splash.save(BRAND / "replate-splash.png", optimize=True)


if __name__ == "__main__":
    save_assets()
