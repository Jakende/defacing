// Offline pitch shifting acts only on the estimated speech component.
export function shiftSpeech(input, rate = 48000, semitones = -4) {
  const output = new Float32Array(input.length), ratio = 2 ** (semitones / 12);
  const grain = Math.round(rate * .05);
  const read = position => {
    const i = Math.floor(position), part = position - i;
    return (input[i] || 0) * (1 - part) + (input[i + 1] || 0) * part;
  };
  for (let i = 0; i < input.length; i++) {
    const phase = ((i * (1 - ratio) / grain) % 1 + 1) % 1, other = (phase + .5) % 1;
    const weight = .5 - .5 * Math.cos(2 * Math.PI * phase);
    output[i] = .85 * (weight * read(i + grain / 2 - phase * grain) + (1 - weight) * read(i + grain / 2 - other * grain));
  }
  return output;
}
export function remixSpeech(originals, speech) {
  const output = originals.map((original, channel) => {
    const shifted = shiftSpeech(speech[channel]);
    return Float32Array.from(original, (value,i) => value - speech[channel][i] + shifted[i]);
  });
  let before = 0, after = 0, originalPeak = 0, outputPeak = 0;
  for (let c=0;c<output.length;c++) for (let i=0;i<output[c].length;i++) {
    before += originals[c][i] ** 2; after += output[c][i] ** 2;
    originalPeak = Math.max(originalPeak, Math.abs(originals[c][i])); outputPeak = Math.max(outputPeak, Math.abs(output[c][i]));
  }
  // Linked attenuation protects stereo balance. Never normalize upwards.
  const gain = Math.min(1, Math.sqrt(before / Math.max(after, 1e-20)), Math.min(originalPeak, .98) / Math.max(outputPeak, 1e-20));
  for (const channel of output) for (let i=0;i<channel.length;i++) channel[i] *= gain;
  return { channels: output, gain };
}
