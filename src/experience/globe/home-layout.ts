import type {MapPoint,Target} from './types.ts'

export type HomeRoomId='home'|'home-studio'|'home-balcony'
export const isHomeRoom=(id:string):id is HomeRoomId=>id==='home'||id==='home-studio'||id==='home-balcony'
export const homeFloorLabels:Record<HomeRoomId,string>={home:'Ivan’s House · 1F', 'home-studio':'Gaming studio · 2F','home-balcony':'Sky lounge · 3F'}

/** Room transitions are explicit landings, keeping each floor within the existing room physics. */
export const homeLandingTargets:Target[]=[
 {id:'home-up',name:'Studio stairs',label:'Up to the gaming studio · 2F',kind:'door',topic:'environment',room:'home',interior:'home-studio',x:-1.75,z:.25,radius:1.1,arrival:{x:-1.45,z:.45},entry:{x:0,z:1}},
 {id:'studio-up',name:'Sky lounge stairs',label:'Up to the sky lounge · 3F',kind:'door',topic:'environment',room:'home-studio',interior:'home-balcony',x:-1.75,z:.25,radius:1.1,arrival:{x:-1.45,z:.45},entry:{x:0,z:1}},
 {id:'studio-down',name:'Living room stairs',label:'Down to the living room · 1F',kind:'door',topic:'environment',room:'home-studio',interior:'home',x:1.75,z:2,radius:1.1,arrival:{x:1.4,z:1.8},entry:{x:0,z:1}},
 {id:'balcony-down',name:'Studio stairs',label:'Down to the gaming studio · 2F',kind:'door',topic:'environment',room:'home-balcony',interior:'home-studio',x:-1.75,z:.25,radius:1.1,arrival:{x:-1.45,z:.45},entry:{x:0,z:1}},
]

/** Includes body clearance around fixed furnishings and the closed side of each staircase. */
export function homeRoomBlocked(room:HomeRoomId,p:MapPoint){
 if(p.x< -2.12&&p.z> -2.12&&p.z<.94)return true
 if(room==='home-studio'&&p.x>2.12&&p.z>1.28)return true
 const planterZ=room==='home-balcony'?3.1:2.5
 if(Math.hypot(Math.abs(p.x)-3.4,p.z-planterZ)<.60)return true
 if(room==='home-balcony')return Math.abs(p.x)<2.75&&p.z< -2.12
 return(Math.abs(p.x)<2.95&&p.z<(room==='home-studio'?-1.35:-1.78))||(room==='home'&&p.x< -1.73&&p.z>.63&&p.z<2.77)
}
