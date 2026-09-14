import * as T from '/node_modules/three/build/three.module.js';

// Small surface waves also change the normal, so moonlight moves across the water.
export function createRiverMaterial(){
  const time={value:0};
  const material=new T.MeshPhysicalMaterial({color:0x315e70,metalness:.18,roughness:.33,clearcoat:.25,clearcoatRoughness:.28,transparent:true,depthWrite:false});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uRiverTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform float uRiverTime;
      varying float vRiverX;
      vec3 riverWave(vec2 p){
        float bend=dot(p,vec2(.11,.17));
        float a=dot(p,vec2(.9,.5))+.6*sin(bend)+uRiverTime*.65;
        vec2 da=vec2(.9,.5)+.6*cos(bend)*vec2(.11,.17);
        float b=dot(p,vec2(3.7,-1.6))-uRiverTime*.9;
        float c=dot(p,vec2(7.2,2.1))+uRiverTime*.8;
        return vec3(.011*sin(a)+.006*sin(b)+.002*sin(c),
          .011*da.x*cos(a)+.0222*cos(b)+.0144*cos(c),
          .011*da.y*cos(a)-.0096*cos(b)+.0042*cos(c));
      }`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n vec3 waveNormal=riverWave(position.xy);objectNormal=normalize(vec3(-waveNormal.y,-waveNormal.z,1.));')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z+=waveNormal.x;vRiverX=position.x;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n varying float vRiverX;')
      .replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=1.-smoothstep(44.,94.,abs(vRiverX));');
  };
  material.customProgramCacheKey=()=> 'river-waves-v1';
  return {material,update(seconds){time.value=seconds;}};
}
