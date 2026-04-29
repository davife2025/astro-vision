import sharp from "sharp";
import type { ChangeDetection } from "@astrovision/pipeline";

const COMPARISON_SIZE = 512;

/**
 * Compare two astronomical images for change detection.
 *
 * Steps:
 *  1. Resize both to a common resolution
 *  2. Convert to greyscale and normalize intensity
 *  3. Compute pixel-level difference
 *  4. Threshold to find significant changes
 *  5. Compute SNR and cluster count
 */
export async function compareImages(
  newImageBuffer: Buffer,
  referenceImageBuffer: Buffer
): Promise<{ detection: ChangeDetection; diffImageBase64: string }> {
  // Resize and normalize both to greyscale
  const [newGrey, refGrey] = await Promise.all([
    sharp(newImageBuffer)
      .resize(COMPARISON_SIZE, COMPARISON_SIZE, { fit: "fill" })
      .greyscale()
      .normalize()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(referenceImageBuffer)
      .resize(COMPARISON_SIZE, COMPARISON_SIZE, { fit: "fill" })
      .greyscale()
      .normalize()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);

  const pixels = COMPARISON_SIZE * COMPARISON_SIZE;
  const newData = newGrey.data;
  const refData = refGrey.data;

  // Compute absolute difference and statistics
  const diffData = Buffer.alloc(pixels);
  let sumDiff = 0;
  let sumDiffSq = 0;

  for (let i = 0; i < pixels; i++) {
    const d = Math.abs(newData[i] - refData[i]);
    diffData[i] = d;
    sumDiff += d;
    sumDiffSq += d * d;
  }

  const meanDiff = sumDiff / pixels;
  const variance = sumDiffSq / pixels - meanDiff * meanDiff;
  const stdDev = Math.sqrt(Math.max(variance, 1)); // avoid div by 0

  // Threshold: pixels with difference > 3 sigma are "significant"
  const threshold = meanDiff + 3 * stdDev;
  let significantPixels = 0;
  const significantMap = Buffer.alloc(pixels);

  for (let i = 0; i < pixels; i++) {
    if (diffData[i] > threshold) {
      significantPixels++;
      significantMap[i] = 255;
    }
  }

  // Simple cluster estimation: count connected regions via scanline
  const significantRegions = estimateClusters(significantMap, COMPARISON_SIZE);

  // SNR: peak signal over noise floor
  let maxDiff = 0;
  for (let i = 0; i < pixels; i++) {
    if (diffData[i] > maxDiff) maxDiff = diffData[i];
  }
  const snr = stdDev > 0 ? maxDiff / stdDev : 0;

  // Generate diff image as false-color PNG
  // Red channel = difference intensity, boosted for visibility
  const rgbDiff = Buffer.alloc(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    const v = Math.min(255, diffData[i] * 3); // boost contrast
    if (significantMap[i]) {
      // Significant changes in hot colors
      rgbDiff[i * 3] = 255;                   // R
      rgbDiff[i * 3 + 1] = Math.max(0, 255 - v * 2); // G
      rgbDiff[i * 3 + 2] = 0;                 // B
    } else {
      // Background in cool blue
      rgbDiff[i * 3] = 0;
      rgbDiff[i * 3 + 1] = 0;
      rgbDiff[i * 3 + 2] = Math.min(80, v);
    }
  }

  const diffPng = await sharp(rgbDiff, {
    raw: { width: COMPARISON_SIZE, height: COMPARISON_SIZE, channels: 3 },
  })
    .png()
    .toBuffer();

  const diffImageBase64 = diffPng.toString("base64");

  const changeScore = significantPixels;
  const isSignificant = snr >= 3 && significantRegions >= 1;

  let description = "";
  if (!isSignificant) {
    description = "No significant changes detected between epochs.";
  } else if (snr >= 10) {
    description = `Strong signal detected: ${significantRegions} region(s) with changes well above noise floor (SNR ${snr.toFixed(1)}).`;
  } else if (snr >= 5) {
    description = `Moderate changes detected: ${significantRegions} region(s) with notable differences (SNR ${snr.toFixed(1)}).`;
  } else {
    description = `Marginal changes detected: ${significantRegions} region(s) near the detection threshold (SNR ${snr.toFixed(1)}).`;
  }

  return {
    detection: {
      changeScore,
      signalToNoise: parseFloat(snr.toFixed(2)),
      significantRegions,
      isSignificant,
      description,
    },
    diffImageBase64,
  };
}

/**
 * Simple flood-fill cluster counter
 */
function estimateClusters(map: Buffer, size: number): number {
  const visited = new Uint8Array(size * size);
  let clusters = 0;

  for (let i = 0; i < size * size; i++) {
    if (map[i] && !visited[i]) {
      clusters++;
      // BFS flood fill
      const queue = [i];
      visited[i] = 1;
      while (queue.length > 0) {
        const pos = queue.pop()!;
        const x = pos % size;
        const y = Math.floor(pos / size);
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            const ni = ny * size + nx;
            if (map[ni] && !visited[ni]) {
              visited[ni] = 1;
              queue.push(ni);
            }
          }
        }
      }
    }
  }

  return clusters;
}

/**
 * Fetch an image from a URL and return as buffer
 */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
