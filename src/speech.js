import { Input, ALL_FORMATS, BlobSource, AudioSampleSink } from 'mediabunny';
export async function prepareSpeech(file, signal, progress = () => {}) {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  let worker;
  const abort = () => { worker?.terminate(); input.dispose(); };
  signal.addEventListener('abort', abort, { once:true });
  try {
    signal.throwIfAborted();
    const track = await input.getPrimaryAudioTrack();
    if (!track) return null;
    if (!await track.canDecode()) throw new Error('This browser cannot decode the audio for voice processing.');
    const rate = await track.getSampleRate(), count = await track.getNumberOfChannels(), duration = await input.computeDuration();
    const length = Math.ceil(duration * rate);
    if (count > 2 || duration * 48000 * count * 4 * 4 > 256 * 1024 * 1024) throw new Error('Voice processing supports mono/stereo clips within a 256 MB working budget. Try a shorter clip.');
    const channels = Array.from({ length:count }, () => new Float32Array(length));
    for await (const sample of new AudioSampleSink(track).samples()) {
      try {
        signal.throwIfAborted();
        if (sample.sampleRate !== rate || sample.numberOfChannels !== count) throw new Error('Changing audio formats are not supported.');
        const start = Math.round(sample.timestamp * rate), from = Math.max(0,-start), target = Math.max(0,start);
        const frames = Math.min(sample.numberOfFrames-from, length-target);
        if (frames>0) for (let c=0;c<count;c++) sample.copyTo(channels[c].subarray(target,target+frames), { planeIndex:c, format:'f32-planar', frameOffset:from, frameCount:frames });
        progress(Math.min(.15, Math.max(0,sample.timestamp/duration)*.15));
      } finally { sample.close(); }
    }
    signal.throwIfAborted();
    let processed = channels;
    if (rate !== 48000) {
      const context = new OfflineAudioContext(count, Math.ceil(duration*48000), 48000);
      const buffer = new AudioBuffer({ numberOfChannels:count, length, sampleRate:rate });
      channels.forEach((values,c)=>buffer.copyToChannel(values,c));
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();
      const rendered=await context.startRendering(); processed=Array.from({length:count},(_,c)=>rendered.getChannelData(c).slice());
    }
    signal.throwIfAborted();
    worker = new Worker('./speech-worker.js', { type:'module' });
    const output = await new Promise((resolve,reject) => {
      const stop = () => reject(new DOMException('Cancelled','AbortError'));
      signal.addEventListener('abort',stop,{once:true});
      worker.onmessage = ({data}) => {
        if (data.progress !== undefined) { progress(.15 + data.progress*.85); return; }
        signal.removeEventListener('abort',stop); data.error ? reject(new Error(data.error)) : resolve(data.channels);
      };
      worker.onerror = () => { signal.removeEventListener('abort',stop); reject(new Error('Speech processing failed.')); };
      worker.postMessage({channels:processed}, processed.map(channel=>channel.buffer));
    });
    signal.throwIfAborted();progress(1);
    return output;
  } finally { signal.removeEventListener('abort',abort); worker?.terminate(); input.dispose(); }
}
export function speechSample(channels, timestamp, frames, rate) {
  const data = new Float32Array(frames*channels.length);
  for(let c=0;c<channels.length;c++) for(let i=0;i<frames;i++) {
    const position=(timestamp+i/rate)*48000, index=Math.floor(position), fraction=position-index;
    data[c*frames+i]=(channels[c][index]||0)*(1-fraction)+(channels[c][index+1]||0)*fraction;
  }
  return data;
}
