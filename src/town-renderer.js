import * as T from '/node_modules/three/build/three.module.js';
import {EffectComposer} from '/node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from '/node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from '/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from '/node_modules/three/examples/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from '/node_modules/three/examples/jsm/postprocessing/ShaderPass.js';
import {createTownLighting} from './town-lighting.js';
import {createNightAtmosphere} from './town-atmosphere.js';

export function createTownRenderer(world){
  const {renderer,scene,camera}=world,lighting=createTownLighting(world),atmosphere=createNightAtmosphere(world);
  renderer.info.autoReset=false;
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2}),composer=new EffectComposer(renderer,target);
  const bloom=new UnrealBloomPass(new T.Vector2(1,1),.24,.55,1.12),resizeBloom=bloom.setSize.bind(bloom);
  bloom.setSize=(w,h)=>resizeBloom(Math.ceil(w*.6),Math.ceil(h*.6));
  const grade=new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,1.035);
      float edge=dot((vUv-.5)*vec2(.9,1.),(vUv-.5)*vec2(.9,1.));c*=1.-edge*.19;gl_FragColor=vec4(c,1.);}`});
  composer.addPass(new RenderPass(scene,camera));composer.addPass(bloom);composer.addPass(new OutputPass());composer.addPass(grade);
  let enabled=true,quality='auto',scale=1,lastResize=0,ready=false,lastFrame=performance.now(),samples=[];
  try{quality=localStorage.getItem('ayh-graphics')||'auto';}catch{}
  if(!['auto','high','low'].includes(quality))quality='auto';
  function resize(){
    const budget=quality==='high'?7e6:quality==='low'?2e6:4.5e6,cap=quality==='high'?1.6:quality==='low'?1:1.3;
    const ratio=Math.max(.7,Math.min(devicePixelRatio,cap,Math.sqrt(budget/(innerWidth*innerHeight))))*scale;
    renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(ratio);composer.setSize(innerWidth,innerHeight);bloom.enabled=enabled&&quality!=='low';lastResize=performance.now();samples=[];
  }
  function setQuality(value){quality=['auto','high','low'].includes(value)?value:'auto';scale=1;try{localStorage.setItem('ayh-graphics',quality);}catch{}resize();}
  function setEnabled(value){enabled=value;bloom.enabled=value&&quality!=='low';lighting.setEnabled(value&&ready);atmosphere.setEnabled(value);renderer.toneMappingExposure=value?1.08:1.35;}
  addEventListener('resize',resize);resize();setEnabled(true);
  return {get quality(){return quality;},get enabled(){return enabled;},setQuality,setEnabled,
    prepare(){lighting.prepare();ready=true;setEnabled(enabled);},
    render(time,city){const now=performance.now(),dt=now-lastFrame;lastFrame=now;if(dt>0&&dt<200&&now-lastResize>3500)samples.push(dt);if(samples.length===120){this.adapt(samples.reduce((a,b)=>a+b,0)/samples.length);samples=[];}renderer.info.reset();if(enabled){lighting.update();atmosphere.update(time,city);composer.render();}else renderer.render(scene,camera);},
    adapt(meanMs){if(quality!=='auto'||meanMs<31||scale<=.78||performance.now()-lastResize<7000)return;scale=Math.max(.78,scale-.1);resize();}
  };
}
