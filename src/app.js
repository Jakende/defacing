import { AudioSample, Input, ALL_FORMATS, BlobSource, CanvasSink, Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion } from 'mediabunny';
import { Detector } from './detector.js';
import { maskFrame, normalizedRect } from './masks.js';
import { History } from './history.js';
import { prepareSpeech, speechSample } from './speech.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
const $ = id => document.getElementById(id);
const preview = $('preview'), ctx = preview.getContext('2d');
const raw = document.createElement('canvas'), rawCtx = raw.getContext('2d');
const player = document.createElement('video'); player.playsInline = true; player.preload = 'auto';
let file, input, sink, bitmap, boxes = [], regions = [], busy = false, loading = false, opening = false, conversion, detector;
let resultUrl, resultBlob, shareFile, sharing = false, sourceUrl, cancelled = false, previewQueue = Promise.resolve(), epoch = 0, drawing;
let playing = false, startingPlayback = false, animation, liveDetector, livePending = false, playbackEpoch = 0;
let previewAudioContext, speechSource, speechBuffer, speechChannels, speechAbort, speechPromise;
let previewMuted = false, reviewView = 'edited';
async function ensureSpeech() {
  if (speechChannels) return speechChannels;
  if (speechPromise) return speechPromise;
  const ownsBusy = !busy;
  if (ownsBusy) { cancelled=false; setBusy(true); }
  speechAbort = new AbortController();
  speechPromise = prepareSpeech(file, speechAbort.signal, value => { say(`Preparing voices · ${Math.round(value*100)}%`); $('progress').value=value; });
  try { speechChannels = await speechPromise; return speechChannels; }
  finally { speechPromise=null; speechAbort=null; if (ownsBusy) setBusy(false); }
}
async function configurePreviewAudio() {
  const mode = reviewView === 'original' ? 'keep' : $('audio').value;
  player.muted = previewMuted || mode !== 'keep';
  if (mode !== 'disguise') return;
  previewAudioContext ??= new AudioContext({sampleRate:48000});
  await previewAudioContext.resume();
  const channels = await ensureSpeech();
  if (channels && !speechBuffer) {
    speechBuffer = new AudioBuffer({numberOfChannels:channels.length,length:channels[0].length,sampleRate:48000});
    channels.forEach((channel,i)=>speechBuffer.copyToChannel(channel,i));
  }
}
function startSpeechPlayback() {
  if (reviewView === 'original' || $('audio').value !== 'disguise' || !speechBuffer || previewMuted) return;
  speechSource = previewAudioContext.createBufferSource(); speechSource.buffer=speechBuffer;
  speechSource.connect(previewAudioContext.destination);
  if (player.currentTime < speechBuffer.duration) speechSource.start(0,player.currentTime);
}
function setReview(view) {
  if (view === 'export' && !resultUrl) return;
  pausePlayback(); $('resultvideo').pause(); reviewView = view;
  $('preview').hidden = !file || view === 'export';
  $('resultvideo').hidden = view !== 'export' || !sink;
  $('resultimage').hidden = view !== 'export' || !bitmap;
  $('timeline').hidden = !sink || view === 'export';
  for (const name of ['original','edited','export']) $('view-'+name).setAttribute('aria-pressed',String(name===view));
  render();
}
for (const view of ['original','edited','export']) $('view-'+view).onclick=()=>setReview(view);
const editControls = ['mode','maskcolor','block','padding','automatic','audio','format','resolution'];
const options = () => ({ mode: $('mode').value, block: +$('block').value, padding: +$('padding').value / 100, color: $('maskcolor').value });
const say = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const time = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const snapshot = () => ({ regions, controls: Object.fromEntries(editControls.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value])) });
const history = new History(snapshot());
function updateControls() {
  $('solidsettings').hidden = $('mode').value !== 'solid'; $('colour-value').textContent=$('maskcolor').value.toUpperCase();
  $('view-original').disabled=busy||!file; $('view-edited').disabled=busy||!file; $('view-export').disabled=busy||!resultUrl;
  $('voice-note').hidden = $('audio').value !== 'disguise';
  $('undo').disabled = busy || !history.canUndo; $('redo').disabled = busy || !history.canRedo;
  $('paddingval').textContent = `${$('padding').value}%`; $('blockval').textContent = `${$('block').value} px`; $('brushval').textContent = `${$('brushsize').value}%`;
  $('pixelsettings').hidden = $('mode').value !== 'pixelate'; $('brushsettings').hidden = $('tool').value !== 'brush';
  $('padding').disabled = busy || !$('automatic').checked;
}
function commit() { history.push(snapshot()); invalidate(); updateControls(); }
function restore(direction) {
  if (busy || opening || drawing || (direction === 'undo' ? !history.canUndo : !history.canRedo)) return;
  pausePlayback();
  const state = history[direction](); regions = state.regions;
  for (const [id,value] of Object.entries(state.controls)) { if ($(id).type === 'checkbox') $(id).checked = value; else $(id).value = value; }
  invalidate(); updateControls(); render(); void refresh();
}
function invalidate() {
  if (reviewView === 'export') setReview('edited');
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = null; resultBlob=null; shareFile=null; $('save-actions').hidden=true; $('share-export').hidden=true; $('save-hint').hidden=true; $('download').hidden = true; $('download').removeAttribute('href');
  $('resultvideo').pause(); $('resultvideo').removeAttribute('src'); $('resultvideo').load(); $('resultvideo').hidden = true; $('resultimage').hidden=true; $('resultimage').removeAttribute('src'); $('view-export').disabled=true;
}
function setBusy(value) {
  busy = value; $('settings').disabled = value; $('choose').disabled = value; $('empty').disabled = value;
  $('seek').disabled = value; $('play').disabled = value || !sink; $('mute').disabled = value;
  $('export').disabled = value || !file || !raw.width;
  $('cancel').hidden = !value; $('progress').hidden = !value; updateControls();
}
function render() {
  if (!file || !raw.width) return;
  if (preview.width !== raw.width || preview.height !== raw.height) { preview.width = raw.width; preview.height = raw.height; }
  ctx.drawImage(raw, 0, 0);
  const pending = drawing ? (drawing.kind === 'brush' ? drawing.stroke : normalizedRect(drawing.start, drawing.end)) : null;
  if (reviewView !== 'original') maskFrame(preview, $('automatic').checked ? boxes : [], pending ? [...regions, pending] : regions, options());
  const count = $('automatic').checked ? boxes.length : 0;
  $('faces').textContent = `${count} face${count === 1 ? '' : 's'} · ${regions.length} drawing${regions.length === 1 ? '' : 's'}`;
}
function drawSource(source, width, height) {
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
  if (raw.width !== w || raw.height !== h) { raw.width = w; raw.height = h; }
  rawCtx.drawImage(source, 0, 0, w, h);
}
function pausePlayback() {
  try { speechSource?.stop(); } catch {} speechSource=null;
  playing = false; player.pause(); cancelAnimationFrame(animation); playbackEpoch++;
  liveDetector?.dispose(); liveDetector = null; livePending = false;
  $('play').textContent = 'Play'; $('play').setAttribute('aria-label','Play preview'); $('previewstate').textContent = '';
}
function playbackFrame() {
  if (!playing) return;
  if (player.readyState >= 2) {
    drawSource(player, player.videoWidth, player.videoHeight);
    $('seek').value = player.currentTime; $('time').textContent = time(player.currentTime);
    if ($('automatic').checked && !livePending) {
      livePending = true; const current = playbackEpoch;
      liveDetector ??= new Detector();
      liveDetector.detect(raw).then(found => { if (current === playbackEpoch) boxes = found; }).catch(error => {
        if (current === playbackEpoch) { pausePlayback(); say(`Preview detection failed: ${error.message}`, true); }
      }).finally(() => { if (current === playbackEpoch) livePending = false; });
    }
    render();
  }
  animation = requestAnimationFrame(playbackFrame);
}
$('play').onclick = async () => {
  if (busy || !sink || startingPlayback) return;
  if (playing) { pausePlayback(); void refresh(); return; }
  startingPlayback = true; const requestEpoch = playbackEpoch;
  await previewQueue.catch(() => {});
  try {
    if (requestEpoch !== playbackEpoch || busy || !sink) return;
    if (+$('seek').value >= +$('seek').max - .05) $('seek').value = 0;
    player.currentTime = +$('seek').value;
    await configurePreviewAudio();
    await player.play();
    if (requestEpoch !== playbackEpoch || busy || !sink) { player.pause(); return; }
    playing = true; playbackEpoch++; startSpeechPlayback();
    $('play').textContent = 'Pause'; $('play').setAttribute('aria-label','Pause preview'); $('previewstate').textContent = 'Live preview';
    playbackFrame(); say('');
  } catch (error) { say(error.name === 'AbortError' ? 'Cancelled.' : `Preview unavailable: ${error.message}`, error.name !== 'AbortError'); } finally { startingPlayback = false; }
};
player.onended = () => { pausePlayback(); $('seek').value = $('seek').max; void refresh(); };
$('mute').onclick = () => {
  previewMuted=!previewMuted; player.muted=previewMuted || (reviewView!=='original'&&$('audio').value!=='keep');
  try { speechSource?.stop(); } catch {} speechSource=null;
  if (playing) startSpeechPlayback();
  $('mute').textContent=previewMuted?'Unmute':'Mute'; $('mute').setAttribute('aria-label',previewMuted?'Unmute preview audio':'Mute preview audio');
};
player.onwaiting = () => { try { speechSource?.stop(); } catch {} speechSource=null; };
player.onplaying = () => { if (playing && !speechSource) startSpeechPlayback(); };
async function refresh(detect = true) {
  const current = epoch;
  previewQueue = previewQueue.catch(() => {}).then(async () => {
    if (current !== epoch || busy || playing || !file) return;
    loading = true; $('export').disabled = true; $('play').disabled = true;
    try {
      let source = bitmap;
      if (sink) { const frame = await sink.getCanvas(+$('seek').value); if (!frame) throw new Error('No frame is available at this position.'); source = frame.canvas; }
      if (current !== epoch) return;
      drawSource(source, source.width, source.height);
      if (detect) {
        boxes = [];
        if ($('automatic').checked) { say('Detecting faces…'); detector ??= new Detector(); boxes = await detector.detect(raw); }
      }
      if (current !== epoch) return;
      render(); say('');
    } catch (error) {
      if (current !== epoch) return;
      detector?.dispose(); detector = null; boxes = []; render(); say(`Preview failed: ${error.message}`, true);
    } finally { loading = false; if (current === epoch && !busy) { $('export').disabled = !file; $('play').disabled = !sink; } }
  });
  return previewQueue;
}
async function load(selected) {
  if (!selected || busy || opening) return;
  speechAbort?.abort(); speechChannels=null; speechBuffer=null;
  opening = true; document.querySelector('.workspace').classList.remove('has-media'); pausePlayback(); epoch++; file = null;
  detector?.dispose(); detector = null; await previewQueue.catch(() => {});
  invalidate(); input?.dispose(); input = null; sink = null; bitmap?.close(); bitmap = null; boxes = []; regions = [];
  player.removeAttribute('src'); player.load(); if (sourceUrl) URL.revokeObjectURL(sourceUrl); sourceUrl = null;
  raw.width = 0; $('export').disabled = true; $('preview').hidden = true; $('empty').hidden = false; $('timeline').hidden = true;
  $('filename').textContent = selected.name; $('meta').textContent = 'OPENING'; say('Importing…');
  try {
    if (selected.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|bmp)$/i.test(selected.name)) {
      bitmap = await createImageBitmap(selected); $('meta').textContent = `${bitmap.width} × ${bitmap.height}`;
      $('videosettings').hidden = true;
    } else {
      if (!globalThis.VideoDecoder || !globalThis.VideoEncoder || !isSecureContext) throw new Error('Video requires WebCodecs over HTTPS or localhost. Try a current version of Chrome or Edge.');
      input = new Input({ formats: ALL_FORMATS, source: new BlobSource(selected) });
      const track = await input.getPrimaryVideoTrack();
      if (!track || !await track.canDecode()) throw new Error('This browser cannot decode the video codec.');
      const duration = await input.computeDuration();
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('Could not read the video duration.');
      sink = new CanvasSink(track, { poolSize: 1 }); sourceUrl = URL.createObjectURL(selected); player.src = sourceUrl;
      $('seek').max = Math.max(0, duration - .001); $('seek').value = 0; $('time').textContent = '0:00';
      $('timeline').hidden = false; $('meta').textContent = `${time(duration)} · VIDEO`; $('videosettings').hidden = false;
    }
    file = selected; reviewView='edited'; setReview('edited'); document.querySelector('.workspace').classList.add('has-media'); history.reset(snapshot()); updateControls(); $('empty').hidden = true; $('preview').hidden = false;
    await refresh();
  } catch (error) { input?.dispose(); input = null; sink = null; bitmap?.close(); bitmap = null; file = null; $('meta').textContent = 'UNSUPPORTED'; say(error.message, true); }
  finally { opening = false; }
}
$('choose').onclick = $('empty').onclick = () => {
  if (busy || opening) return;
  if (matchMedia('(pointer: coarse)').matches) $('import-dialog').showModal();
  else $('file').click();
};
$('close-import').onclick=()=>$('import-dialog').close();
for (const button of document.querySelectorAll('[data-picker]')) button.onclick=()=>{
  $('import-dialog').close(); $(button.dataset.picker).click();
};
for (const id of ['file','library','camera-photo','camera-video']) $(id).onchange=()=>{
  const selected=$(id).files[0]; $(id).value=''; void load(selected);
};
for (const type of ['dragenter', 'dragover']) $('stage').addEventListener(type, event => { event.preventDefault(); if (!busy) $('stage').classList.add('dragover'); });
$('stage').addEventListener('dragleave', () => $('stage').classList.remove('dragover'));
$('stage').addEventListener('drop', event => { event.preventDefault(); $('stage').classList.remove('dragover'); void load(event.dataTransfer.files[0]); });
$('seek').oninput = () => { pausePlayback(); $('time').textContent = time(+$('seek').value); };
$('seek').onchange = () => { void refresh(); };
for (const id of editControls) $(id).onchange = () => { pausePlayback(); commit(); if (id === 'automatic') void refresh(); else render(); };
$('tool').onchange = $('brushsize').oninput = updateControls;
function point(event) { const rect = preview.getBoundingClientRect(); return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))]; }
preview.onpointerdown = event => {
  if (reviewView === 'export') return;
  if (reviewView === 'original') setReview('edited');
  if (busy || loading || event.button !== 0 || !file) return;
  pausePlayback(); const start = point(event);
  drawing = $('tool').value === 'brush' ? { kind: 'brush', stroke: { points: [start], size: +$('brushsize').value / 100 } } : { kind: 'rectangle', start, end: start };
  preview.setPointerCapture(event.pointerId); render();
};
preview.onpointermove = event => {
  if (!drawing) return;
  if (drawing.kind === 'brush') { for (const item of (event.getCoalescedEvents?.().length ? event.getCoalescedEvents() : [event])) drawing.stroke.points.push(point(item)); }
  else drawing.end = point(event);
  render();
};
preview.onpointerup = event => {
  if (!drawing) return;
  if (drawing.kind === 'brush') { drawing.stroke.points.push(point(event)); regions.push(drawing.stroke); }
  else { const rect = normalizedRect(drawing.start, point(event)); if (rect[2] > .003 && rect[3] > .003) regions.push(rect); }
  drawing = null; commit(); render();
};
preview.onpointercancel = () => { drawing = null; render(); };
$('undo').onclick = () => restore('undo'); $('redo').onclick = () => restore('redo');
document.addEventListener('keydown', event => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z' || event.altKey) return;
  if (event.target.isContentEditable || /^(TEXTAREA)$/.test(event.target.tagName) || (event.target.tagName === 'INPUT' && ['text','search','email','url','number'].includes(event.target.type))) return;
  event.preventDefault(); restore(event.shiftKey ? 'redo' : 'undo');
});
$('cancel').onclick = () => { if (!busy) return; cancelled = true; speechAbort?.abort(); say('Cancelling…'); detector?.dispose(); detector = null; void conversion?.cancel().catch(() => {}); };
function publish(blob, extension) {
  resultBlob=blob;
  $('download').textContent=Capacitor.isNativePlatform()?'Share export':'Download';
  resultUrl = URL.createObjectURL(blob);
  $('download').href = resultUrl; $('download').download = `${file.name.replace(/\.[^.]+$/, '')}-defaced.${extension}`; $('download').hidden = false;
  shareFile = new File([blob], $('download').download, {type:blob.type});
  let canShare=false;
  try { canShare=!!navigator.share && !!navigator.canShare?.({files:[shareFile]}); } catch {}
  $('save-actions').hidden=false;
  $('share-export').hidden=!canShare || Capacitor.isNativePlatform();
  $('save-hint').hidden=!canShare || Capacitor.isNativePlatform();
  if (sink) $('resultvideo').src = resultUrl; else $('resultimage').src=resultUrl;
  updateControls(); setReview('export');
  say(`Ready · ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
}
$('export').onclick = async () => {
  if (busy || opening || !file) return;
  pausePlayback(); setBusy(true); await previewQueue.catch(() => {}); invalidate(); cancelled = false; $('progress').value = 0; say('Preparing export…');
  const config = options(), fixed = structuredClone(regions), automatic = $('automatic').checked;
  let jobInput;
  try {
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    const audioMode = $('audio').value;
    const preparedAudio = audioMode === 'disguise' && sink ? await ensureSpeech() : null;
    if (cancelled) return;
    detector?.dispose(); detector = automatic ? new Detector() : null;
    if (bitmap) {
      const scale = Math.min(1, +$('resolution').value / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const found = automatic ? await detector.detect(canvas) : [];
      if (cancelled) return;
      maskFrame(canvas, found, fixed, config);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('The image could not be exported.');
      if (!cancelled) publish(blob, 'png');
    } else {
      jobInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
      const format = $('format').value, target = new BufferTarget();
      const output = new Output({ format: format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
      let frames = 0, recent = [];
      conversion = await Conversion.init({ input: jobInput, output, tracks: 'primary', showWarnings: false,
        video: async track => {
          const w = await track.getDisplayWidth(), h = await track.getDisplayHeight();
          const scale = Math.min(1, +$('resolution').value / Math.max(w, h));
          return { width: Math.max(2, Math.floor(w*scale/2)*2), height: Math.max(2, Math.floor(h*scale/2)*2), fit: 'fill', forceTranscode: true,
            process: async sample => {
              if (cancelled) throw new Error('Cancelled.');
              if (canvas.width !== sample.displayWidth || canvas.height !== sample.displayHeight) { canvas.width = sample.displayWidth; canvas.height = sample.displayHeight; }
              sample.draw(context, 0, 0);
              const found = automatic ? await detector.detect(canvas) : [];
              if (cancelled) throw new Error('Cancelled.');
              // Short hold bridges brief detection dropouts; every frame still runs inference.
              recent = recent.filter(entry => sample.timestamp - entry.time < .20);
              if (found.length) recent.push({ time: sample.timestamp, boxes: found });
              maskFrame(canvas, recent.flatMap(entry => entry.boxes), fixed, config);
              frames++; say(`${frames} frames · ${time(sample.timestamp)}`);
              return canvas;
            }
          };
        }, audio: {
          discard: audioMode === 'remove',
          ...(audioMode === 'disguise' && preparedAudio ? { codec: format === 'mp4' ? 'aac' : 'opus', forceTranscode: true, process: sample => {
            if (cancelled) throw new Error('Cancelled.');
            const count = sample.numberOfFrames;
            const data = speechSample(preparedAudio, sample.timestamp, count, sample.sampleRate);
            return new AudioSample({ data, format: 'f32-planar', numberOfChannels: sample.numberOfChannels, sampleRate: sample.sampleRate, timestamp: sample.timestamp });
          } } : {})
        }, tags: {}
      });
      const unexpected = conversion.discardedTracks.filter(item => item.reason !== 'discarded_by_user');
      if (!conversion.isValid || unexpected.length) throw new Error('This browser cannot export the requested video or audio codec. Try another format or choose Remove audio.');
      if (cancelled) { await conversion.cancel(); return; }
      conversion.onProgress = value => { $('progress').value = value; };
      await conversion.execute();
      if (!cancelled) {
        if (!frames || !target.buffer?.byteLength) throw new Error('No video frames were exported.');
        publish(new Blob([target.buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' }), format);
      }
    }
  } catch (error) {
    await conversion?.cancel().catch(() => {});
    say(cancelled ? 'Cancelled. No file was created.' : `Export failed: ${error.message}`, !cancelled);
  } finally {
    conversion = null; jobInput?.dispose(); detector?.dispose(); detector = null;
    setBusy(false); $('videosettings').hidden = !!bitmap;
    if (cancelled) say('Cancelled. No file was created.');
  }
};
$('share-export').onclick = async () => {
  if (!shareFile || sharing) return;
  sharing=true; $('share-export').disabled=true;
  try {
    // Invoke synchronously from the tap: rendering must not consume user activation.
    await navigator.share({files:[shareFile]});
  } catch(error) {
    if(error.name !== 'AbortError') say('Sharing is unavailable. Use Download, or try MP4 for video.',true);
  } finally { sharing=false; $('share-export').disabled=false; }
};
$('download').onclick = async event => {
  if (!Capacitor.isNativePlatform() || !resultBlob) return;
  event.preventDefault();
  try {
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(resultBlob);});
    const saved=await Filesystem.writeFile({path:`exports/${Date.now()}-${$('download').download}`,data,directory:Directory.Cache,recursive:true});
    await Share.share({title:'Deface export',url:saved.uri});
  } catch (error) { say(`Sharing unavailable: ${error.message}`,true); }
};
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
function applyTheme(light) {
  document.body.classList.toggle('theme-invert', light);
  if(Capacitor.isNativePlatform()) void StatusBar.setStyle({style:light?Style.Dark:Style.Light}).catch(()=>{}); $('theme').textContent = light ? 'Dark' : 'Light';
  $('theme').setAttribute('aria-pressed', String(light));
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).getPropertyValue('--surface').trim();
}
try { applyTheme(localStorage.getItem('deface-theme') === 'light'); } catch {}
$('theme').onclick = () => { const light = !document.body.classList.contains('theme-invert'); applyTheme(light); try { localStorage.setItem('deface-theme', light ? 'light' : 'dark'); } catch {} };
updateControls();
// The CSS timeline also dismisses the intro if the application fails to load.
const intro = $('startup');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const editorSurfaces = [document.querySelector('header'), document.querySelector('main'), document.querySelector('.site-footer')];
let introTimer;
function dismissIntro() {
  const restoreFocus = intro.contains(document.activeElement);
  intro.hidden = true; clearTimeout(introTimer);
  editorSurfaces.forEach(element => { element.inert = false; });
  if (restoreFocus) $('choose').focus({ preventScroll: true });
}
if (reducedMotion.matches || getComputedStyle(intro).visibility === 'hidden') dismissIntro();
else {
  editorSurfaces.forEach(element => { element.inert = true; });
  intro.addEventListener('animationend', event => { if (event.target === intro) dismissIntro(); });
  introTimer = setTimeout(dismissIntro, parseFloat(getComputedStyle(intro).getPropertyValue('--intro-duration')) + 200);
}
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !intro.hidden) dismissIntro(); });
reducedMotion.addEventListener('change', event => { if (event.matches) dismissIntro(); });
