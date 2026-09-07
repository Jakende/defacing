import { initAsync, df_create, df_get_frame_length, df_process_frame } from '../node_modules/deepfilter-standalone/dist/df3/df.js';
import { remixSpeech } from './speech-dsp.js';
self.onmessage = async ({ data: { channels } }) => {
  try {
    const responses = await Promise.all([fetch('./vendor/deepfilter/pkg/df_bg.wasm'), fetch('./vendor/deepfilter/models/DeepFilterNet3_onnx.tar.gz')]);
    if (responses.some(response => !response.ok)) throw new Error('Speech model assets are unavailable.');
    const [wasm, model] = await Promise.all(responses.map(response => response.arrayBuffer()));
    await initAsync(wasm);
    const speech = [];
    for (let channel=0;channel<channels.length;channel++) {
      const handle = df_create(new Uint8Array(model), 100);
      const frameSize = df_get_frame_length(handle);
      // Bundled model: FFT 960, hop 480, two lookahead frames = 1440 samples.
      const delay = 1440, original = channels[channel], estimated = new Float32Array(original.length);
      const frame = new Float32Array(frameSize);
      for (let offset=0;offset<original.length+delay;offset+=frameSize) {
        frame.fill(0); frame.set(original.subarray(offset, offset+frameSize));
        const output = df_process_frame(handle, frame);
        for (let i=0;i<output.length;i++) { const index=offset+i-delay; if (index>=0&&index<estimated.length) estimated[index]=output[i]; }
        if (offset % 24000 === 0) self.postMessage({ progress:(channel + offset / (original.length+delay))/channels.length });
      }
      speech.push(estimated);
    }
    const result = remixSpeech(channels, speech);
    self.postMessage({ ...result }, result.channels.map(channel=>channel.buffer));
  } catch (error) { self.postMessage({ error:error.message || String(error) }); }
};
