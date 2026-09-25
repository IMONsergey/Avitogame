// Keep the 1920 × 1080 type and touch scale; extend the canvas to the window.
// This fills Mac aspect ratios without stretching letters or cropping controls.
export function canvasMetrics(width, height) {
  const scale = Math.min(width / 1920, height / 1080);
  return { scale, width: width / scale, height: height / scale };
}
