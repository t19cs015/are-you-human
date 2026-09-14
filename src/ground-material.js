import * as T from '/node_modules/three/build/three.module.js';

const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const grain=Math.abs(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
  const mineral=Math.sin(x*.11+Math.sin(y*.09))*Math.sin(y*.07);
  const value=232+Math.round(grain*13+mineral*7);pixels.data.set([value,value,value,255],(y*128+x)*4);
}
ctx.putImageData(pixels,0,0);
const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(.4,.4);texture.colorSpace=T.SRGBColorSpace;
const bump=texture.clone();bump.colorSpace=T.NoColorSpace;
export function groundMaterial(color){return new T.MeshStandardMaterial({color,map:texture,bumpMap:bump,bumpScale:.018,roughness:.95});}
