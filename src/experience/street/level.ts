import {residents,pets} from '../explorer/world-data.ts'
import type {Point2,WorldTarget} from '../explorer/types.ts'

export const streetSpawn={x:.2,z:8}
export const roadCenter=(z:number)=>Math.sin((z-7)*.11)*-.85
export function groundY(z:number){const t=(z+10)/6;return t>0&&t<1?Math.sin(t*Math.PI)*.38:0}
export const laneWidth=(z:number)=>z>-10&&z<-4?3.22:3.4
export const streetTargets:WorldTarget[]=[
    {id:'about',kind:'place',label:'About me',x:-3.1,z:3.5,radius:2.5,arrival:{x:-1.65,z:4.1}},
    {id:'toolkit',kind:'place',label:'My toolkit',x:3.5,z:-10.5,radius:3,arrival:{x:1.9,z:-10.2}},
    {id:'approach',kind:'place',label:'How I build',x:-2.8,z:-16,radius:2.6,arrival:{x:-1.4,z:-15.5}},
    {id:'contact',kind:'place',label:'Say hello',x:3.2,z:-1,radius:2.3,arrival:{x:1.7,z:-.4}},
    {...residents[0]!,x:1.3,z:-2.5,arrival:{x:.8,z:-.7}},
    {...pets[0]!,x:-1.1,z:6.6,arrival:{x:-1.6,z:8}},
]
export function streetDistance(a:Point2,b:Point2){return Math.hypot(a.x-b.x,a.z-b.z)}
export function keepOnStreet(point:Point2){point.z=Math.max(-23.5,Math.min(13.2,point.z));point.x=Math.max(roadCenter(point.z)-laneWidth(point.z),Math.min(roadCenter(point.z)+laneWidth(point.z),point.x));return point}
