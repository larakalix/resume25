import {Quaternion,Vector3} from 'three'
import {RADIUS,mapAt,normalAt} from './terrain.ts'
import type {MoveInput} from '../explorer/types.ts'
import type {MapPoint,Player} from './types.ts'

export interface WorldVector {x:number;y:number;z:number}
/** Camera forward points into the picture; right points toward its right edge. */
export interface MovementFrame {forward:WorldVector;right:WorldVector}
const finite=(v:WorldVector)=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z)
const axis=new Vector3(0,0,1)

export function tangentAxes(point:MapPoint){
 const normal=new Vector3().copy(normalAt(point.x,point.z)),east=new Vector3(Math.cos(point.x/RADIUS),-Math.sin(point.x/RADIUS),0)
 return{normal,east,south:new Vector3().crossVectors(east,normal).normalize()}
}

/** Project view directions without allowing a vertical camera to erase an input axis. */
export function movementBasis(normal:WorldVector,frame:MovementFrame,fallback:WorldVector=axis):MovementFrame{
 const up=new Vector3().copy(normal).normalize(),forward=new Vector3(),right=new Vector3()
 if(finite(frame.forward))forward.copy(frame.forward).projectOnPlane(up)
 if(forward.lengthSq()<1e-12&&finite(frame.right)){right.copy(frame.right).projectOnPlane(up);forward.crossVectors(up,right)}
 if(forward.lengthSq()<1e-12)forward.copy(fallback).projectOnPlane(up)
 if(forward.lengthSq()<1e-12)forward.set(1,0,0).projectOnPlane(up)
 if(forward.lengthSq()<1e-12)forward.set(0,1,0).projectOnPlane(up)
 forward.normalize();right.crossVectors(forward,up).normalize()
 if(finite(frame.right)&&right.dot(frame.right)<-1e-8){right.negate();forward.negate()}
 return{forward,right}
}

/**
 * A radial motor: exact acceleration integration, great-circle motion and parallel
 * transport. Map coordinates are only the adapter to existing terrain/colliders.
 */
export function createSurfaceMotor(radius=RADIUS){
 const up=new Vector3(),east=new Vector3(),south=new Vector3(),velocity=new Vector3(),heading=new Vector3(),target=new Vector3(),travel=new Vector3(),turn=new Quaternion(),nextUp=new Vector3(),direction=new Vector3()
 let initialized=false,lastYaw=NaN,lastPoint:MapPoint={x:NaN,z:NaN}
 function axes(point:MapPoint){east.set(Math.cos(point.x/radius),-Math.sin(point.x/radius),0);south.crossVectors(east,up).normalize()}
 function map(normal:Vector3,previous:MapPoint){const point=mapAt(normal);if(Math.hypot(normal.x,normal.y)<1e-10)point.x=previous.x;return point}
 function sync(body:Player){
  if(!initialized||Math.abs(body.x-lastPoint.x)>1e-7||Math.abs(body.z-lastPoint.z)>1e-7){up.copy(normalAt(body.x,body.z));axes(body);heading.copy(east).multiplyScalar(Math.sin(body.yaw)).addScaledVector(south,Math.cos(body.yaw));initialized=true}
  axes(body);if(Number.isFinite(lastYaw)&&Math.abs(Math.atan2(Math.sin(body.yaw-lastYaw),Math.cos(body.yaw-lastYaw)))>1e-7)heading.copy(east).multiplyScalar(Math.sin(body.yaw)).addScaledVector(south,Math.cos(body.yaw));velocity.copy(east).multiplyScalar(body.vx).addScaledVector(south,body.vz)
 }
 function move(from:MapPoint,delta:Vector3,safe:(point:MapPoint)=>boolean){
  const length=delta.length();if(length<1e-12)return{point:from,moved:0}
  direction.copy(delta).multiplyScalar(1/length);nextUp.copy(up).multiplyScalar(Math.cos(length/radius)).addScaledVector(direction,Math.sin(length/radius)).normalize()
  const point=map(nextUp,from);if(!safe(point))return{point:from,moved:0}
  turn.setFromUnitVectors(up,nextUp);velocity.applyQuaternion(turn);heading.applyQuaternion(turn);up.copy(nextUp);return{point,moved:length}
 }
 return{
  reset(){initialized=false;velocity.set(0,0,0)},
  halt(){velocity.set(0,0,0)},
  step(body:Player,input:MoveInput,speed:number,delta:number,frame:MovementFrame,safe:(point:MapPoint)=>boolean){
   const dt=Number.isFinite(delta)?Math.min(.05,Math.max(0,delta)):0;if(!dt)return{distance:0,blocked:false}
   sync(body)
   const basis=movementBasis(up,frame,heading),x=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,forward=Number.isFinite(input.forward)?Math.max(-1,Math.min(1,input.forward)):0,length=Math.max(1,Math.hypot(x,forward)),rate=x||forward?20:28,decay=Math.exp(-rate*dt)
   target.copy(basis.right).multiplyScalar(x/length*speed).addScaledVector(basis.forward,forward/length*speed)
   travel.copy(target).multiplyScalar(dt).addScaledVector(velocity.clone().sub(target),(1-decay)/rate)
   velocity.sub(target).multiplyScalar(decay).add(target)
   if(!x&&!forward&&velocity.length()<.008)velocity.set(0,0,0)
   const startUp=up.clone(),requested=travel.length(),segments=Math.max(1,Math.ceil(requested/.10)),segment=travel.multiplyScalar(1/segments),oldHeading=heading.clone();let point:MapPoint={x:body.x,z:body.z},moved=0,blocked=false
   for(let i=0;i<segments;i++){
    const prior=up.clone(),result=move(point,segment,safe)
    if(result.moved){point=result.point;moved+=result.moved;turn.setFromUnitVectors(prior,up);segment.applyQuaternion(turn);continue}
    blocked=true
    // Slide in the current screen tangent basis, retaining collision checks for
    // every accepted substep instead of cutting diagonally through a wall.
    const current=movementBasis(up,basis,heading),side=new Vector3().copy(current.right).multiplyScalar(segment.dot(current.right)),along=new Vector3().copy(current.forward).multiplyScalar(segment.dot(current.forward))
    const a=move(point,side,safe);point=a.point;moved+=a.moved
    if(a.moved){turn.setFromUnitVectors(prior,up);along.applyQuaternion(turn);segment.applyQuaternion(turn)}
    const before=up.clone(),b=move(point,along,safe);point=b.point;moved+=b.moved
    if(b.moved){turn.setFromUnitVectors(before,up);segment.applyQuaternion(turn)}
    // A blocked component must not accumulate hidden acceleration into a wall.
    if(!a.moved&&side.lengthSq()>1e-12)velocity.addScaledVector(current.right,-velocity.dot(current.right))
    if(!b.moved&&along.lengthSq()>1e-12)velocity.addScaledVector(current.forward,-velocity.dot(current.forward))
   }
   if(velocity.lengthSq()<1e-20)velocity.set(0,0,0)
   axes(point)
   if(moved>1e-8){
    const transported=up.clone().multiplyScalar(startUp.dot(up)).sub(startUp).normalize()
    // Heading is transported even when the geographic yaw wraps at a pole.
    if(transported.lengthSq()>.5){const angle=Math.atan2(new Vector3().crossVectors(heading,transported).dot(up),heading.dot(transported));heading.applyAxisAngle(up,angle*(1-Math.exp(-12*dt))).projectOnPlane(up).normalize()}
   }else heading.copy(oldHeading).projectOnPlane(up).normalize()
   body.x=point.x;body.z=point.z;body.vx=velocity.dot(east);body.vz=velocity.dot(south);body.yaw=Math.atan2(heading.dot(east),heading.dot(south));body.speed=Math.atan2(new Vector3().crossVectors(startUp,up).length(),Math.max(-1,Math.min(1,startUp.dot(up))))*radius/dt;lastYaw=body.yaw;lastPoint={...point}
   return{distance:body.speed*dt,blocked}
  },
 }
}

/** Rooms retain their ordinary X/Z floor and existing collision authority. */
export function planarFrameInput(input:MoveInput,frame:MovementFrame):MoveInput{
 const x=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,f=Number.isFinite(input.forward)?Math.max(-1,Math.min(1,input.forward)):0,basis=movementBasis({x:0,y:1,z:0},frame,{x:0,y:0,z:-1})
 return{x:basis.right.x*x+basis.forward.x*f,forward:-(basis.right.z*x+basis.forward.z*f)||0,run:input.run}
}
