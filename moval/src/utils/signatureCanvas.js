// Utility helpers for handling high-DPI canvas sizing for signature inputs
export function resizeSignatureCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // If not laid out yet, return a usable context (no resize)
  if (rect.width === 0 || rect.height === 0) {
    const fallbackCtx = canvas.getContext("2d");
    fallbackCtx.strokeStyle = "#0f172a";
    fallbackCtx.lineWidth = 2;
    fallbackCtx.lineCap = "round";
    fallbackCtx.lineJoin = "round";
    return fallbackCtx;
  }

  const width = rect.width || canvas.offsetWidth || 300;
  const height = rect.height || canvas.offsetHeight || 150;

  // Save previous drawing (optional)
  let prev = "";
  try { prev = canvas.toDataURL(); } catch (err) { prev = ""; }

  // Adjust internal buffer to CSS size * DPR
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  const ctx = canvas.getContext("2d");

  // Make 1 unit = 1 CSS px
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Ensure visible stroke styles
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Fill white background in device pixels to make PNGs readable
  try {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  } catch (err) {
    // ignore
  }

  // Restore previous drawing scaled to CSS pixels
  if (prev && prev !== "data:,") {
    const img = new Image();
    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0, width, height);
      } catch (err) {
        // ignore
      }
    };
    img.src = prev;
  }

  return ctx;
}

export function clearSignatureCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear full buffer in device pixels and paint white background
  try {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  } catch (err) {
    // fallback: try simple clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Reapply expected drawing transform and styles
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export default resizeSignatureCanvas;
