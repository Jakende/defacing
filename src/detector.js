export class Detector {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = 640;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.worker = new Worker('./face-worker.js');
  }
  async detect(source) {
    if (this.pending) throw new Error('Detection is already running.');
    const width = source.width, height = source.height;
    const scale = Math.min(640 / width, 640 / height);
    const w = Math.round(width * scale), h = Math.round(height * scale);
    const px = Math.floor((640 - w) / 2), py = Math.floor((640 - h) / 2);
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, 640, 640);
    this.ctx.drawImage(source, px, py, w, h);
    const pixels = this.ctx.getImageData(0, 0, 640, 640).data, plane = 640 * 640;
    const input = new Float32Array(plane * 3);
    for (let i = 0; i < plane; i++) { input[i] = pixels[i*4+2]; input[i+plane] = pixels[i*4+1]; input[i+plane*2] = pixels[i*4]; }
    const boxes = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.dispose(); }, 90000);
      const finish = (error, result) => { clearTimeout(timer); this.pending = null; error ? reject(error) : resolve(result); };
      this.pending = finish;
      this.worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.boxes);
      this.worker.onerror = () => finish(new Error('Face detection could not be loaded.'));
      this.worker.postMessage({ input }, [input.buffer]);
    });
    return boxes.map(([x1,y1,x2,y2]) => [(x1-px)*width/w, (y1-py)*height/h, (x2-px)*width/w, (y2-py)*height/h]);
  }
  dispose() { this.worker.terminate(); this.pending?.(new Error('Face detection stopped or timed out.')); }
}
