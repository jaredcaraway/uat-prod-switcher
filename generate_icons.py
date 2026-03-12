"""Generate toggle-switch icons for UAT and PROD states."""
import os
from PIL import Image, ImageDraw, ImageFont

SIZES = [16, 32, 48, 128]

# Colors
BG = (15, 23, 42)              # Dark slate background
KNOB = (241, 245, 249)         # Slate-100

VARIANTS = {
    "uat": {
        "track_color": (245, 158, 11),   # Amber-500
        "knob_side": "left",
        "label": "UAT",
    },
    "prod": {
        "track_color": (16, 185, 129),   # Emerald-500
        "knob_side": "right",
        "label": "PRD",
    },
}


def draw_icon(size, variant):
    v = VARIANTS[variant]
    scale = size / 128
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rect background
    pad = int(8 * scale)
    radius = int(24 * scale)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=BG,
    )

    # Toggle track
    track_h = int(28 * scale)
    track_w = int(56 * scale)
    track_x = (size - track_w) // 2
    track_y = int(30 * scale)
    track_radius = track_h // 2

    draw.rounded_rectangle(
        [track_x, track_y, track_x + track_w, track_y + track_h],
        radius=track_radius,
        fill=v["track_color"],
    )

    # Knob position
    knob_r = int(10 * scale)
    knob_cy = track_y + track_h // 2
    if v["knob_side"] == "right":
        knob_cx = track_x + track_w - track_radius
    else:
        knob_cx = track_x + track_radius

    draw.ellipse(
        [knob_cx - knob_r, knob_cy - knob_r, knob_cx + knob_r, knob_cy + knob_r],
        fill=KNOB,
    )

    # Label text below the toggle
    label = v["label"]
    font_size = int(32 * scale)
    # Try to load a bold system font; fall back to default
    font = None
    font_candidates = [
        ("/System/Library/Fonts/SFCompact-Bold.otf", 0),
        ("/System/Library/Fonts/Helvetica.ttc", 1),  # index 1 = bold
        ("/Library/Fonts/Arial Bold.ttf", 0),
    ]
    for font_path, index in font_candidates:
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, font_size, index=index)
                break
            except Exception:
                continue
    if font is None:
        font = ImageFont.load_default()

    text_bbox = draw.textbbox((0, 0), label, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    text_x = (size - text_w) // 2
    text_y = int(68 * scale)

    draw.text((text_x, text_y), label, fill=v["track_color"], font=font)

    return img


os.makedirs("images/uat", exist_ok=True)
os.makedirs("images/prod", exist_ok=True)

for variant in VARIANTS:
    for s in SIZES:
        icon = draw_icon(s, variant)
        icon.save(f"images/{variant}/icon{s}.png")
        print(f"Generated {variant}/icon{s}.png")

# Also generate default icons (UAT state) at the top level for manifest
for s in SIZES:
    icon = draw_icon(s, "uat")
    icon.save(f"images/icon{s}.png")
    print(f"Generated default icon{s}.png")
