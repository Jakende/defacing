import test from 'node:test';
import assert from 'node:assert/strict';
import { remixSpeech } from '../src/speech-dsp.js';
import { deploymentMetadata } from '../scripts/metadata.mjs';

test('a residual soundtrack without estimated speech is preserved exactly',()=>{
 const background=Float32Array.from({length:4800},(_,i)=>.1*Math.sin(i*.07));
 const result=remixSpeech([background],[new Float32Array(background.length)]);
 assert.deepEqual(result.channels[0],background); assert.equal(result.gain,1);
});
test('speech remix changes speech without increasing peak or total energy',()=>{
 const source=Float32Array.from({length:48000},(_,i)=>.4*Math.sin(i*.04));
 const result=remixSpeech([source,source],[source,source]);
 const energy=x=>x.reduce((sum,v)=>sum+v*v,0),peak=x=>x.reduce((max,v)=>Math.max(max,Math.abs(v)),0);
 assert.ok(energy(result.channels[0])>0);
 assert.ok(energy(result.channels[0])<=energy(source));
 assert.ok(peak(result.channels[0])<=peak(source)+1e-7);
 assert.deepEqual(result.channels[0],result.channels[1]);
 assert.ok(result.channels[0].some((value,i)=>Math.abs(value-source[i])>.1));
});
test('public metadata uses the confirmed deployment URL and private builds stay unindexed',()=>{
 const meta=deploymentMetadata('https://defacing.space/');
 assert.match(meta.head,/rel="canonical" href="https:\/\/defacing.space\/"/);
 assert.match(meta.head,/https:\/\/defacing.space\/og-image.png/);
 assert.match(meta.sitemap,/<loc>https:\/\/defacing.space\/<\/loc>/);
 assert.match(meta.robots,/Sitemap: https:\/\/defacing.space\/sitemap.xml/);
 assert.match(deploymentMetadata('').head,/noindex/);
 assert.throws(()=>deploymentMetadata('javascript:alert(1)'));
});
