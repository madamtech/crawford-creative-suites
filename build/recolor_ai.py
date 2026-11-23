# Recolors the AI AuthoriTech reception photo from purple to brand teal,
# keeping the same lighting and glow, and keeping marble and stone neutral.
# Usage: python build/recolor_ai.py src/img-original/ai-authoritech.jpg img/ai-authoritech.jpg
#
# Method (Lab color space): purple = magenta (+a) with blue (-b); teal = green (-a) with blue (-b).
# - Strongly colored purple (desk glow, screens, rug, pillows, flowers) is turned teal.
# - Faint purple tint on neutral surfaces (marble floor, stone wall) is removed,
#   so those surfaces become clean neutral marble instead of picking up teal.
# - Warm colors (skin, wood, beige upholstery, lamps) lean yellow (+b) and are left alone.
import sys
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
L, a, b = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128

purple = np.clip((a - 1.0) / 3.0, 0, 1) * np.clip((5.0 - b) / 7.0, 0, 1)
# The rug's front edge is a pinker mauve (slightly warm); include it there only,
# so beige chairs and skin elsewhere are not touched.
h, w_ = img.shape[:2]
yy, xx = np.mgrid[0:h, 0:w_]
rug = (yy > 0.78 * h) & (xx > 0.17 * w_) & (xx < 0.88 * w_)
purple = np.where(rug, np.clip((a - 1.0) / 3.0, 0, 1) * np.clip((11.0 - b) / 6.0, 0, 1), purple)
purple = cv2.GaussianBlur(purple, (0, 0), 2.0)
chroma = np.sqrt(a * a + b * b)
strong = np.clip((chroma - 14.0) / 8.0, 0, 1)  # real colored light/fabric
# Marble floor: reflections of the purple glow become plain marble, not teal.
# (Floor = lower part of the room, minus the desk, the rug and the armchairs.)
desk = (xx > 0.245 * w_) & (xx < 0.765 * w_) & (yy < 0.69 * h)
chairs = ((xx < 0.19 * w_) & (yy > 0.6 * h)) | ((xx > 0.82 * w_) & (yy > 0.65 * h))
floor = (yy > 0.5 * h) & ~rug & ~desk & ~chairs
strong = np.where(floor, 0.0, strong)
strong = cv2.GaussianBlur(strong.astype(np.float32), (0, 0), 3.0)

# Strong purple -> teal (flip magenta to green, keep the blue).
a_teal = -a * 1.1
b_teal = b * 0.85
# Faint tint -> neutral (drop the magenta and the slight blue that came with it).
a_neu = a * 0.1
b_neu = np.where(b < 0, b * 0.3, b)

a_fix = strong * a_teal + (1 - strong) * a_neu
b_fix = strong * b_teal + (1 - strong) * b_neu
a_new = a * (1 - purple) + a_fix * purple
b_new = b * (1 - purple) + b_fix * purple

lab2 = np.stack([L, a_new + 128, b_new + 128], axis=-1).clip(0, 255).astype(np.uint8)
res = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)
cv2.imwrite(out, res, [cv2.IMWRITE_JPEG_QUALITY, 88])
print('recolored', out)
