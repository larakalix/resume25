import {mapAt,normalAt,RADIUS,WATER} from './terrain.ts'

interface Point {x:number;z:number}
interface Vector {x:number;y:number;z:number}
export interface HarborRail {x0:number;x1:number;z0:number;z1:number}

/** All lengths are physical metres in the harbor's flat tangent frame. */
export const harbor={x:48,z:14,level:.55,x0:-1.2,x1:6.8,halfWidth:1.7,apronStart:-2.5,apronEnd:-.8,apronHalfWidth:2.2,headStart:6.8,headEnd:10.4,headHalfWidth:4.4,thickness:.24,railWidth:.16,railHeight:.9,railStart:-.6,bodyRadius:.32,shipX:15.3,shipZ:-7.3,shipLength:13,shipBeam:3.8}
const up=normalAt(harbor.x,harbor.z),u=harbor.x/RADIUS,east={x:Math.cos(u),y:-Math.sin(u),z:0},south=cross(east,up),levelRadius=RADIUS+harbor.level
export const harborBasis={up,east,south}
function cross(a:Vector,b:Vector):Vector{return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}}
function dot(a:Vector,b:Vector){return a.x*b.x+a.y*b.y+a.z*b.z}
function mapWorld(point:Vector){const length=Math.hypot(point.x,point.y,point.z);return mapAt({x:point.x/length,y:point.y/length,z:point.z/length})}

export function harborWorldPoint(x:number,z:number,lift=0):Vector{
 const radius=levelRadius+lift
 return{x:up.x*radius+east.x*x+south.x*z,y:up.y*radius+east.y*x+south.y*z,z:up.z*radius+east.z*x+south.z*z}
}
export function harborMapPoint(x:number,z:number):Point{return mapWorld(harborWorldPoint(x,z))}

/** Intersect the map ray with the real flat pier plane rather than flattening longitude. */
export function harborLocalPoint(point:Point){
 const n=normalAt(point.x,point.z),alignment=dot(n,up)
 if(alignment<=0)return null
 const radius=levelRadius/alignment
 return{x:radius*dot(n,east),z:radius*dot(n,south),height:radius-RADIUS}
}
function within(x:number,z:number,x0:number,x1:number,halfWidth:number,margin:number){return x>=x0-margin-1e-7&&x<=x1+margin+1e-7&&Math.abs(z)<=halfWidth+margin+1e-7}
function onDeck(x:number,z:number,margin:number){
 return within(x,z,harbor.x0,harbor.x1,harbor.halfWidth,margin)||within(x,z,harbor.apronStart,harbor.apronEnd,harbor.apronHalfWidth,margin)||within(x,z,harbor.headStart,harbor.headEnd,harbor.headHalfWidth,margin)
}
export function harborFootprint(point:Point,margin=0){const p=harborLocalPoint(point);return p!==null&&onDeck(p.x,p.z,margin)}
export function harborHeight(point:Point){const p=harborLocalPoint(point);return p!==null&&onDeck(p.x,p.z,0)?p.height:null}

/** Only the outer perimeter is railed: the bank and the main-pier/head junction stay open. */
export const harborRails:HarborRail[]=[
 {x0:harbor.railStart,x1:harbor.headStart,z0:-harbor.halfWidth,z1:-harbor.halfWidth+harbor.railWidth},
 {x0:harbor.railStart,x1:harbor.headStart,z0:harbor.halfWidth-harbor.railWidth,z1:harbor.halfWidth},
 {x0:harbor.headStart,x1:harbor.headEnd,z0:-harbor.headHalfWidth,z1:-harbor.headHalfWidth+harbor.railWidth},
 {x0:harbor.headStart,x1:harbor.headEnd,z0:harbor.headHalfWidth-harbor.railWidth,z1:harbor.headHalfWidth},
 {x0:harbor.headEnd-harbor.railWidth,x1:harbor.headEnd,z0:-harbor.headHalfWidth,z1:harbor.headHalfWidth},
 {x0:harbor.headStart,x1:harbor.headStart+harbor.railWidth,z0:-harbor.headHalfWidth,z1:-harbor.halfWidth},
 {x0:harbor.headStart,x1:harbor.headStart+harbor.railWidth,z0:harbor.halfWidth,z1:harbor.headHalfWidth},
]
export function harborBlocked(point:Point,bodyRadius=harbor.bodyRadius){
 const p=harborLocalPoint(point);if(!p)return false
 return harborRails.some(rail=>{const dx=Math.max(rail.x0-p.x,0,p.x-rail.x1),dz=Math.max(rail.z0-p.z,0,p.z-rail.z1);return dx*dx+dz*dz<bodyRadius*bodyRadius})
}
export function harborOutline():Point[]{
 return[
  [harbor.apronStart,-harbor.apronHalfWidth],[harbor.apronEnd,-harbor.apronHalfWidth],[harbor.apronEnd,-harbor.halfWidth],
  [harbor.headStart,-harbor.halfWidth],[harbor.headStart,-harbor.headHalfWidth],[harbor.headEnd,-harbor.headHalfWidth],
  [harbor.headEnd,harbor.headHalfWidth],[harbor.headStart,harbor.headHalfWidth],[harbor.headStart,harbor.halfWidth],
  [harbor.apronEnd,harbor.halfWidth],[harbor.apronEnd,harbor.apronHalfWidth],[harbor.apronStart,harbor.apronHalfWidth],
 ].map(([x,z])=>harborMapPoint(x!,z!))
}
export const harborArrival=harborMapPoint(8,0),shoreEntry=harborMapPoint(harbor.apronStart,0)
export const shipPosition=harborMapPoint(harbor.shipX,harbor.shipZ),harborShipPosition=shipPosition

// Keep the ship parallel to the pier, projected onto the ship's own water-level tangent plane.
const shipUp=normalAt(shipPosition.x,shipPosition.z),eastDot=dot(east,shipUp),projectedEast={x:east.x-shipUp.x*eastDot,y:east.y-shipUp.y*eastDot,z:east.z-shipUp.z*eastDot},eastLength=Math.hypot(projectedEast.x,projectedEast.y,projectedEast.z)
const shipEast={x:projectedEast.x/eastLength,y:projectedEast.y/eastLength,z:projectedEast.z/eastLength},shipSouth=cross(shipEast,shipUp),shipU=shipPosition.x/RADIUS,standardEast={x:Math.cos(shipU),y:-Math.sin(shipU),z:0},standardSouth=cross(standardEast,shipUp)
export const shipBasis={up:shipUp,east:shipEast,south:shipSouth}
export const shipYaw=Math.atan2(-dot(shipEast,standardSouth),dot(shipEast,standardEast))
export function shipOutline():Point[]{
 const radius=RADIUS+WATER
 return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([side,end])=>{
  const x=side!*harbor.shipLength/2,z=end!*harbor.shipBeam/2
  return mapWorld({x:shipUp.x*radius+shipEast.x*x+shipSouth.x*z,y:shipUp.y*radius+shipEast.y*x+shipSouth.y*z,z:shipUp.z*radius+shipEast.z*x+shipSouth.z*z})
 })
}
