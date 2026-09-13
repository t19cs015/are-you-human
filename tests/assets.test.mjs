import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
test('CC0 asset manifest is pinned and every GLB has embedded valid dependencies',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../assets/cafe/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.length,29);
 for(const asset of manifest){assert.equal(asset.license,'CC0-1.0');assert.match(asset.revision,/^[a-f0-9]{40}$/);const b=await readFile(new URL('../assets/cafe/'+asset.file,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),asset.sha256);assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);const length=b.readUInt32LE(12);const json=JSON.parse(b.subarray(20,20+length).toString());assert.equal(json.buffers.length,1);assert.ok(!json.buffers[0].uri);assert.ok(json.images.every(i=>i.bufferView!==undefined&&!i.uri));for(const v of json.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=json.buffers[0].byteLength);}
});

test('original Mia export provides animation pivots, UV face and embedded resources',async()=>{
 const b=await readFile(new URL('../assets/characters/mia.glb',import.meta.url));
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);assert.ok(b.length<800000);
 const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 for(const name of ['Head','Arm.L','Arm.R','Foot.L','Foot.R']){const n=gltf.nodes.find(n=>n.name===name);assert.ok(n?.children?.length,`missing ${name}`);}
 const face=gltf.nodes.find(n=>n.name==='FaceScreen');assert.ok(face);
 const primitive=gltf.meshes[face.mesh].primitives[0];assert.ok(primitive.attributes.TEXCOORD_0!==undefined);
 const positions=gltf.accessors[primitive.attributes.POSITION];assert.ok(positions.count>100,'face must have enough vertices to follow the head curve');
 assert.equal(gltf.buffers.length,1);assert.ok(!gltf.buffers[0].uri);
 assert.ok(gltf.images.length>0);assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
 for(const v of gltf.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=gltf.buffers[0].byteLength);
});
