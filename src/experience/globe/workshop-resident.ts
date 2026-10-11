import type {MapPoint,RoomId} from './types.ts'
import {homeRoomBlocked,isHomeRoom} from './home-layout.ts'
import {isCityRoom,cityRoomBlocked} from './city-room-layout.ts'

export const workshopHost={x:-1.7,z:-1.4}
export const ivanHome={x:2,z:.5}
/** All connecting segments remain in the open centre/right aisle of Ivan's house. */
export const homeWaypoints:readonly MapPoint[]=[ivanHome,{x:2.8,z:1.7},{x:1.8,z:2.5},{x:-.65,z:1.4},{x:-.5,z:-.5},{x:1.7,z:-.9},{x:3,z:-1.1},{x:3.05,z:.25}]
export const workshopWaypoints=homeWaypoints

/** Shared body-clearance bounds for visitors and room residents, before live actor separation. */
export function roomWalkable(room:RoomId,p:MapPoint){
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x< -3.45||p.x>3.45||p.z< -3.45||p.z>3.55)return false
 if(room==='workshop'&&((Math.abs(p.x)<2.95&&p.z< -1.94)||(p.x< -1.95&&p.z>.85&&p.z<2.6)))return false
 if(isHomeRoom(room)&&homeRoomBlocked(room,p))return false
 if((room==='crystal-cave'||room==='tide-cave')&&(Math.abs(p.x)>2.4||p.z< -1.5))return false
 if(room==='library'&&(p.z< -2.15||(p.x< -1.75&&p.z>.55&&p.z<2.4)||(p.x>.25&&p.x<2.55&&p.z>.20&&p.z<2.2)))return false
 if(isCityRoom(room)&&cityRoomBlocked(room,p))return false
 return true
}

export interface WorkshopResidentState extends MapPoint {
 id:'ivan';yaw:number;speed:number;stopped:boolean;greeting:number;encounters:number
 mode:'walking'|'resting'|'greeting'|'chatting'
}

/** A small waypoint walker: random destinations and pauses, measured gait, no wall-clock timer. */
export function createWorkshopResident(random:()=>number=Math.random){
 const initial=():WorkshopResidentState=>({id:'ivan',...ivanHome,yaw:.4,speed:0,stopped:false,greeting:0,encounters:0,mode:'resting'})
 const state=initial()
 let goal=0,rest=1.4,near=false
 const sample=()=>{const n=random();return Number.isFinite(n)?Math.max(0,Math.min(.999999,n)):.5}
 function turn(dx:number,dz:number,dt:number,reduced:boolean){if(Math.hypot(dx,dz)<.001)return;const yaw=Math.atan2(dx,dz);state.yaw=reduced?yaw:state.yaw+Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw))*(1-Math.exp(-dt*10))}
 return{state,
  step(delta:number,player:MapPoint,engaged:boolean,reduced:boolean,active=true){
   const dt=Number.isFinite(delta)?Math.min(.05,Math.max(0,delta)):0
   if(!dt)return
   state.greeting=Math.max(0,state.greeting-dt);state.speed=0
   if(!active){near=false;state.stopped=false;state.greeting=0;state.mode='resting';return}
   const gap=Math.hypot(player.x-state.x,player.z-state.z),close=gap<(near?2.8:2)||engaged
   if(close&&!near){state.encounters++;state.greeting=reduced?0:1.8}
   near=close;state.stopped=close
   if(close){turn(player.x-state.x,player.z-state.z,dt,reduced);state.mode=engaged?'chatting':state.greeting>0?'greeting':'resting';return}
   if(reduced){state.greeting=0;state.mode='resting';return}
   if(rest>0){rest=Math.max(0,rest-dt);state.mode='resting';return}
   const destination=homeWaypoints[goal]!,dx=destination.x-state.x,dz=destination.z-state.z,length=Math.hypot(dx,dz)
   if(length<.025){
    goal=(goal+1+Math.floor(sample()*(homeWaypoints.length-1)))%homeWaypoints.length
    rest=1.4+sample()*2.8;state.mode='resting';return
   }
   const stride=Math.min(length,.72*dt),next={x:state.x+dx/length*stride,z:state.z+dz/length*stride}
   if(roomWalkable('home',next)&&Math.hypot(next.x-player.x,next.z-player.z)>=.7){
    state.x=next.x;state.z=next.z;state.speed=stride/dt;turn(dx,dz,dt,false);state.mode='walking'
   }else{rest=.5;state.mode='resting'}
  },
  reset(){Object.assign(state,initial());goal=0;rest=1.4;near=false},
 }
}
