import {MathUtils,Matrix4,Quaternion,Vector3} from 'three'
import {RADIUS,normalAt} from './terrain.ts'
import {followFraming} from './camera-framing.ts'
import {movementBasis,tangentAxes} from './surface-motor.ts'
import type {MapPoint} from './types.ts'
import type {MovementFrame,WorldVector} from './surface-motor.ts'

export interface CameraDirectorState {point:MapPoint;position?:WorldVector;overview:boolean;small?:boolean;aspect?:number;fov?:number;calm?:boolean}
export interface DirectedCamera {position:Vector3;target:Vector3;up:Vector3;quaternion:Quaternion;movement:MovementFrame;settled:boolean}
const globeNorth=new Vector3(0,0,-1),unitUp=new Vector3(0,1,0),unitRight=new Vector3(1,0,0),unitForward=new Vector3(0,0,-1)
const finite=(n:number)=>Number.isFinite(n)?n:0
const smooth=(dt:number,rate:number)=>1-Math.exp(-rate*dt)

/** One camera authority; no render loop, DOM, geography edits or actor mutations. */
export function createCameraDirector(radius=RADIUS){
 const position=new Vector3(),target=new Vector3(),up=new Vector3(),quaternion=new Quaternion(),movement={forward:new Vector3(),right:new Vector3()},pose:DirectedCamera={position,target,up,quaternion,movement,settled:true}
 const surfaceUp=new Vector3(),back=new Vector3(),lastUp=new Vector3(),followRight=new Vector3(),followPosition=new Vector3(),followTarget=new Vector3(),center=new Vector3(),desiredPosition=new Vector3(),desiredTarget=new Vector3(),desiredUp=new Vector3(),desiredQuaternion=new Quaternion(),overviewQuaternion=new Quaternion(),overviewWanted=new Quaternion(),transport=new Quaternion(),rotation=new Quaternion(),identity=new Quaternion(),matrix=new Matrix4(),overviewDirection=new Vector3(),overviewUp=new Vector3(),followDirection=new Vector3(),blendDirection=new Vector3(),view=new Vector3(),actualUp=new Vector3()
 let initialized=false,aligned=false,held=false,lastSmall=false,lastAspect=1.5,lastFov=50,wasOverview=true,overviewLongitude=0,wantedLongitude=0,overviewLatitude=0,wantedLatitude=0,blend=0,pitch=Math.atan2(8.5-1.1,12.5),wantedPitch=pitch,distanceScale=1,wantedDistance=1,lastPoint:MapPoint={x:0,z:0}
 function align(point:MapPoint){
  const axes=tangentAxes(point);lastPoint={...point};surfaceUp.copy(axes.normal);lastUp.copy(surfaceUp);back.copy(axes.south)
  overviewLongitude=wantedLongitude=point.x/radius;overviewLatitude=wantedLatitude=MathUtils.clamp(point.z/radius,-Math.PI/2+.0087,Math.PI/2-.0087)
  aligned=true;initialized=false;held=false
 }
 function recenter(heading?:WorldVector|number){
  held=false
  if(typeof heading==='number'){const axes=tangentAxes(lastPoint);back.copy(axes.east).multiplyScalar(-Math.sin(heading)).addScaledVector(axes.south,-Math.cos(heading))}
  else if(heading)back.copy(heading).negate().projectOnPlane(surfaceUp).normalize()
  else back.copy(tangentAxes(lastPoint).south)
  if(back.lengthSq()<.5)back.copy(tangentAxes(lastPoint).south)
  wantedPitch=Math.atan2(8.5-1.1,12.5);wantedDistance=1
 }
 function snapshot(){
  return{
   version:1 as const,
   flags:{initialized,aligned,held,lastSmall,overview:wasOverview},
   projection:{aspect:lastAspect,fov:lastFov},
   surface:{normal:surfaceUp.toArray(),previousNormal:lastUp.toArray(),back:back.toArray(),point:{...lastPoint},center:center.toArray()},
   overview:{longitude:overviewLongitude,wantedLongitude,latitude:overviewLatitude,wantedLatitude,quaternion:overviewQuaternion.toArray(),wantedQuaternion:overviewWanted.toArray()},
   follow:{blend,pitch,wantedPitch,distance:distanceScale,wantedDistance},
   pose:{position:position.toArray(),target:target.toArray(),up:up.toArray(),quaternion:quaternion.toArray(),forward:movement.forward.toArray(),right:movement.right.toArray(),settled:pose.settled},
  }
 }
 function restore(value:ReturnType<typeof snapshot>){
  const vectors=[value.surface.normal,value.surface.previousNormal,value.surface.back,value.surface.center,value.pose.position,value.pose.target,value.pose.up,value.pose.forward,value.pose.right],quaternions=[value.overview.quaternion,value.overview.wantedQuaternion,value.pose.quaternion],scalars=[value.surface.point.x,value.surface.point.z,value.overview.longitude,value.overview.wantedLongitude,value.overview.latitude,value.overview.wantedLatitude,value.follow.blend,value.follow.pitch,value.follow.wantedPitch,value.follow.distance,value.follow.wantedDistance,value.projection.aspect,value.projection.fov]
  if(value.version!==1||!vectors.every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))||!quaternions.every(v=>Array.isArray(v)&&v.length===4&&v.every(Number.isFinite))||!scalars.every(Number.isFinite)||!Object.values(value.flags).every(v=>typeof v==='boolean')||typeof value.pose.settled!=='boolean')throw new Error('Invalid camera snapshot.')
  initialized=value.flags.initialized;aligned=value.flags.aligned;held=value.flags.held;lastSmall=value.flags.lastSmall;wasOverview=value.flags.overview;lastAspect=value.projection.aspect;lastFov=value.projection.fov
  surfaceUp.fromArray(value.surface.normal);lastUp.fromArray(value.surface.previousNormal);back.fromArray(value.surface.back);lastPoint={...value.surface.point};center.fromArray(value.surface.center)
  overviewLongitude=value.overview.longitude;wantedLongitude=value.overview.wantedLongitude;overviewLatitude=value.overview.latitude;wantedLatitude=value.overview.wantedLatitude;overviewQuaternion.fromArray(value.overview.quaternion);overviewWanted.fromArray(value.overview.wantedQuaternion)
  blend=value.follow.blend;pitch=value.follow.pitch;wantedPitch=value.follow.wantedPitch;distanceScale=value.follow.distance;wantedDistance=value.follow.wantedDistance
  position.fromArray(value.pose.position);target.fromArray(value.pose.target);up.fromArray(value.pose.up);quaternion.fromArray(value.pose.quaternion);movement.forward.fromArray(value.pose.forward);movement.right.fromArray(value.pose.right);pose.settled=value.pose.settled
  return pose
 }
 function halt(keepTransition=false){
  if(!initialized)return
  // Cancel pending input against the visible pose, rather than the old angular
  // target. A full photo hold also suspends the automatic view transition.
  const direction=position.clone().normalize();overviewLongitude=wantedLongitude=Math.atan2(direction.x,direction.y);overviewLatitude=wantedLatitude=MathUtils.clamp(Math.asin(MathUtils.clamp(direction.z,-1,1)),-Math.PI/2+.0087,Math.PI/2-.0087)
  matrix.lookAt(direction,new Vector3(),globeNorth);overviewQuaternion.setFromRotationMatrix(matrix);overviewWanted.copy(overviewQuaternion)
  if(wasOverview&&blend<.001){
   // A full-globe radius is not a follow-camera offset. Reinterpreting it as
   // one would max the zoom and steepen the first Explore after canvas blur.
   const vertical=MathUtils.degToRad(lastFov),horizontal=2*Math.atan(Math.tan(vertical/2)*lastAspect),fit=radius/Math.sin(Math.min(vertical,horizontal)/2)*1.3
   distanceScale=MathUtils.clamp(position.length()/fit,.72,1.65)
  }else if(!wasOverview&&blend>.999){
   const offset=position.clone().sub(center),horizontal=offset.clone().projectOnPlane(surfaceUp),framing=followFraming(lastSmall),length=horizontal.length(),along=Math.sqrt(Math.max(0,length*length-framing.side*framing.side)),height=offset.dot(surfaceUp)-1.1
   if(length>1e-8)back.copy(horizontal).normalize().applyAxisAngle(surfaceUp,-Math.atan2(framing.side,along))
   pitch=MathUtils.clamp(Math.atan2(height,along),.22,1.18);distanceScale=MathUtils.clamp(Math.hypot(along,height)/Math.hypot(framing.back,framing.height-1.1),.72,1.65)
  }
  wantedPitch=pitch;wantedDistance=distanceScale
  // UI focus changes stop user orbit inertia but must not strand an automatic
  // Explore/World-view transition. Photo mode requests the default full hold.
  const transitioning=wasOverview?blend>.001:blend<.999
  held=!(keepTransition&&transitioning);pose.settled=held
 }
 return{
  align,
  recenter,
  snapshot,
  restore,
  halt,
  stop:halt,
  orbit(yaw:number,vertical:number){
   const x=MathUtils.clamp(finite(yaw),-Math.PI*4,Math.PI*4),y=MathUtils.clamp(finite(vertical),-Math.PI*4,Math.PI*4)
   if(!x&&!y)return
   held=false
   if(wasOverview){
    wantedLongitude+=x;wantedLatitude=MathUtils.clamp(wantedLatitude+y,-Math.PI/2+.0087,Math.PI/2-.0087)
   }else{
    rotation.setFromAxisAngle(surfaceUp,x);back.applyQuaternion(rotation).projectOnPlane(surfaceUp).normalize();wantedPitch=MathUtils.clamp(wantedPitch+y,.22,1.18)
   }
  },
  zoom(delta:number){const amount=MathUtils.clamp(finite(delta),-2,2);if(!amount)return;held=false;wantedDistance=MathUtils.clamp(wantedDistance*Math.exp(amount),.72,1.65)},
  update(delta:number,state:CameraDirectorState):DirectedCamera{
   const dt=Number.isFinite(delta)?MathUtils.clamp(delta,0,.05):0;if(!aligned)align(state.point)
   if(held){const anchor=state.position??new Vector3().copy(normalAt(state.point.x,state.point.z)).multiplyScalar(radius);if(wasOverview===state.overview&&lastSmall===!!state.small&&Math.abs(lastAspect-Math.max(.15,state.aspect??1.5))<1e-8&&Math.abs(lastFov-MathUtils.clamp(state.fov??followFraming(!!state.small).fov,35,75))<1e-8&&Math.abs(state.point.x-lastPoint.x)<1e-7&&Math.abs(state.point.z-lastPoint.z)<1e-7&&center.distanceToSquared(anchor)<1e-10)return pose;held=false}
   if(state.overview&&!wasOverview){wantedLongitude=state.point.x/radius;wantedLatitude=MathUtils.clamp(state.point.z/radius,-Math.PI/2+.0087,Math.PI/2-.0087)}
   surfaceUp.copy(normalAt(state.point.x,state.point.z));transport.setFromUnitVectors(lastUp,surfaceUp);back.applyQuaternion(transport).projectOnPlane(surfaceUp).normalize();lastUp.copy(surfaceUp);lastPoint={...state.point}
   if(back.lengthSq()<.5)back.copy(tangentAxes(state.point).south)
   const instant=!!state.calm||!initialized,k=instant?1:smooth(dt,10),modeRate=instant?1:smooth(dt,3.8)
   pitch=MathUtils.lerp(pitch,wantedPitch,k);distanceScale=MathUtils.lerp(distanceScale,wantedDistance,k)
   overviewLongitude+=Math.atan2(Math.sin(wantedLongitude-overviewLongitude),Math.cos(wantedLongitude-overviewLongitude))*k;overviewLatitude=MathUtils.lerp(overviewLatitude,wantedLatitude,k)
   overviewDirection.set(Math.sin(overviewLongitude)*Math.cos(overviewLatitude),Math.cos(overviewLongitude)*Math.cos(overviewLatitude),Math.sin(overviewLatitude));matrix.lookAt(overviewDirection,new Vector3(),globeNorth);overviewQuaternion.setFromRotationMatrix(matrix)
   const wantedDirection=new Vector3(Math.sin(wantedLongitude)*Math.cos(wantedLatitude),Math.cos(wantedLongitude)*Math.cos(wantedLatitude),Math.sin(wantedLatitude));matrix.lookAt(wantedDirection,new Vector3(),globeNorth);overviewWanted.setFromRotationMatrix(matrix)
   // Transition along the exterior sphere, never a straight chord through it.
   blend=MathUtils.lerp(blend,state.overview?0:1,modeRate)
   const framing=followFraming(!!state.small),distance=Math.hypot(framing.back,framing.height-1.1)*distanceScale
   followRight.crossVectors(surfaceUp,back).normalize()
   center.copy(state.position??surfaceUp.clone().multiplyScalar(radius))
   followTarget.copy(center).addScaledVector(surfaceUp,1.1).addScaledVector(back,-framing.lookAhead)
   followPosition.copy(center).addScaledVector(back,Math.cos(pitch)*distance).addScaledVector(surfaceUp,1.1+Math.sin(pitch)*distance).addScaledVector(followRight,framing.side)
   const fov=MathUtils.degToRad(MathUtils.clamp(state.fov??framing.fov,35,75)),aspect=Math.max(.15,state.aspect??1.5),horizontal=2*Math.atan(Math.tan(fov/2)*aspect),overviewDistance=radius/Math.sin(Math.min(fov,horizontal)/2)*1.3*distanceScale
   overviewDirection.set(0,0,1).applyQuaternion(overviewQuaternion);overviewUp.copy(unitUp).applyQuaternion(overviewQuaternion);followDirection.copy(followPosition).normalize()
   transport.setFromUnitVectors(overviewDirection,followDirection);rotation.copy(identity).slerp(transport,blend);blendDirection.copy(overviewDirection).applyQuaternion(rotation)
   desiredPosition.copy(blendDirection).multiplyScalar(Math.max(radius+2,MathUtils.lerp(overviewDistance,followPosition.length(),blend)));desiredTarget.copy(followTarget).multiplyScalar(blend)
   desiredUp.copy(overviewUp).lerp(surfaceUp,blend)
   if(desiredUp.lengthSq()<1e-8)desiredUp.copy(unitUp).applyQuaternion(quaternion)
   desiredUp.normalize();matrix.lookAt(desiredPosition,desiredTarget,desiredUp);desiredQuaternion.setFromRotationMatrix(matrix)
   if(instant){position.copy(desiredPosition);quaternion.copy(desiredQuaternion)}else{
    // Smooth radial direction as well as distance, retaining a safe exterior arc.
    const currentRadius=position.length();transport.setFromUnitVectors(position.clone().normalize(),desiredPosition.clone().normalize());rotation.copy(identity).slerp(transport,k);position.applyQuaternion(rotation).normalize().multiplyScalar(Math.max(radius+2,MathUtils.lerp(currentRadius,desiredPosition.length(),k)));quaternion.slerp(desiredQuaternion,k)
   }
   if(state.overview&&blend<.001){matrix.lookAt(position,new Vector3(),globeNorth);quaternion.setFromRotationMatrix(matrix)}
   up.copy(unitUp).applyQuaternion(quaternion);view.copy(unitForward).applyQuaternion(quaternion);target.copy(position).addScaledVector(view,position.distanceTo(desiredTarget))
   const basis=movementBasis(surfaceUp,{forward:view,right:actualUp.copy(unitRight).applyQuaternion(quaternion)},back.clone().negate());movement.forward.copy(basis.forward);movement.right.copy(basis.right)
   pose.settled=position.distanceToSquared(desiredPosition)<.01&&quaternion.angleTo(desiredQuaternion)<.003&&Math.abs(blend-(state.overview?0:1))<.001&&overviewQuaternion.angleTo(overviewWanted)<.003&&Math.abs(pitch-wantedPitch)<.001&&Math.abs(distanceScale-wantedDistance)<.001
   initialized=true;lastSmall=!!state.small;lastAspect=aspect;lastFov=MathUtils.radToDeg(fov);wasOverview=state.overview;return pose
  },
 }
}
