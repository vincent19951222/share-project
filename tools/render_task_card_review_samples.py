from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "design/assets/task-card-art/raw"
CROPPED_DIR = ROOT / "design/assets/task-card-art/cropped"
OUT_DIR = ROOT / "public/assets/task-cards/review"

CANVAS_W = 202
CANVAS_H = 270
PAD = 4
CARD_X0 = 4
CARD_Y0 = 4
CARD_X1 = 198
CARD_Y1 = 266
CUT = 12

ART_W = 150
ART_H = 105
ART_X = 26
ART_Y = 88

PARCHMENT = (242, 229, 199, 255)
PARCHMENT_DARK = (211, 190, 151, 255)
INK = (15, 16, 14, 255)
WHITE = (255, 255, 246, 255)
TAG_BG = (244, 235, 214, 255)


@dataclass(frozen=True)
class Card:
    card_id: str
    slogan: str
    title: str
    effort: str
    scene: str
    cooldown: str
    color: tuple[int, int, int, int]


CARDS = [
    Card("movement_004", "把电充绿", "窗边回血", "轻", "通用", "4天", (62, 156, 53, 255)),
    Card("hydration_003", "把尿喝白", "杯子见底", "轻", "通用", "2天", (39, 139, 214, 255)),
    Card("social_001", "把事办黄", "废话 KPI", "轻", "办公室", "3天", (225, 174, 32, 255)),
    Card("learning_005", "把股看红", "一句话笔记", "中", "通用", "4天", (217, 67, 47, 255)),
]


def font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


FONT_SLOGAN = font(15)
FONT_TITLE = font(28)
FONT_TITLE_LONG = font(25)
FONT_TAG = font(18)
FONT_TAG_SMALL = font(15)
FONT_REROLL = font(12)


def card_polygon(x0: int, y0: int, x1: int, y1: int, cut: int) -> list[tuple[int, int]]:
    return [
        (x0 + cut, y0),
        (x1 - cut, y0),
        (x1, y0 + cut),
        (x1, y1 - cut),
        (x1 - cut, y1),
        (x0 + cut, y1),
        (x0, y1 - cut),
        (x0, y0 + cut),
    ]


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    text_font: ImageFont.ImageFont,
    fill: tuple[int, int, int, int],
    stroke_width: int = 0,
    stroke_fill: tuple[int, int, int, int] | None = None,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=text_font, stroke_width=stroke_width)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = box[0] + (box[2] - box[0] - w) // 2
    y = box[1] + (box[3] - box[1] - h) // 2 - 1
    draw.text((x, y), text, font=text_font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)


def draw_pixel_border(draw: ImageDraw.ImageDraw, color: tuple[int, int, int, int]) -> None:
    outer = card_polygon(CARD_X0, CARD_Y0, CARD_X1, CARD_Y1, CUT)
    draw.polygon(outer, fill=INK)

    mid = card_polygon(CARD_X0 + 5, CARD_Y0 + 5, CARD_X1 - 5, CARD_Y1 - 5, CUT - 3)
    draw.polygon(mid, fill=(122, 112, 92, 255))

    inner = card_polygon(CARD_X0 + 9, CARD_Y0 + 9, CARD_X1 - 9, CARD_Y1 - 9, CUT - 5)
    draw.polygon(inner, fill=PARCHMENT)

    frame = card_polygon(CARD_X0 + 14, CARD_Y0 + 14, CARD_X1 - 14, CARD_Y1 - 14, CUT - 6)
    draw.line(frame + [frame[0]], fill=color, width=5, joint="curve")
    draw.line(frame + [frame[0]], fill=INK, width=1)

    # Corner metal blocks.
    for x, y in [(15, 16), (169, 16), (15, 237), (169, 237)]:
        draw.rectangle((x, y, x + 18, y + 8), fill=(178, 165, 138, 255), outline=INK, width=1)


def normalize_art(card_id: str) -> Image.Image:
    raw = Image.open(RAW_DIR / f"{card_id}.png").convert("RGB")
    art = ImageOps.fit(raw, (ART_W, ART_H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    CROPPED_DIR.mkdir(parents=True, exist_ok=True)
    art.save(CROPPED_DIR / f"{card_id}.png")
    return art.convert("RGBA")


def draw_art_window(draw: ImageDraw.ImageDraw, img: Image.Image, art: Image.Image) -> None:
    # Black outer frame and parchment mat.
    draw.rounded_rectangle((ART_X - 5, ART_Y - 5, ART_X + ART_W + 5, ART_Y + ART_H + 5), radius=8, fill=INK)
    draw.rounded_rectangle((ART_X - 2, ART_Y - 2, ART_X + ART_W + 2, ART_Y + ART_H + 2), radius=6, fill=PARCHMENT_DARK)

    mask = Image.new("L", (ART_W, ART_H), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, ART_W, ART_H), radius=6, fill=255)
    img.alpha_composite(art, (ART_X, ART_Y))
    # Reapply border over any antialiasing drift.
    draw.rounded_rectangle((ART_X, ART_Y, ART_X + ART_W, ART_Y + ART_H), radius=6, outline=INK, width=2)


def draw_badge(draw: ImageDraw.ImageDraw, color: tuple[int, int, int, int]) -> None:
    draw.ellipse((12, 12, 44, 44), fill=INK)
    draw.ellipse((16, 16, 40, 40), fill=color, outline=(229, 214, 144, 255), width=3)
    draw.ellipse((22, 22, 34, 34), outline=(229, 214, 144, 255), width=2)
    draw.line((28, 18, 35, 28, 28, 38, 21, 28, 28, 18), fill=(229, 214, 144, 255), width=2)


def draw_check(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((157, 12, 193, 48), fill=INK)
    draw.ellipse((162, 17, 188, 43), fill=(55, 155, 45, 255), outline=WHITE, width=2)
    draw.line((169, 30, 176, 36, 184, 23), fill=WHITE, width=4)


def draw_tags(draw: ImageDraw.ImageDraw, card: Card) -> None:
    y0 = 210
    tags = [(25, 56, card.effort, card.color, WHITE), (75, 116, card.scene, TAG_BG, INK), (128, 166, card.cooldown, TAG_BG, INK)]
    for x0, x1, text, bg, fg in tags:
        draw.rounded_rectangle((x0, y0, x1, y0 + 27), radius=4, fill=bg, outline=INK, width=2)
        draw_centered_text(draw, (x0, y0, x1, y0 + 27), text, FONT_TAG if len(text) <= 2 else FONT_TAG_SMALL, fg)


def draw_reroll(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((151, 199, 197, 253), fill=INK)
    draw.ellipse((156, 204, 192, 248), fill=(246, 238, 216, 255), outline=(93, 78, 55, 255), width=2)
    draw.arc((166, 211, 184, 229), 210, 35, fill=(226, 160, 22, 255), width=3)
    draw.polygon([(183, 213), (188, 215), (184, 220)], fill=(226, 160, 22, 255))
    draw_centered_text(draw, (160, 229, 189, 239), "换", FONT_REROLL, INK)
    draw_centered_text(draw, (160, 238, 189, 249), "一个", FONT_REROLL, INK)


def render_card(card: Card) -> None:
    img = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_pixel_border(draw, card.color)

    draw_badge(draw, card.color)
    draw_check(draw)

    draw_centered_text(draw, (50, 21, 154, 47), card.slogan, FONT_SLOGAN, card.color, stroke_width=0)
    title_font = FONT_TITLE_LONG if len(card.title) >= 5 else FONT_TITLE
    draw_centered_text(draw, (18, 50, 184, 82), card.title, title_font, INK, stroke_width=1, stroke_fill=INK)

    art = normalize_art(card.card_id)
    draw_art_window(draw, img, art)

    draw_tags(draw, card)
    draw_reroll(draw)

    # Bottom metal strip hint.
    draw.rectangle((80, 254, 122, 257), fill=(125, 111, 87, 255))
    draw.rectangle((93, 256, 109, 258), fill=INK)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.save(OUT_DIR / f"{card.card_id}.png")


def main() -> None:
    for card in CARDS:
        render_card(card)
    print(f"Rendered {len(CARDS)} review cards to {OUT_DIR}")


if __name__ == "__main__":
    main()
