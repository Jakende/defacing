// YuNet output decoding and non-maximum suppression.
const IN = 640, STRIDES = [8, 16, 32], SCORE = 0.6, NMS_THR = 0.3;

function decode(res) {
  const boxes = [], scores = [];
  for (const s of STRIDES) {
    const cls = res['cls_' + s].data, obj = res['obj_' + s].data, bb = res['bbox_' + s].data;
    const W = IN / s, N = cls.length;
    for (let i = 0; i < N; i++) {
      let c = cls[i] < 0 ? 0 : cls[i] > 1 ? 1 : cls[i];
      let o = obj[i] < 0 ? 0 : obj[i] > 1 ? 1 : obj[i];
      const score = Math.sqrt(c * o); if (score < SCORE) continue;
      const row = (i / W) | 0, col = i % W;
      const cx = (col + bb[i*4]) * s, cy = (row + bb[i*4+1]) * s;     // Zentrum
      const w = Math.exp(bb[i*4+2]) * s, h = Math.exp(bb[i*4+3]) * s; // Breite/Höhe (exp)
      boxes.push([cx - w/2, cy - h/2, cx + w/2, cy + h/2]); scores.push(score);
    }
  }
  return { boxes, scores };
}
function iou(a, b) {
  const x1 = Math.max(a[0],b[0]), y1 = Math.max(a[1],b[1]), x2 = Math.min(a[2],b[2]), y2 = Math.min(a[3],b[3]);
  const iw = Math.max(0,x2-x1), ih = Math.max(0,y2-y1), inter = iw*ih;
  return inter / ((a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter + 1e-9);
}
function nms(boxes, scores, thr) {
  const order = scores.map((s,i)=>i).sort((i,j)=>scores[j]-scores[i]);
  const keep = [], dead = new Uint8Array(boxes.length);
  for (const i of order) { if (dead[i]) continue; keep.push(i);
    for (const j of order) if (!dead[j] && j !== i && iou(boxes[i],boxes[j]) > thr) dead[j] = 1; }
  return keep;
}
