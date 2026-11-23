# Removes the duplicate heel from the Allure Fusions shelf (top-right cell)
# by placing a copy of the white lattice vase from the lower shelf there.
# The large heel by the entrance stays as the feature piece.
# Usage: python build/fix_fusions.py src/img-original/allure-fusions.jpg img/allure-fusions.jpg
import sys
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
s = img.shape[1] / 1672  # coordinates below are for the 1672px-wide image

def px(v):
    return int(round(v * s))

# Lower-right cell holding the lattice vase, and the matching area of the heel cell.
x0, x1 = px(350), px(449)
sy0, sy1 = px(331), px(432)
ty1 = px(180)
ty0 = ty1 - (sy1 - sy0)
patch = img[sy0:sy1, x0:x1].astype(np.float32)
dest = img[ty0:ty1, x0:x1].astype(np.float32)

# The upper cell is lit more brightly; match the copy's overall level to it,
# using the wall at the top-left of each cell (no objects there).
ref_src = patch[4:20, 4:14].reshape(-1, 3).mean(0)
ref_dst = dest[4:20, 4:14].reshape(-1, 3).mean(0)
patch *= np.clip(ref_dst / np.maximum(ref_src, 1), 0.7, 1.6)

# Soft top edge so the copy fades into the wall above; hard edges elsewhere
# line up with the shelf frame.
alpha = np.ones(patch.shape[:2], np.float32)
fade = px(10)
alpha[:fade] = np.linspace(0, 1, fade)[:, None]
res = img.copy()
res[ty0:ty1, x0:x1] = (patch * alpha[..., None] + dest * (1 - alpha[..., None])).clip(0, 255).astype(np.uint8)

# Clear whatever of the heel still shows above the copy.
top = np.zeros(img.shape[:2], np.uint8)
y_a, y_b = px(60), ty0 + fade
cell = res[y_a:y_b, x0:x1]
hsv = cv2.cvtColor(cell, cv2.COLOR_BGR2HSV)
heel = ((hsv[..., 1] < 70) & (hsv[..., 2] > 170)) | ((hsv[..., 0] > 100) & (hsv[..., 0] < 130) & (hsv[..., 1] > 80))
top[y_a:y_b, x0:x1][heel] = 255
top = cv2.dilate(top, np.ones((7, 7), np.uint8))
res = cv2.inpaint(res, top, 7, cv2.INPAINT_TELEA)

cv2.imwrite(out, res, [cv2.IMWRITE_JPEG_QUALITY, 88])
print('fixed', out)
