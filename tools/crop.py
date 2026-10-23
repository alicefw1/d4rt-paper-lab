"""Crop a region of a screenshot for close inspection.

Usage: python tools/crop.py shots/trainer.png shots/crop-nav.png 700 0 700 60
Coordinates are CSS pixels of the 1440-wide viewport; the PNG is 2x.
"""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
x, y, w, h = (int(v) for v in sys.argv[3:7])
im = Image.open(src)
scale = im.width / 1440
box = (int(x * scale), int(y * scale), int((x + w) * scale), int((y + h) * scale))
im.crop(box).save(dst)
print('saved', dst, im.crop(box).size)
