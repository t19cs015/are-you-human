// Frame-rate independent acceleration; short swept steps prevent dash tunnelling.
export function createLocomotion(){
  let vx=0,vz=0,burst=0,cooldown=0,wasDash=false;
  return {reset(){vx=vz=burst=cooldown=0;wasDash=false;},step(position,{forward=0,side=0,yaw=0,sprint=false,dash=false},dt,canMove){
    dt=Math.max(0,Math.min(.2,dt));cooldown=Math.max(0,cooldown-dt);burst=Math.max(0,burst-dt);
    let fired=false;if(dash&&!wasDash&&cooldown===0){burst=.18;cooldown=.85;fired=true;}wasDash=dash;
    if(burst>0&&!forward&&!side)forward=1;
    const length=Math.hypot(forward,side)||1,speed=burst>0?9:sprint?5.3:3.3;
    const x=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)/length*speed,z=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)/length*speed;
    const factor=1-Math.exp(-dt*(forward||side?18:24));vx+=(x-vx)*factor;vz+=(z-vz)*factor;
    const dx=vx*dt,dz=vz*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));let moved=0;
    for(let i=0;i<steps;i++){const ox=position.x,oz=position.z;if(canMove(position.x+dx/steps,position.z))position.x+=dx/steps;if(canMove(position.x,position.z+dz/steps))position.z+=dz/steps;moved+=Math.hypot(position.x-ox,position.z-oz);}
    return {speed:dt?moved/dt:0,burst:burst>0,fired,ready:cooldown===0};
  }};
}
