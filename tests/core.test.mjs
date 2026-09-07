import test from 'node:test';
import assert from 'node:assert/strict';
import { expandedBox, normalizedRect } from '../src/masks.js';
import { server } from '../server.mjs';

test('face padding clips at the actual image edges', () => {
  assert.deepEqual(expandedBox([0,0,100,100],100,100,.25), [0,0,100,100]);
  assert.deepEqual(expandedBox([30,40,50,60],100,100,.5), [20,30,40,40]);
  const box = expandedBox([-50,-50,-10,-10],100,100);
  assert.equal(box[2],0); assert.equal(box[3],0);
});
test('manual masks work in every drag direction', () => {
  assert.deepEqual(normalizedRect([.8,.9],[.2,.1]).map(x=>Math.round(x*10)/10), [.2,.1,.6,.8]);
});
test('hosting serves only built assets and never accepts media uploads', async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/','/app.js','/face-worker.js','/models/yunet.onnx','/ort/ort-wasm-simd.wasm']) assert.equal((await fetch(origin+path)).status,200,path);
    assert.equal((await fetch(origin+'/upload',{method:'POST',body:'private media'})).status,405);
    for (const path of ['/photo.html','/.git/config','/package.json','/server.mjs','/missing.wasm','/%2e%2e%2fpackage.json']) assert.ok([403,404].includes((await fetch(origin+path)).status),path);
    const wasm = await fetch(origin+'/ort/ort-wasm-simd.wasm', {method:'HEAD'});
    assert.equal(wasm.headers.get('content-type'),'application/wasm');
    assert.equal((await wasm.arrayBuffer()).byteLength,0);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('history supports redo, branching, immutable snapshots and bounded storage', async () => {
  const { History } = await import('../src/history.js');
  const history = new History({ regions: [] }, 3);
  const shape = { regions: [{ points: [[.1,.1]], size: .1 }] };
  history.push(shape); shape.regions[0].points[0][0] = .9;
  assert.deepEqual(history.undo(), { regions: [] });
  assert.equal(history.redo().regions[0].points[0][0], .1);
  history.undo(); history.push({ regions: [[0,0,1,1]] });
  assert.equal(history.canRedo, false);
  history.push({ regions: [1] }); history.push({ regions: [2] });
  assert.equal(history.entries.length, 3);
  history.reset({ regions: [] }); assert.equal(history.canUndo, false);
});
