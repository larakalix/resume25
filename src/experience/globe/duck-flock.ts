import {pond as legacyPond,feedingPoint as legacyFeedingPoint} from './pond.ts'
import {normalAt,terrainHeight,RADIUS,WATER} from './terrain.ts'
import {duckDock,dockFootprint,dockLocalPoint as legacyDockLocalPoint,dockMapPoint} from './duck-dock.ts'

export interface DuckState {x:number;z:number;yaw:number;speed:number;peck:number;bob:number}
export type DuckMode='roaming'|'approaching'|'feeding'|'returning'

const count=3,separation=.58,comfort=.82,turnRate=1.45
const angleDelta=(to:number,from:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from))
const surfaceDistance=(ax:number,az:number,bx:number,bz:number)=>Math.hypot((ax-bx)*Math.cos((az+bz)/(2*RADIUS)),az-bz)

const pond=legacyPond
function legacyDeepWater(x:number,z:number){
 return surfaceDistance(x,z,pond.x,pond.z)<pond.radius-.3&&terrainHeight(normalAt(x,z))<WATER-.18&&!dockFootprint({x,z},.32)
}

function crossesDock(ax:number,az:number,bx:number,bz:number){
 let enter=0,leave=1
 const dx=bx-ax,dz=bz-az,x0=duckDock.x0-.32,x1=duckDock.x1+.32,z0=-duckDock.halfWidth-.32,z1=duckDock.halfWidth+.32
 if(Math.abs(dx)<.000001){if(ax<x0||ax>x1)return false}else{const a=(x0-ax)/dx,b=(x1-ax)/dx;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b))}
 if(Math.abs(dz)<.000001){if(az<z0||az>z1)return false}else{const a=(z0-az)/dz,b=(z1-az)/dz;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b))}
 return enter<=leave
}

/** Stable state objects and bounded local steering; no timers, randomness or per-frame arrays. */
export interface DuckHabitat {pond:{x:number;z:number;radius:number};feedingPoint:{x:number;z:number};deepWater:(point:{x:number;z:number})=>boolean}
export function createDuckFlock(habitat?:DuckHabitat){
 const pond=habitat?.pond??legacyPond,feedingPoint=habitat?.feedingPoint??legacyFeedingPoint,deepWater=habitat?(x:number,z:number)=>habitat.deepWater({x,z}):legacyDeepWater,dockLocalPoint=habitat?()=>null:legacyDockLocalPoint
 const scale=Math.cos(pond.z/RADIUS),routes=Array.from({length:8},(_,i)=>({x:pond.x+Math.sin(i*Math.PI/4)*2.1/scale,z:pond.z+Math.cos(i*Math.PI/4)*1.85}))
 for(const point of routes)for(let attempt=0;attempt<8&&!deepWater(point.x,point.z);attempt++){point.x=pond.x+(point.x-pond.x)*.85;point.z=pond.z+(point.z-pond.z)*.85}
 const initial=[0,3,5],ducks:DuckState[]=initial.map(index=>({x:routes[index]!.x,z:routes[index]!.z,yaw:0,speed:0,peck:0,bob:0}))
 const plans=ducks.map((duck,i)=>({index:initial[i]!,meal:i,pause:1+i*.35,arrived:false,oldX:duck.x,oldZ:duck.z,nextX:duck.x,nextZ:duck.z,nextYaw:0,nextSpeed:0}))
 const inwardX=(pond.x-feedingPoint.x)*scale,inwardZ=pond.z-feedingPoint.z,length=Math.hypot(inwardX,inwardZ)||1,ix=inwardX/length,iz=inwardZ/length
 const meals=ducks.map((_,i)=>{
  const along=i===1?1.05:.85,side=(i-1)*.72
  let x=feedingPoint.x+(ix*along-iz*side)/scale,z=feedingPoint.z+iz*along+ix*side
  for(let attempt=0;attempt<8&&!deepWater(x,z);attempt++){x=pond.x+(x-pond.x)*.85;z=pond.z+(z-pond.z)*.85}
  return{x,z}
 })
 const dockCorner=dockMapPoint(duckDock.x1+.55,-duckDock.halfWidth-.55)
 let mode:DuckMode='roaming',clock=0,feedingTime=0

 function reset(){
  mode='roaming';clock=feedingTime=0
  for(let i=0;i<count;i++){
   const duck=ducks[i]!,plan=plans[i]!,index=initial[i]!,start=routes[index]!,next=routes[(index+1)%routes.length]!
   duck.x=start.x;duck.z=start.z;duck.yaw=Math.atan2((next.x-start.x)*scale,next.z-start.z);duck.speed=duck.peck=duck.bob=0
   plan.index=(index+1)%routes.length;plan.meal=i;plan.pause=1+i*.35;plan.arrived=false;plan.oldX=plan.nextX=duck.x;plan.oldZ=plan.nextZ=duck.z;plan.nextYaw=duck.yaw;plan.nextSpeed=0
  }
 }

 function feed(){
  if(mode==='feeding'){feedingTime=0;return}
  if(mode==='approaching')return
  mode='approaching';feedingTime=0
  // Match nearby swimmers to nearby places once per request, avoiding crossing approach paths.
  let best=Infinity,first=0,second=1,third=2
  for(let a=0;a<count;a++)for(let b=0;b<count;b++){
   if(a===b)continue
   const c=3-a-b,ma=meals[a]!,mb=meals[b]!,mc=meals[c]!,da=ducks[0]!,db=ducks[1]!,dc=ducks[2]!
   const cost=surfaceDistance(da.x,da.z,ma.x,ma.z)+surfaceDistance(db.x,db.z,mb.x,mb.z)+surfaceDistance(dc.x,dc.z,mc.x,mc.z)
   if(cost<best){best=cost;first=a;second=b;third=c}
  }
  plans[0]!.meal=first;plans[1]!.meal=second;plans[2]!.meal=third
  for(const plan of plans){plan.arrived=false;plan.pause=0}
 }

 function advance(dt:number,reduced:boolean){
  if(reduced&&mode==='roaming'){for(const duck of ducks)duck.speed=duck.peck=duck.bob=0;return}
  clock+=dt
  if(mode==='feeding'){
   feedingTime+=dt
   for(let i=0;i<count;i++){
    const duck=ducks[i]!,heading=Math.atan2((feedingPoint.x-duck.x)*Math.cos(duck.z/RADIUS),feedingPoint.z-duck.z)
    duck.yaw+=Math.max(-turnRate*dt,Math.min(turnRate*dt,angleDelta(heading,duck.yaw)))
    duck.speed=0;duck.peck=reduced?.45:Math.pow(Math.max(0,Math.sin(feedingTime*4.1+i*1.7)),2);duck.bob=reduced?0:Math.sin(clock*2.2+i*2.1)*.012
   }
   if(feedingTime>=6){mode='returning';for(const plan of plans){plan.index=plan.meal===0?6:plan.meal===1?4:2;plan.arrived=false;plan.pause=0}}
   return
  }
  for(let i=0;i<count;i++){const duck=ducks[i]!,plan=plans[i]!;plan.oldX=duck.x;plan.oldZ=duck.z;plan.nextX=duck.x;plan.nextZ=duck.z;plan.nextYaw=duck.yaw;plan.nextSpeed=0}
  for(let i=0;i<count;i++){
   const duck=ducks[i]!,plan=plans[i]!,goal=mode==='approaching'?meals[plan.meal]!:routes[plan.index]!
   duck.peck=0;duck.bob=reduced?0:Math.sin(clock*2.2+i*2.1)*.022
   if(plan.arrived)continue
   if(mode==='roaming'&&plan.pause>0){plan.pause=Math.max(0,plan.pause-dt);continue}
   const localScale=Math.cos(duck.z/RADIUS),goalDistance=surfaceDistance(duck.x,duck.z,goal.x,goal.z)
   if(goalDistance<.13&&duck.speed<.12){
    if(mode==='roaming'){plan.index=(plan.index+1)%routes.length;plan.pause=1.1+i*.15}else plan.arrived=true
    continue
   }
   const dock=dockLocalPoint(duck),goalDock=dockLocalPoint(goal),detour=dock&&goalDock&&crossesDock(dock.x,dock.z,goalDock.x,goalDock.z),steeringGoal=detour?dockCorner:goal
   const dx=(steeringGoal.x-duck.x)*localScale,dz=steeringGoal.z-duck.z,remaining=Math.hypot(dx,dz)
   let steerX=remaining>.001?dx/remaining:0,steerZ=remaining>.001?dz/remaining:0
   for(let j=0;j<count;j++){
    if(i===j)continue
    const other=plans[j]!,awayX=(duck.x-other.oldX)*localScale,awayZ=duck.z-other.oldZ,d=Math.hypot(awayX,awayZ)
    if(d<comfort&&d>.0001){const force=(comfort-d)/(comfort-separation)*1.8;steerX+=awayX/d*force;steerZ+=awayZ/d*force}
   }
   const bankX=(duck.x-pond.x)*localScale,bankZ=duck.z-pond.z,bankDistance=Math.hypot(bankX,bankZ)
   if(bankDistance>pond.radius-.9){const force=(bankDistance-(pond.radius-.9))*4;steerX-=bankX/bankDistance*force;steerZ-=bankZ/bankDistance*force}
   if(dock){
    const awayX=dock.x-Math.max(duckDock.x0,Math.min(duckDock.x1,dock.x)),awayZ=dock.z-Math.max(-duckDock.halfWidth,Math.min(duckDock.halfWidth,dock.z)),clearance=Math.hypot(awayX,awayZ)
    if(clearance>0&&clearance<.7){const force=(.7-clearance)*2.5;steerX+=awayX/clearance*force;steerZ+=awayZ/clearance*force}
   }
   const heading=Math.hypot(steerX,steerZ)>.0001?Math.atan2(steerX,steerZ):duck.yaw,turn=angleDelta(heading,duck.yaw)
   const yaw=duck.yaw+Math.max(-turnRate*dt,Math.min(turnRate*dt,turn)),cruise=mode==='roaming'?.44+i*.035:.57
   const desired=cruise*Math.min(1,remaining/.7)*Math.max(0,Math.cos(turn)),speed=duck.speed+(desired-duck.speed)*(1-Math.exp(-dt*3.5))
   const x=duck.x+Math.sin(yaw)*speed*dt/localScale,z=duck.z+Math.cos(yaw)*speed*dt
   plan.nextYaw=yaw
   if(deepWater(x,z)){plan.nextX=x;plan.nextZ=z;plan.nextSpeed=speed}
  }
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
   const a=plans[i]!,b=plans[j]!
   if(surfaceDistance(a.nextX,a.nextZ,b.nextX,b.nextZ)<separation){a.nextX=a.oldX;a.nextZ=a.oldZ;a.nextSpeed=0;b.nextX=b.oldX;b.nextZ=b.oldZ;b.nextSpeed=0}
  }
  let arrived=0
  for(let i=0;i<count;i++){
   const duck=ducks[i]!,plan=plans[i]!,dx=(plan.nextX-duck.x)*Math.cos((plan.nextZ+duck.z)/(2*RADIUS)),dz=plan.nextZ-duck.z
   duck.x=plan.nextX;duck.z=plan.nextZ;duck.speed=Math.hypot(dx,dz)/dt;duck.yaw=duck.speed>.0001?Math.atan2(dx,dz):plan.nextYaw
   if(plan.arrived)arrived++
  }
  if(arrived===count){
   if(mode==='approaching'){mode='feeding';feedingTime=0}
   else if(mode==='returning'){mode='roaming';for(let i=0;i<count;i++){const plan=plans[i]!;plan.arrived=false;plan.index=(plan.index+1)%routes.length;plan.pause=.7+i*.2}}
  }
 }
 function step(delta:number,reduced:boolean){
  const dt=Number.isFinite(delta)?Math.min(.05,Math.max(0,delta)):0
  if(!dt)return
  // Three swimmers are inexpensive to substep; turns and arrival decisions agree across displays.
  const slices=Math.ceil(dt*120),interval=dt/slices
  for(let i=0;i<slices;i++)advance(interval,reduced)
 }
 reset()
 return{ducks,step,feed,reset,get mode(){return mode}}
}
