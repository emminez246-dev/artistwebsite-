// Perspective ("straighten") transform: maps a quadrilateral drawn on a
// possibly-skewed image onto a clean rectangle, the way Google Photos'
// straighten/perspective tool works.
//
// Math: a projective homography estimated via Direct Linear Transform (DLT)
// from 4 point correspondences, solved with Gaussian elimination.

export type Pt = { x: number; y: number };

/** Solve Ax = b for an 8x8 system using Gaussian elimination with partial pivoting. */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];

    const pivotVal = M[col][col];
    if (Math.abs(pivotVal) < 1e-12) continue; // degenerate quad, avoid NaN

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col] / pivotVal;
      for (let c = col; c <= n; c++) M[row][c] -= factor * M[col][c];
    }
  }

  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}

/**
 * Computes the 8 free coefficients (h11..h32, with h33 = 1) of the
 * homography mapping each `from[i]` to `to[i]`.
 */
export function getPerspectiveTransform(from: [Pt, Pt, Pt, Pt], to: [Pt, Pt, Pt, Pt]): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i];
    const { x: xp, y: yp } = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp]);
    b.push(xp);
    A.push([0, 0, 0, x, y, 1, -x * yp, -y * yp]);
    b.push(yp);
  }

  return solveLinearSystem(A, b);
}

/** Applies a homography (from getPerspectiveTransform) to a single point. */
export function applyTransform(h: number[], x: number, y: number): Pt {
  const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
  const denom = h31 * x + h32 * y + 1;
  return {
    x: (h11 * x + h12 * y + h13) / denom,
    y: (h21 * x + h22 * y + h23) / denom,
  };
}

/**
 * Warps `image` so that the quadrilateral `corners` (in the image's natural
 * pixel space, clockwise from top-left) becomes a clean outWidth x outHeight
 * rectangle. Uses inverse mapping + bilinear sampling for quality.
 */
export function warpToRectangle(
  image: HTMLImageElement,
  corners: [Pt, Pt, Pt, Pt],
  outWidth: number,
  outHeight: number
): HTMLCanvasElement {
  // Read the source at a capped working resolution so the per-pixel warp
  // (which runs on the CPU) stays fast even for large uploads.
  const MAX_SOURCE_DIM = 2200;
  const scale = Math.min(1, MAX_SOURCE_DIM / Math.max(image.naturalWidth, image.naturalHeight));
  const srcW = Math.round(image.naturalWidth * scale);
  const srcH = Math.round(image.naturalHeight * scale);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
  srcCtx.drawImage(image, 0, 0, srcW, srcH);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const src = srcData.data;

  const scaledCorners = corners.map((p) => ({ x: p.x * scale, y: p.y * scale })) as [Pt, Pt, Pt, Pt];
  const outRect: [Pt, Pt, Pt, Pt] = [
    { x: 0, y: 0 },
    { x: outWidth, y: 0 },
    { x: outWidth, y: outHeight },
    { x: 0, y: outHeight },
  ];
  // Maps output pixel coords -> input pixel coords (inverse warp).
  const h = getPerspectiveTransform(outRect, scaledCorners);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outWidth;
  outCanvas.height = outHeight;
  const outCtx = outCanvas.getContext("2d")!;
  const outData = outCtx.createImageData(outWidth, outHeight);
  const out = outData.data;

  const sample = (x: number, y: number, channel: number): number => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, srcW - 1), y1 = Math.min(y0 + 1, srcH - 1);
    const cx0 = Math.max(0, Math.min(x0, srcW - 1));
    const cy0 = Math.max(0, Math.min(y0, srcH - 1));
    const fx = x - x0, fy = y - y0;

    const i00 = (cy0 * srcW + cx0) * 4 + channel;
    const i10 = (cy0 * srcW + x1) * 4 + channel;
    const i01 = (y1 * srcW + cx0) * 4 + channel;
    const i11 = (y1 * srcW + x1) * 4 + channel;

    const top = src[i00] * (1 - fx) + src[i10] * fx;
    const bottom = src[i01] * (1 - fx) + src[i11] * fx;
    return top * (1 - fy) + bottom * fy;
  };

  for (let oy = 0; oy < outHeight; oy++) {
    for (let ox = 0; ox < outWidth; ox++) {
      const { x: ix, y: iy } = applyTransform(h, ox, oy);
      const outIdx = (oy * outWidth + ox) * 4;

      if (ix < 0 || ix > srcW - 1 || iy < 0 || iy > srcH - 1) {
        out[outIdx + 3] = 0; // transparent outside the source
        continue;
      }

      out[outIdx] = sample(ix, iy, 0);
      out[outIdx + 1] = sample(ix, iy, 1);
      out[outIdx + 2] = sample(ix, iy, 2);
      out[outIdx + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}
