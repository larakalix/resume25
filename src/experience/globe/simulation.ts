import {blocked as legacyBlocked,residents as legacyResidents,targets as legacyTargets} from './layout.ts'
import {distance,wet as legacyWet,spawn as legacySpawn,RADIUS,normalAt,mapAt,bridgeHeight as legacyBridgeHeight,bearing} from './geography.ts'
import {advanceVelocity,gaitStride} from './locomotion.ts'
import {createSurfaceMotor,planarFrameInput} from './surface-motor.ts'
import type {MovementFrame} from './surface-motor.ts'
import {freshWorkshop,advanceWorkshop} from './workshop.ts'
import {createDuckFlock} from './duck-flock.ts'
import {createWorkshopResident,roomWalkable} from './workshop-resident.ts'
import {createJapanFollow} from './japan-follow.ts'
import {createCityResidents} from './city-residents.ts'
import {wrapLongitude,longitudeDelta,latitudeLimit} from './world-expansion.ts'
import {createWorldFollow} from './world-follow.ts'
import {createResidentActivities,createWorldReactions} from './resident-activities.ts'
import type {MoveInput} from '../explorer/types.ts'
import type {MapPoint,Outcome,Player,RoomId,Snapshot,Target,Walker} from './types.ts'
import type {CompiledWorld} from '../archipelago/compile.ts'
const conversationInput={x:0,forward:0,run:false}

export function createGlobeSimulation(world?:CompiledWorld){
 const blocked=world?.blocked??legacyBlocked,residents=world?.residents??legacyResidents,targets=world?.targets??legacyTargets,spawn=world?.spawn??legacySpawn,wet=world?.wet??legacyWet,bridgeHeight=world?.bridgeHeight??legacyBridgeHeight
 const freshMotion=()=>({vx:0,vz:0,landing:0,steps:0,stepProgress:0})
 const surfaceMotor=createSurfaceMotor(),workshop=freshWorkshop(),flock=createDuckFlock(world?{pond:world.pond,feedingPoint:world.pond.feedingPoint,deepWater:point=>world.distance(point,world.pond.center)<world.pond.radius-.25&&world.terrainHeight(world.normalAt(point.x,point.z))<world.WATER-.18&&!world.dockFootprint(point)}:undefined),resident=createWorkshopResident(),ivan=resident.state
 const body:Player={...spawn,...freshMotion(),y:0,vy:0,yaw:world?bearing(spawn,world.entryLookAt):.2,speed:0,crouched:false},roomBody:Player={...freshMotion(),x:0,z:2.7,y:0,vy:0,yaw:Math.PI,speed:0,crouched:false}
 const walkers:Walker[]=residents.map(r=>({...r,yaw:0,speed:0,stopped:false}))
 const animals:Walker[]=world?world.animals.map(actor=>({...actor,yaw:0,speed:0,stopped:false})): [{id:'patch',x:-1.5,z:16,yaw:0,speed:0,stopped:false,phase:0},{id:'fox',x:-19,z:13,yaw:0,speed:0,stopped:false,phase:2}]
 const objects={windmill:true,bell:0,harborBell:0,campfire:false,lamp:true,duckFood:0,playTime:0,catPatTime:0,catAffection:0,affection:0,following:false,fox:false}
 let inside:RoomId|null=null,engaged:string|null=null,reduced=false,elapsed=0,visited:string|null=null,pendingPatchCelebration=0
 const discovered=new Set<string>()
 const player=()=>inside?roomBody:body
 function halt(){const p=player();p.vx=p.vz=p.speed=0;surfaceMotor.halt()}
 function turn(actor:{yaw:number},x:number,z:number,dt:number){if(Math.hypot(x,z)<.001)return;const yaw=Math.atan2(x,z);actor.yaw+=Math.atan2(Math.sin(yaw-actor.yaw),Math.cos(yaw-actor.yaw))*(1-Math.exp(-dt*12))}
 function safe(p:MapPoint){return !wet(p)&&!blocked(p)}
 const japanFollow=createJapanFollow(safe),worldFollow=createWorldFollow(safe,world?.paths),cityPopulation=world?{states:[] as Walker[],delegate(_ids:ReadonlySet<string>){},step(_dt:number,_body:MapPoint,_engaged:string|null,_reduced:boolean,_active:boolean,_walking:boolean){},reset(){}}:createCityResidents(safe),allWalkers=[...walkers,...cityPopulation.states]
 const outdoorCast=[...allWalkers,...animals]
 const activities=createResidentActivities(safe,world?.residentProfiles),reactions=createWorldReactions(),noDelegation:ReadonlySet<string>=new Set(),environment={rain:0,day:1}
 const riverSide=(point:MapPoint)=>{const n=normalAt(point.x,point.z);return n.z+.10-.055*Math.sin(n.x*8)}
 function roomSafe(p:MapPoint,room=inside){
  if(!room||!roomWalkable(room,p))return false
  if(room==='home'&&Math.hypot(p.x-ivan.x,p.z-ivan.z)<.6)return false
  return !targets.some(t=>t.room===room&&t.kind==='person'&&t.id!=='ivan'&&Math.hypot(p.x-t.x,p.z-t.z)<.55)
 }
 /** Keep an authored arrival when clear; a roaming host can require a nearby free landing. */
 function roomArrival(room:RoomId,preferred:MapPoint,near?:Target){
  const usable=(p:MapPoint)=>roomSafe(p,room)&&(!near||Math.hypot(p.x-near.x,p.z-near.z)<near.radius)
  if(usable(preferred))return preferred
  for(let ring=1;ring<=24;ring++)for(let i=0;i<24;i++){
   const angle=i*Math.PI/12,p={x:preferred.x+Math.cos(angle)*ring*.15,z:preferred.z+Math.sin(angle)*ring*.15}
   if(usable(p))return p
  }
  // The open front aisle is an independent safe fallback for a room entry.
  return{x:0,z:2.7}
 }
 function exteriorDoor(room:RoomId){return targets.find(t=>!t.room&&t.interior===(room==='home-studio'||room==='home-balcony'?'home':room))}
 function anchorRoom(room:RoomId){const door=exteriorDoor(room);if(door)Object.assign(body,{...freshMotion(),...door.arrival,y:0,vy:0,speed:0,crouched:false})}
 function constrain(next:MapPoint,old:MapPoint){if(safe(next))return next;const px={x:next.x,z:old.z},pz={x:old.x,z:next.z};return safe(px)?px:safe(pz)?pz:{...old}}
 function moving(actor:Walker,goal:MapPoint,speed:number,dt:number){const old={x:actor.x,z:actor.z},scale=Math.max(.01,Math.cos(actor.z/RADIUS)),dx=longitudeDelta(actor.x,goal.x)*scale,dz=goal.z-actor.z,length=Math.hypot(dx,dz),step=Math.min(length,speed*dt);if(length>.02){Object.assign(actor,constrain({x:wrapLongitude(actor.x+dx/length*step/scale),z:Math.max(-latitudeLimit,Math.min(latitudeLimit,actor.z+dz/length*step))},old));turn(actor,dx,dz,dt)}actor.speed=distance(actor,old)/(dt||1)}
 /** Search physical rings around the live host; a blocked porch must never send visitors back to an old home. */
 function liveArrival(source:Target,actor:Walker){
  const normal=normalAt(actor.x,actor.z),longitude=actor.x/RADIUS,latitude=actor.z/RADIUS,limit=source.radius-.15
  const usable=(point:MapPoint)=>safe(point)&&outdoorCast.every(other=>distance(point,other)>=.65)
  for(const radius of [Math.min(1.93,limit),Math.min(1.25,limit),Math.min(2.35,limit),Math.min(.85,limit),limit])for(let index=0;index<24;index++){
   const yaw=Math.atan2(.7,1.8)+index*Math.PI/12,east=Math.sin(yaw),south=Math.cos(yaw),c=Math.cos(radius/RADIUS),s=Math.sin(radius/RADIUS)
   const point=mapAt({x:normal.x*c+(east*Math.cos(longitude)-south*Math.sin(longitude)*Math.sin(latitude))*s,y:normal.y*c+(-east*Math.sin(longitude)-south*Math.cos(longitude)*Math.sin(latitude))*s,z:normal.z*c+south*Math.cos(latitude)*s})
   if(usable(point))return point
  }
  if(distance(body,actor)<limit&&usable(body))return{x:body.x,z:body.z}
 }
 function target(id:string,withArrival=true){const source=targets.find(t=>t.id===id);if(!source)return;if(id==='ivan'){const arrival=(world?[[-1.8,.8],[-1.9,-.4],[.7,1.8],[-1.4,1.45],[0,1.95]]:[[-.7,1.3],[.7,-1.3],[-1.3,-.7],[1.3,.7],[0,1.4],[0,-1.4]]).map(([x,z])=>({x:ivan.x+x!,z:ivan.z+z!})).find(p=>roomSafe(p,'home'))??source.arrival;return{...source,x:ivan.x,z:ivan.z,arrival}}const live=allWalkers.find(w=>w.id===id)??animals.find(w=>w.id===id);if(!live)return source;const arrival=withArrival?liveArrival(source,live):source.arrival;return arrival?{...source,x:live.x,z:live.z,arrival}:undefined}
 function faceConversation(dt:number){const person=engaged?target(engaged):undefined;if(person?.kind!=='person'||(person.room??null)!==inside)return;const p=player(),yaw=inside?Math.atan2(person.x-p.x,person.z-p.z):bearing(p,person);if(reduced)p.yaw=yaw;else turn(p,Math.sin(yaw),Math.cos(yaw),dt);const actor=person.id==='ivan'?ivan:allWalkers.find(w=>w.id===person.id);if(actor&&reduced)actor.yaw=inside?Math.atan2(p.x-actor.x,p.z-actor.z):bearing(actor,p)}
 function nearest(){const p=player(),candidate=visited&&target(visited,false);if(candidate&&(candidate.room??null)===inside&&(inside?Math.hypot(p.x-candidate.x,p.z-candidate.z):distance(p,candidate))<candidate.radius)return candidate.id;visited=null;return targets.filter(t=>(t.room??null)===inside).map(t=>target(t.id,false)).filter((t):t is Target=>!!t).map(t=>({id:t.id,score:(inside?Math.hypot(p.x-t.x,p.z-t.z):distance(p,t))/t.radius})).filter(t=>t.score<1).sort((a,b)=>a.score-b.score)[0]?.id??null}
 return{body,roomBody,walkers:allWalkers,animals,ivan,objects,workshop,ducks:flock.ducks,get duckMode(){return flock.mode},player,target,nearest,discovered,halt,prepareWorldRoutes(){worldFollow.prepare()},get inside(){return inside},
  setEnvironment(value:{rain:number;day:number}){if(Number.isFinite(value.rain))environment.rain=Math.max(0,Math.min(1,value.rain));if(Number.isFinite(value.day))environment.day=Math.max(0,Math.min(1,value.day))},residentActivity(id:string){return activities.activity(id)},wave(){return inside?null:reactions.wave(elapsed,body,allWalkers,engaged,reduced)},
  setReduced(value:boolean){reduced=value},setEngaged(id:string|null){engaged=id;if(id){halt();if(reduced)faceConversation(0)}},
  crouch(value:boolean){player().crouched=value},jump(){const p=player();if(p.y===0&&!p.crouched)p.vy=6.0},
  enter(room:RoomId,entry:MapPoint={x:0,z:2.7}){inside=room;engaged=null;visited=null;anchorRoom(room);Object.assign(roomBody,{...freshMotion(),...roomArrival(room,entry),y:0,vy:0,yaw:Math.PI,speed:0,crouched:false});const door=exteriorDoor(room);if(door)discovered.add(door.id)},
  leave(){if(!inside)return;const door=exteriorDoor(inside)!;Object.assign(body,{...freshMotion(),...door.arrival,y:0,vy:0,speed:0,crouched:false});inside=null;engaged=null;visited=null},
  visit(id:string){const t=target(id);if(!t)return;if(t.room){inside=t.room;anchorRoom(t.room);Object.assign(roomBody,{...freshMotion(),...roomArrival(t.room,t.arrival,t),y:0,vy:0,speed:0,crouched:false})}else{inside=null;Object.assign(body,{...freshMotion(),...t.arrival,y:0,vy:0,speed:0,crouched:false})}visited=id;if(t.kind!=='exit')discovered.add(id)},
  action(id:string,action:string):Outcome{
   discovered.add(id)
   if(id==='notebook'){const message=advanceWorkshop(workshop,action),celebration=reactions.workshop(workshop.stage===3&&workshop.checked.every(Boolean),reduced);if(celebration){pendingPatchCelebration=celebration.duration;objects.playTime=Math.max(objects.playTime,celebration.duration)}return{message}}
   if(id==='miso'){objects.catPatTime=2;objects.catAffection++;return{message:'Miso leans into your hand. A very good reading companion.'}}
   if(id==='windmill'){objects.windmill=!objects.windmill;return{message:objects.windmill?'The sails catch the breeze.':'The windmill is resting.'}}
   if(id==='bell'){objects.bell++;return{message:'A little wish, sent across the meadow.'}}
   if(id==='harbor'&&action==='ring'){objects.harborBell++;return{message:'A bright little ring carries across the water.'}}
   if(id==='campfire'){objects.campfire=!objects.campfire;return{message:objects.campfire?'The campfire is glowing.':'The campfire is out.'}}
   if(id==='lamp'){objects.lamp=!objects.lamp;return{message:objects.lamp?'A little light for a new idea.':'The desk lamp is off.'}}
   if(id==='duck-pond'){objects.duckFood++;flock.feed();return{message:'A few treats for the ducks. They’re paddling over to the dock.'}}
   if(id==='patch'){if(action==='follow'){objects.following=!objects.following;japanFollow.reset();worldFollow.reset();return{message:objects.following?'Patch will walk with you outside.':'Patch is exploring on his own.'}}if(action==='play')objects.playTime=2;objects.affection++;return{message:action==='play'?'A small game, a very happy friend.':'That was a very good pat.'}}
   if(id==='fox'){objects.fox=!objects.fox;return{message:'Clover tilts an ear and says hello.'}}
   return{message:'A little discovery for your journal.'}
  },
  snapshot(overview:boolean):Snapshot{return{near:nearest(),inside,overview,crouched:player().crouched,discovered:discovered.size,total:targets.filter(t=>t.kind!=='exit').length,workshop:{stage:workshop.stage,checked:[...workshop.checked]}}},
  step(delta:number,input:MoveInput,frame?:MovementFrame){
   const dt=Number.isFinite(delta)?Math.min(.05,Math.max(0,delta)):0;if(!dt)return;elapsed+=dt;if(!inside||pendingPatchCelebration===0)objects.playTime=Math.max(0,objects.playTime-dt);if(!inside)pendingPatchCelebration=0;objects.catPatTime=Math.max(0,objects.catPatTime-dt);flock.step(dt,reduced)
   const p=player(),speed=p.crouched?1.05:input.run?5.2:2.65,old={x:p.x,z:p.z},command=engaged?conversationInput:input
   if(frame&&!inside){surfaceMotor.step(p,command,speed,dt,frame,point=>safe(point)&&(p.y>=.4||![...allWalkers,...animals].some(actor=>distance(point,actor)<.55)))}else{
    const movement=frame?planarFrameInput(command,frame):command,{dx,dz}=advanceVelocity(p,movement,speed,dt),latitudeScale=inside?1:Math.max(.01,Math.cos(p.z/RADIUS))
    const requested=inside?{x:p.x+dx,z:p.z+dz}:{x:wrapLongitude(p.x+dx/latitudeScale),z:Math.max(-latitudeLimit,Math.min(latitudeLimit,p.z+dz))};let next={...requested}
    if(inside){if(!roomSafe(next)){const px={x:next.x,z:old.z},pz={x:old.x,z:next.z};next=roomSafe(px)?px:roomSafe(pz)?pz:old}}else{next=constrain(next,old);if(p.y<.4&&[...allWalkers,...animals].some(a=>distance(next,a)<.55))next=old}
    if(Math.abs(next.x-requested.x)>.00001)p.vx=0;if(Math.abs(next.z-requested.z)>.00001)p.vz=0
    Object.assign(p,next);p.speed=(inside?Math.hypot(p.x-old.x,p.z-old.z):distance(p,old))/dt;if(p.speed>.02)turn(p,inside?p.x-old.x:longitudeDelta(old.x,p.x)*latitudeScale,p.z-old.z,dt)
   }
   faceConversation(dt)
   p.landing=Math.max(0,p.landing-dt*5)
   if(p.y>0||p.vy>0){p.vy-=15.5*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0){p.vy=0;p.landing=1}}
   else if(p.speed>.12){p.stepProgress+=p.speed*dt/(gaitStride(p.speed)/2);if(p.stepProgress>=1){p.steps+=Math.floor(p.stepProgress);p.stepProgress%=1}}
   resident.step(dt,roomBody,engaged==='ivan',reduced,inside==='home')
   cityPopulation.delegate(frame?activities.ids:noDelegation)
   cityPopulation.step(dt,body,engaged,reduced,!inside,Math.hypot(input.x,input.forward)>.01&&!engaged)
   if(frame)activities.step(dt,allWalkers,body,engaged,reduced,{...environment,walking:Math.hypot(input.x,input.forward)>.01&&!engaged,active:!inside})
   if(inside)return
   if(!frame&&!world)for(const actor of walkers){const close=distance(body,actor)<(actor.stopped?4:2.9)||engaged===actor.id;actor.greeting=Math.max(0,(actor.greeting??0)-dt);if(close&&!actor.stopped&&!reduced)actor.greeting=1.8;actor.stopped=close;if(close){actor.speed=0;turn(actor,Math.sin(bearing(actor,body)),Math.cos(bearing(actor,body)),dt)}else if(!reduced){const home=residents.find(r=>r.id===actor.id)!;moving(actor,{x:home.x+Math.sin(elapsed*.18+home.phase)*1.4,z:home.z+Math.cos(elapsed*.15+home.phase)*1.2},.7,dt)}else actor.speed=0}
   for(const actor of animals){const follows=actor.id==='patch'&&objects.following,makeRoom=follows&&!engaged&&Math.hypot(input.x,input.forward)>.01,near=distance(body,actor)<1.6&&!makeRoom||engaged===actor.id;actor.stopped=near;if(near||reduced){actor.speed=0;turn(actor,Math.sin(bearing(actor,body)),Math.cos(bearing(actor,body)),dt);continue}let goal=follows?{x:body.x-.75,z:body.z+1.2}:actor.id==='patch'?{x:-1.5+Math.sin(elapsed*.25),z:16+Math.cos(elapsed*.2)}:{x:-19+Math.sin(elapsed*.2)*2,z:13+Math.cos(elapsed*.18)*1.3};
    // Route companions through the dry crossing when their owner changes banks.
    const globalGoal=actor.id==='patch'?worldFollow.goal(actor,body,follows,!!world||riverSide(actor)*riverSide(body)<0||bridgeHeight(actor)!==null):null
    if(globalGoal)goal=globalGoal
    else if(!world&&follows&&actor.z>0&&body.z<-8)goal={x:0,z:-8.5}
    else if(!world){const quarterGoal=actor.id==='patch'?japanFollow.goal(actor,body,follows):null;if(quarterGoal)goal=quarterGoal;else if(follows&&actor.z<-8&&body.z>0)goal={x:0,z:.6}}
    if(world&&!follows){const origin=world.animals.find(candidate=>candidate.id===actor.id)!;goal={x:origin.x+Math.sin(elapsed*.2+actor.phase)*.7/Math.max(.1,Math.cos(origin.z/RADIUS)),z:origin.z+Math.cos(elapsed*.18+actor.phase)*.6}}
    moving(actor,goal,follows?3.7:.65,dt)
   }
  },
  reset(){surfaceMotor.reset();activities.reset();reactions.reset();pendingPatchCelebration=0;Object.assign(body,{...spawn,...freshMotion(),y:0,vy:0,yaw:world?bearing(spawn,world.entryLookAt):.2,speed:0,crouched:false});walkers.forEach((w,i)=>Object.assign(w,{...residents[i]!,speed:0,stopped:false,greeting:0}));animals.forEach((actor,index)=>Object.assign(actor,world?.animals[index]??(index===0?{x:-1.5,z:16}:{x:-19,z:13}),{speed:0,stopped:false}));Object.assign(objects,{windmill:true,bell:0,harborBell:0,campfire:false,lamp:true,duckFood:0,playTime:0,catPatTime:0,catAffection:0,affection:0,following:false,fox:false});Object.assign(workshop,freshWorkshop());flock.reset();resident.reset();cityPopulation.reset();japanFollow.reset();worldFollow.reset();inside=null;engaged=null;visited=null;elapsed=0;discovered.clear()},
 }
}
export type GlobeSimulation=ReturnType<typeof createGlobeSimulation>
