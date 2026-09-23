from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    size = 1024
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (48, 48, size - 48, size - 48),
        radius=220,
        fill="#171a20",
        outline="#2a3038",
        width=18,
    )

    bracket_color = "#edf0f2"
    green = "#89d185"

    draw.line(
        [(402, 292), (250, 292), (250, 732), (402, 732)],
        fill=bracket_color,
        width=72,
        joint="curve",
    )
    draw.line(
        [(622, 292), (774, 292), (774, 732), (622, 732)],
        fill=bracket_color,
        width=72,
        joint="curve",
    )
    draw.rounded_rectangle((486, 398, 538, 626), radius=26, fill=green)

    output_dir = Path(__file__).resolve().parent.parent / "build"
    output_dir.mkdir(parents=True, exist_ok=True)

    icon_png = image.resize((512, 512), Image.Resampling.LANCZOS)
    icon_png.save(output_dir / "icon.png", format="PNG")

    image.resize((256, 256), Image.Resampling.LANCZOS).save(
        output_dir / "icon.ico",
        format="ICO",
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
    )


if __name__ == "__main__":
    main()
