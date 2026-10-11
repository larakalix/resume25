"""Regenerate static project previews with Python + Pillow (pip install Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
for source in sorted((root / 'public/img').iterdir()):
    if source.suffix not in {'.gif', '.png'}:
        continue
    with Image.open(source) as image:
        # Use a representative early frame, rather than a blank opening frame.
        if source.suffix == '.gif':
            image.seek(min(10, image.n_frames - 1))
        frame = image.convert('RGB')
        for width in (320, 640, 960):
            preview = frame.resize((width, round(frame.height * width / frame.width)), Image.Resampling.LANCZOS)
            preview.save(source.with_name(f'{source.stem}-{width}.webp'), quality=78, method=6)
        preview.save(source.with_suffix('.webp'), quality=78, method=6)
