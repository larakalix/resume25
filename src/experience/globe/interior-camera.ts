import {Box3,MathUtils,Ray,Vector3} from 'three'
import type {RoomId} from './types.ts'

interface Projection {fov:number;aspect:number}
const up=new Vector3(0,1,0),heights=[.04,1.1,2.8]
const box=(x0:number,y0:number,z0:number,x1:number,y1:number,z1:number)=>new Box3(new Vector3(x0,y0,z0),new Vector3(x1,y1,z1))
const ordinaryWalls=[box(-4.2,0,-4.2,-4,3.1,4.2),box(4,0,-4.2,4.2,3.1,4.2),box(-4.2,0,-4.15,4.2,3.1,-3.95)]
// Rock volumes conservatively contain the irregular cave shells. There is no roof.
const caveWalls=[box(-4.7,0,-4.7,-2.8,3.5,4.7),box(2.8,0,-4.7,4.7,3.5,4.7),box(-4.7,0,-4.7,4.7,3.5,-2.8)]
const balconyWalls=[ordinaryWalls[2]!,box(-3.96,0,-4,-3.84,1.1,4),box(3.84,0,-4,3.96,1.1,4),box(-3.96,0,3.84,3.96,1.1,4)]

/** Guard the open-front room shell without changing a view that is already clear. */
export function createInteriorCameraClearance(){
 const ray=new Ray(),anchor=new Vector3(),direction=new Vector3(),hit=new Vector3(),right=new Vector3(),vertical=new Vector3(),relative=new Vector3(),original=new Vector3()
 return(room:RoomId,position:Vector3,target:Vector3,player:Vector3,projection:Projection={fov:50,aspect:1.5})=>{
  const cave=room==='crystal-cave'||room==='tide-cave',balcony=room==='home-balcony',walls=cave?caveWalls:balcony?balconyWalls:ordinaryWalls,inner=cave?2.8:balcony?3.84:4,front=cave?4.7:4.2
  const fov=MathUtils.degToRad(MathUtils.clamp(projection.fov,35,75)),tanY=Math.tan(fov/2),tanX=tanY*Math.max(.15,projection.aspect)
  function obstructed(){
   for(const height of heights){anchor.copy(player).addScaledVector(up,height);direction.copy(anchor).sub(position);const length=direction.length();if(length<.01)return true;ray.set(position,direction.multiplyScalar(1/length));for(const wall of walls)if(ray.intersectBox(wall,hit)&&hit.distanceTo(position)<length-.02)return true}
   return false
  }
  function span(){
   direction.copy(target).sub(position).normalize();right.crossVectors(direction,up).normalize();vertical.crossVectors(right,direction).normalize();let ratio=0
   for(const height of heights)for(const side of [-.55,.55]){
    anchor.copy(player).addScaledVector(up,height).addScaledVector(right,side);relative.copy(anchor).sub(position);const depth=relative.dot(direction);if(depth<=.1)return Infinity
    ratio=Math.max(ratio,Math.abs(relative.dot(right))/(depth*tanX),Math.abs(relative.dot(vertical))/(depth*tanY))
   }
   return ratio
  }
  function aperture(){
   position.z=Math.max(position.z,front+.45);position.y=Math.max(position.y,player.y+3)
   if(balcony&&player.y+.04<1.24){
    // Pull in locally at the front rail instead of raising every room camera.
    const foot=player.y+.04,gap=Math.max(.05,3.84-player.z),limit=player.z+gap*(position.y-foot)/(1.24-foot)
    position.z=Math.max(front+.45,Math.min(position.z,limit));position.y=Math.max(position.y,foot+(1.24-foot)*(position.z-player.z)/gap)
   }
   const t=(front+.12-player.z)/(position.z-player.z),margin=.14
   position.x=MathUtils.clamp(position.x,player.x+(-inner+margin-player.x)/t,player.x+(inner-margin-player.x)/t)
  }
  const blocked=obstructed(),outside=span()>.9;if(!blocked&&!outside)return false
  original.copy(position);if(blocked)aperture()
  for(let attempt=0;attempt<4;attempt++){
   const ratio=span();if(ratio>.9){target.copy(player).addScaledVector(up,1.35);const centered=span();if(centered>.9){direction.copy(position).sub(target);position.copy(target).addScaledVector(direction,Number.isFinite(centered)?Math.max(1,centered/.86):1.4)}}
   if(obstructed())aperture();if(!obstructed()&&span()<=.9)break
  }
  return original.distanceToSquared(position)>1e-12||outside
 }
}
