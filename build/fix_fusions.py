# Removes the duplicate heel from the Allure Fusions shelf (top-right cell).
# The large heel by the entrance stays as the feature piece. The shelf cell is
# left empty with its warm backlight (no copied object, so nothing repeats).
# Usage: python build/fix_fusions.py src/img-original/allure-fusions.jpg img/allure-fusions.jpg
#
# Each row of the cell is rebuilt by blending the cell's own left and right
# edges (smooth lighting), with the original spotlight glow kept on top.
import sys
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
s = img.shape[1] / 1672

def px(v):
    return int(round(v * s))

x0, x1 = px(351), px(447)        # inside of the shelf cell
y0, y1 = px(66), px(180)         # from under the spotlight down to the shelf surface
edge = px(5)
res = img.copy().astype(np.float32)
left = img[y0:y1, x0:x0 + edge].astype(np.float32).mean(1)    # (rows, 3)
right = img[y0:y1, x1 - edge:x1].astype(np.float32).mean(1)
t = np.linspace(0, 1, x1 - x0)[None, :, None]
fill = left[:, None, :] * (1 - t) + right[:, None, :] * t

# Keep the soft center glow from the spotlight: brighten the middle a little,
# fading toward the bottom, matching the lit empty cells elsewhere.
cx = (x1 - x0) / 2
xs = np.arange(x1 - x0)[None, :]
ys = np.arange(y1 - y0)[:, None]
glow = np.exp(-((xs - cx) / ((x1 - x0) * 0.45)) ** 2) * np.clip(1 - ys / (y1 - y0), 0, 1)
fill *= (1 + 0.12 * glow)[..., None]

# Light grain so the wall doesn't look airbrushed.
rng = np.random.default_rng(7)
fill += rng.normal(0, 2.0, fill.shape)

# Feather the top edge into the original spotlight area.
alpha = np.ones((y1 - y0, x1 - x0, 1), np.float32)
f = px(10)
alpha[:f] = np.linspace(0, 1, f)[:, None, None]
res[y0:y1, x0:x1] = fill * alpha + res[y0:y1, x0:x1] * (1 - alpha)
cv2.imwrite(out, res.clip(0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
print('fixed', out)
