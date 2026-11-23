# Removes the blank digital screen from the lobby photo so the site's own
# welcome sign floats on the marble pillar with nothing showing behind it.
# The screen area is rebuilt from the marble pillar just below it (mirrored
# strips, so the bronze inlay keeps running straight), then seams are blended.
# Usage: python build/fix_lobby.py src/img-original/main-lobby.jpg img/main-lobby.jpg
import sys
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
s = img.shape[1] / 1672

def px(v):
    return int(round(v * s))

x0, x1 = px(840), px(1104)          # screen incl. frame and a margin for feathering
y0, y1 = px(58), px(504)
band = img[px(500):px(592), x0:x1]  # clean marble + bronze strip under the screen
bh = band.shape[0]

# Alternate strips are mirrored top-to-bottom so the veins don't visibly repeat.
def variant(k):
    return band[::-1] if k % 2 else band

H, W = y1 - y0, x1 - x0
fill = np.zeros((H, W, 3), np.float32)
weight = np.zeros((H, W, 1), np.float32)
step, ov = bh - 16, 16           # overlap strips and cross-fade them
y, k = 0, 0
while y < H:
    t = variant(k).astype(np.float32)
    n = min(bh, H - y)
    ramp = np.ones((n, 1, 1), np.float32)
    if y > 0:
        r = np.linspace(0, 1, min(ov, n))[:, None, None]
        ramp[:len(r)] = r
    fill[y:y + n] = fill[y:y + n] * (1 - ramp) + t[:n] * ramp
    y += step
    k += 1

# Match the marble's brightness to the pillar just above the screen.
above = img[px(8):px(58), x0:x1].astype(np.float32).reshape(-1, 3).mean(0)
mean = fill[: px(60)].reshape(-1, 3).mean(0)
fill *= np.clip(above / np.maximum(mean, 1), 0.8, 1.3)

# Feathered edges so the patch melts into the surrounding photo.
alpha = np.ones((H, W), np.float32)
f = px(10)
ramp = np.linspace(0, 1, f)
alpha[:f] *= ramp[:, None]; alpha[-f:] *= ramp[::-1][:, None]
alpha[:, :f] *= ramp[None, :]; alpha[:, -f:] *= ramp[::-1][None, :]
region = img[y0:y1, x0:x1].astype(np.float32)
res = img.copy()
res[y0:y1, x0:x1] = (fill * alpha[..., None] + region * (1 - alpha[..., None])).clip(0, 255).astype(np.uint8)
cv2.imwrite(out, res, [cv2.IMWRITE_JPEG_QUALITY, 88])
print('screen removed', out)
