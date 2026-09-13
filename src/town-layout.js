// Shared places: coordinates describe walkable work spots, not building centres.
export const districts = [
  {id:'plaza', name:'灯りの広場', subtitle:'COFFEE · BOOKS · FAMILIAR FACES', x:0, z:0},
  {id:'river', name:'川辺の庭', subtitle:'A LITTLE ROOM UNDER THE STARS', x:-14, z:24},
  {id:'grove', name:'木立の工房', subtitle:'MAKE · MEND · TRY AGAIN', x:14, z:24},
  {id:'wind', name:'風待ちの丘', subtitle:'A LITTLE WIND GOES A LONG WAY', x:-34, z:13},
  {id:'central', name:'中央の塔', subtitle:'FOR A BETTER TOMORROW', x:0, z:32},
];
export const places = {
  commons:{name:'みんなの広場',x:0,z:-.6,district:'plaza'},
  organ:{name:'風のオルガン',x:5.4,z:5.4,district:'plaza'},
  cafe:{name:'カフェのテラス',x:-3,z:.6,district:'plaza'},
  library:{name:'図書館の軒先',x:.4,z:-2.8,district:'plaza'},
  lights:{name:'川辺の灯り',x:-14,z:21,district:'river'},
  reading:{name:'川辺の読書席',x:-18,z:26,district:'river'},
  workshop:{name:'工房の部品棚',x:14,z:21,district:'grove'},
  lanterns:{name:'工房のランタン棚',x:19,z:26,district:'grove'},
  garden:{name:'木陰のベンチ',x:10,z:30.5,district:'grove'},
  wind:{name:'丘の風車',x:-34,z:13,district:'wind'},
  pump:{name:'川の取水ポンプ',x:-18,z:34,district:'river'},
  relay:{name:'集電タワー',x:10,z:31,district:'central'},
  central:{name:'中央棟の受付',x:0,z:28,district:'central'},
};
export function outdoorGround(x,z){
  return Number.isFinite(x)&&Number.isFinite(z)&&(
    Math.hypot(x,z)<11.7 ||
    (Math.abs(x)<7.8&&z>=8&&z<25) ||
    Math.hypot(x+14,z-24)<11.7 ||
    Math.hypot(x-14,z-24)<11.7 ||
    (Math.abs(x)<16&&z>20&&z<27) ||
    Math.hypot(x+34,z-13)<12.2 ||
    (x>-35&&x< -19&&z>15&&z<23) ||
    Math.hypot(x,z-32)<11.8 ||
    (x> -22&&x< -14&&z>29&&z<37)
  );
}
export function districtAt(x,z){
  return x< -25?'wind':Math.abs(x)<11&&z>27?'central':z<12?'plaza':x<0?'river':'grove';
}
export const townHomes=[
  {x:-21,z:19,rotation:Math.PI/2,label:'WILLOW WALK'},
  {x:-12,z:31,rotation:Math.PI,label:'RIVER HOUSE'},
  {x:14,z:17,rotation:0,label:'THE WORKSHOP'},
  {x:22,z:22,rotation:-Math.PI/2,label:'LANTERN HOUSE'},
  {x:16,z:32,rotation:Math.PI,label:'JUNIPER WALK'},
];
export const townObstacles=townHomes.map(h=>({x:h.x,z:h.z,hw:2.1,hd:2.1}));

export const infrastructureSites={
  wind:{name:'丘の風車',label:'WIND',x:-34,z:9,hw:2.3,hd:2.1,height:9},
  pump:{name:'川のポンプ',label:'WATER',x:-18,z:37,hw:1.8,hd:1.6,height:3.4},
  relay:{name:'集電タワー',label:'THE TOWER',x:10,z:35,hw:2,hd:2,height:16},
  central:{name:'中央棟',label:'CENTRAL',x:0,z:33,hw:4.3,hd:3.4,height:7},
};
export const modernPlots=[
  {x:-7.7,z:31.5,height:8,phase:2,rotation:.12,at:27},
  {x:-8,z:37,height:11,phase:2,rotation:0,at:38},
  {x:-4.5,z:40.5,height:13,phase:2,rotation:0,at:48},
  {x:4.5,z:40.5,height:12,phase:3,rotation:0,at:60},
  {x:8,z:38.5,height:15,phase:3,rotation:-.12,at:70},
  {x:0,z:40.5,height:12,phase:3,rotation:0,at:82},
];
export const infrastructureObstacles=[
  ...Object.values(infrastructureSites).map(({x,z,hw,hd})=>({x,z,hw,hd})),
  ...modernPlots.map(({x,z})=>({x,z,hw:1.65,hd:1.65})),
];

// Different residents can work together without standing inside each other.
export function workSpot(place,id){
  const p=places[place],offsets={mia:[-.85,.65],ren:[.85,.65],tomo:[-.85,-.65],shell:[.85,-.65]};
  const d=offsets[id]||[0,0];
  // Leave room to approach both sides of the riverside table without grazing its corners.
  const x=place==='reading'?Math.sign(d[0])*1.1:d[0],z=place==='reading'?Math.sign(d[1])*.85:d[1];
  return {x:p.x+x,z:p.z+z};
}
