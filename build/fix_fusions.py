# Allure Fusions photo: the photo showed the same heel twice. The heel stays on
# the display shelf (as in the original photo) and the large duplicate by the
# entrance is removed, leaving its display pedestal.
# Usage: python build/fix_fusions.py src/img-original/allure-fusions.jpg img/allure-fusions.jpg
#
# Behind that heel are two surfaces: a white column (left) and a navy wall
# (right). Each column of pixels is rebuilt from the clean strip just above
# the heel, shaded down the wall using a clean neighbouring column of the
# same surface as a guide, so the lighting falls off naturally.
import sys
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
s = img.shape[1] / 1672

def px(v):
    return int(round(v * s))

x0, x1 = px(1452), px(1656)      # heel and a small margin
y0, y1 = px(232), px(452)        # from just above the heel down to the pedestal top
top_a, top_b = px(205), px(228)  # clean strip above the heel
f = img.astype(np.float32)

top = f[top_a:top_b, x0:x1].mean(0)                     # (cols, 3)
lum = top.mean(1)
ref_col = f[y0:y1, px(1440):px(1450)].mean(1)          # clean white-column strip, left of the heel
ref_wall = f[y0:y1, px(1658):px(1668)].mean(1)         # clean navy-wall strip, right of the heel
ref_col_top = f[top_a:top_b, px(1440):px(1450)].mean((0, 1))
ref_wall_top = f[top_a:top_b, px(1658):px(1668)].mean((0, 1))
shade_col = ref_col / np.maximum(ref_col_top, 1)       # (rows, 3) relative shading down the wall
shade_wall = ref_wall / np.maximum(ref_wall_top, 1)

is_col = np.clip((lum - 70) / 50, 0, 1)[None, :, None]  # bright top = white column
fill = top[None] * (shade_col[:, None] * is_col + shade_wall[:, None] * (1 - is_col))
fill = cv2.GaussianBlur(fill, (0, 0), 0.8)
rng = np.random.default_rng(3)
fill += rng.normal(0, 2.0, fill.shape)

# Feather the left, right and top edges into the photo; the bottom meets the pedestal.
H, W = y1 - y0, x1 - x0
alpha = np.ones((H, W), np.float32)
e = px(8)
ramp = np.linspace(0, 1, e)
alpha[:e] *= ramp[:, None]
alpha[:, :e] *= ramp[None]
alpha[:, -e:] *= ramp[::-1][None]
res = f.copy()
res[y0:y1, x0:x1] = fill * alpha[..., None] + f[y0:y1, x0:x1] * (1 - alpha[..., None])
# Pedestal top: remove the heel's sole and shadow by blending the clean
# pedestal surface from either side of it, row by row.
py0, py1 = px(441), px(466)
pa, pb = px(1458), px(1660)
left = res[py0:py1, pa - px(6):pa].mean(1)
right = res[py0:py1, pb:pb + px(6)].mean(1)
t = np.linspace(0, 1, pb - pa)[None, :, None]
top_fill = left[:, None] * (1 - t) + right[:, None] * t + rng.normal(0, 1.5, (py1 - py0, pb - pa, 3))
a2 = np.ones((py1 - py0, 1, 1), np.float32)
k = px(4)
a2[:k, 0, 0] = np.linspace(0, 1, k)
a2[-k:, 0, 0] = np.linspace(1, 0, k)
res[py0:py1, pa:pb] = top_fill * a2 + res[py0:py1, pa:pb] * (1 - a2)

cv2.imwrite(out, res.clip(0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
print('fixed', out)
