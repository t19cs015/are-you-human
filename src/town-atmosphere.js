import * as T from '/node_modules/three/build/three.module.js';

export function createNightAtmosphere(world){
  const {scene,camera}=world,group=new T.Group();group.name='A blue-hour sky';scene.add(group);
  const sky=new T.Mesh(new T.SphereGeometry(190,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    varying vec3 vDirection;uniform float uTime;
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),f.x),mix(fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5),fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5),f.x),f.y);}
    void main(){vec3 d=normalize(vDirection);vec3 c=mix(vec3(.018,.025,.05),vec3(.004,.009,.025),smoothstep(-.08,.7,d.y));
      c+=vec3(.014,.003,.006)*exp(-pow((d.y-.06)*5.,2.));float n=noise(d.xz*4.+uTime*.002)+.35*noise(d.xz*10.);
      c+=vec3(.003,.004,.006)*smoothstep(.7,1.25,n)*exp(-pow((d.y-.14)*8.,2.));gl_FragColor=vec4(c,1.);}` }));
  sky.renderOrder=-10;group.add(sky);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  const light=ctx.createRadialGradient(105,92,12,128,128,126);light.addColorStop(0,'#fff3d0');light.addColorStop(.8,'#ecd6ad');light.addColorStop(1,'#cdb58c');ctx.fillStyle=light;ctx.fillRect(0,0,256,256);
  for(let i=0;i<18;i++){const x=30+(Math.sin(i*8.7)*.5+.5)*196,y=30+(Math.sin(i*13.2+4)*.5+.5)*196,r=4+i%4*4;ctx.fillStyle='#afa48420';ctx.beginPath();ctx.ellipse(x,y,r,r*.75,0,0,Math.PI*2);ctx.fill();}
  const moonMap=new T.CanvasTexture(canvas);moonMap.colorSpace=T.SRGBColorSpace;
  const moon=new T.Mesh(new T.SphereGeometry(5.8,32,24),new T.MeshBasicMaterial({map:moonMap,color:0xfff0d4,fog:false}));moon.position.set(-70,58,-135);group.add(moon);
  const positions=[];for(let i=0;i<240;i++){const az=i*2.39996,y=.08+(i%37)/43,r=Math.sqrt(1-y*y);positions.push(Math.cos(az)*r*178,y*178,Math.sin(az)*r*178);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const stars=new T.Points(geometry,new T.PointsMaterial({color:0xd4dfec,size:.14,transparent:true,opacity:.6,depthWrite:false,fog:false}));group.add(stars);
  const previousMoon=scene.getObjectByName('Original moon'),previousStars=scene.getObjectByName('Original stars');
  return {setEnabled(value){group.visible=value;if(previousMoon)previousMoon.visible=!value;if(previousStars)previousStars.visible=!value;},update(time){group.position.copy(camera.position);sky.material.uniforms.uTime.value=time;stars.material.opacity=.5+Math.sin(time*.07)*.04;}};
}
