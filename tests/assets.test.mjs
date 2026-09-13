import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
test('CC0 asset manifest is pinned and every GLB has embedded valid dependencies',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../assets/cafe/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.length,21);
 for(const asset of manifest){assert.equal(asset.license,'CC0-1.0');assert.match(asset.revision,/^[a-f0-9]{40}$/);const b=await readFile(new URL('../assets/cafe/'+asset.file,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),asset.sha256);assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);const length=b.readUInt32LE(12);const json=JSON.parse(b.subarray(20,20+length).toString());assert.equal(json.buffers.length,1);assert.ok(!json.buffers[0].uri);assert.ok(json.images.every(i=>i.bufferView!==undefined&&!i.uri));for(const v of json.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=json.buffers[0].byteLength);}
});
