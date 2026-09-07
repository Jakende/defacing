export function expandedBox(box, width, height, padding = 0.25) {
  const [x1, y1, x2, y2] = box;
  const dx = (x2 - x1) * padding, dy = (y2 - y1) * padding;
  const x = Math.max(0, x1 - dx), y = Math.max(0, y1 - dy);
  return [x, y, Math.max(0, Math.min(width, x2 + dx) - x), Math.max(0, Math.min(height, y2 + dy) - y)];
}
export function normalizedRect(a, b) {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])];
}
export function maskFrame(canvas, boxes, regions, { mode = 'solid', block = 24, padding = 0.25, color = '#101113' } = {}) {
  const ctx = canvas.getContext('2d');
  const rectangles = boxes.map(b => expandedBox(b, canvas.width, canvas.height, padding));
  rectangles.push(...regions.filter(Array.isArray).map(r => [r[0] * canvas.width, r[1] * canvas.height, r[2] * canvas.width, r[3] * canvas.height]));
  const strokes = regions.filter(r => !Array.isArray(r));
  const tiny = document.createElement('canvas'), t = tiny.getContext('2d');
  for (const [rx, ry, rw, rh] of rectangles) {
    const x = Math.floor(rx), y = Math.floor(ry), w = Math.ceil(rx + rw) - x, h = Math.ceil(ry + rh) - y;
    if (w <= 0 || h <= 0) continue;
    if (mode === 'solid') { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
    else {
      tiny.width = Math.max(1, Math.ceil(w / block)); tiny.height = Math.max(1, Math.ceil(h / block));
      t.drawImage(canvas, x, y, w, h, 0, 0, tiny.width, tiny.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, w, h);
      ctx.imageSmoothingEnabled = true;
    }
  }
  if (strokes.length) {
    const layer = document.createElement('canvas'); layer.width = canvas.width; layer.height = canvas.height;
    const paint = layer.getContext('2d');
    paint.fillStyle = paint.strokeStyle = color;
    for (const stroke of strokes) drawStroke(paint, stroke, canvas.width, canvas.height);
    if (mode !== 'solid') {
      tiny.width = Math.max(1, Math.ceil(canvas.width / block)); tiny.height = Math.max(1, Math.ceil(canvas.height / block));
      t.drawImage(canvas, 0, 0, tiny.width, tiny.height);
      paint.globalCompositeOperation = 'source-in'; paint.imageSmoothingEnabled = false;
      paint.drawImage(tiny, 0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(layer, 0, 0);
  }
}

export function drawStroke(ctx, stroke, width, height) {
  if (!stroke.points.length) return;
  ctx.lineWidth = stroke.size * Math.min(width, height);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  const [firstX, firstY] = stroke.points[0];
  ctx.moveTo(firstX * width, firstY * height);
  for (const [x,y] of stroke.points.slice(1)) ctx.lineTo(x * width, y * height);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(firstX * width, firstY * height, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill();
}
