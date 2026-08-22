import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
RECIPE_PATH = Path(__file__).with_name("recipe.json")
SOURCE_DIR = REPO_ROOT / "public" / "images" / "marketing"
OUTPUT_DIR = REPO_ROOT / "public" / "images" / "landing" / "homepage-collage"

TILE_WIDTH = 720
TILE_HEIGHT = 1280
MAX_STRIP_BYTES = 5 * 1024 * 1024
WEBP_QUALITY = 82


def open_image(path: Path) -> Image.Image:
    try:
        image = Image.open(path)
        image.load()
        return image.convert("RGB")
    except Exception as first_error:
        with tempfile.TemporaryDirectory() as tmp:
            converted = Path(tmp) / "converted.png"
            result = subprocess.run(
                ["ffmpeg", "-y", "-i", str(path), str(converted)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0 or not converted.is_file():
                raise SystemExit(f"failed to open {path.name}: {first_error}") from first_error
            image = Image.open(converted)
            image.load()
            return image.convert("RGB")


def center_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    source_width, source_height = image.size
    scale = max(width / source_width, height / source_height)
    resized_width = max(1, round(source_width * scale))
    resized_height = max(1, round(source_height * scale))
    resized = image.resize((resized_width, resized_height), Image.Resampling.LANCZOS)
    left = (resized_width - width) // 2
    top = (resized_height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def validate_recipe(columns: list[list[dict[str, str]]]) -> None:
    errors: list[str] = []
    if len(columns) != 4:
        errors.append(f"recipe must have four columns, received {len(columns)}")

    for index, tiles in enumerate(columns):
        if len(tiles) != 3:
            errors.append(f"col-{index} must have 3 tiles, received {len(tiles)}")
        grades = {tile.get("grade") for tile in tiles}
        if "clean" not in grades or "worn" not in grades:
            errors.append(f"col-{index} must mix clean and worn")
        for tile in tiles:
            if tile.get("crop") != "center-cover":
                errors.append(f"col-{index} tile {tile.get('source')} crop must be center-cover")
            source = SOURCE_DIR / str(tile.get("source", ""))
            if not source.is_file():
                errors.append(f"missing source {tile.get('source')}")

    if errors:
        raise SystemExit("\n".join(errors))


def compose_column(index: int, tiles: list[dict[str, str]]) -> None:
    frames = [
        center_cover(open_image(SOURCE_DIR / tile["source"]), TILE_WIDTH, TILE_HEIGHT)
        for tile in tiles
    ]
    strip = Image.new("RGB", (TILE_WIDTH, TILE_HEIGHT * len(frames)))
    offset_y = 0
    for frame in frames:
        strip.paste(frame, (0, offset_y))
        offset_y += TILE_HEIGHT

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"col-{index}.webp"
    quality = WEBP_QUALITY
    while quality >= 40:
        strip.save(output_path, "WEBP", quality=quality, method=6)
        if output_path.stat().st_size <= MAX_STRIP_BYTES:
            print(f"wrote {output_path.relative_to(REPO_ROOT)} ({output_path.stat().st_size} bytes, q={quality})")
            return
        quality -= 8
    raise SystemExit(f"{output_path.name} exceeds 5 MiB even at quality 40")


def main() -> None:
    recipe = json.loads(RECIPE_PATH.read_text(encoding="utf-8"))
    columns = recipe["columns"]
    validate_recipe(columns)
    for index, tiles in enumerate(columns):
        compose_column(index, tiles)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from error
