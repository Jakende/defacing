// Reuse the upstream YuNet decoder; keep one inference session for the video.
importScripts('./face-decoder.js', './ort/ort.min.js');
ort.env.wasm.wasmPaths = './ort/';
ort.env.wasm.numThreads = 1;
let session;
self.onmessage = async ({ data }) => {
  try {
    if (!session) session = await ort.InferenceSession.create('./models/yunet.onnx', { executionProviders: ['wasm'] });
    const tensor = new ort.Tensor('float32', data.input, [1, 3, 640, 640]);
    let result;
    try {
      result = await session.run({ [session.inputNames[0]]: tensor });
      const { boxes, scores } = decode(result);
      self.postMessage({ boxes: nms(boxes, scores, 0.3).map(i => boxes[i]) });
    } finally {
      tensor.dispose?.();
      if (result) for (const output of Object.values(result)) output.dispose?.();
    }
  } catch (error) { self.postMessage({ error: error.message || String(error) }); }
};
