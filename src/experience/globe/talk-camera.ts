import * as THREE from 'three'
import type {TalkAnchor,TalkView} from './talk-view.ts'

/** Outdoor side views separate the actors; rooms stay visible through their open front. */
export function createTalkCamera(){
 const right=new THREE.Vector3(),depth=new THREE.Vector3(),middle=new THREE.Vector3()
 return(player:THREE.Vector3,speaker:THREE.Vector3,up:THREE.Vector3,small:boolean,position:THREE.Vector3,target:THREE.Vector3,indoor=false)=>{
  right.copy(speaker).sub(player);right.addScaledVector(up,-right.dot(up))
  const separation=right.length();if(separation<.01)right.set(1,0,0);else right.multiplyScalar(1/separation)
  depth.crossVectors(right,up).normalize();middle.copy(player).lerp(speaker,.5)
  const distance=(small?8.3:6.3)+Math.max(0,separation-2)*.5
  target.copy(middle).addScaledVector(up,indoor?.9:1.15)
  if(indoor)position.set(THREE.MathUtils.clamp(middle.x+.3,-2.5,2.5),small?4.25:3.75,Math.max(player.z,speaker.z)+distance)
  else position.copy(middle).addScaledVector(depth,distance).addScaledVector(up,small?4.25:3.75).addScaledVector(right,-.2)
 }
}

export function projectTalkAnchor(point:THREE.Vector3,camera:THREE.Camera,scratch=new THREE.Vector3()):TalkAnchor{
 scratch.copy(point).project(camera)
 const finite=Number.isFinite(scratch.x)&&Number.isFinite(scratch.y)&&Number.isFinite(scratch.z)
 return{x:finite?Math.round(THREE.MathUtils.clamp((scratch.x+1)*50,0,100)*10)/10:50,y:finite?Math.round(THREE.MathUtils.clamp((1-scratch.y)*50,0,100)*10)/10:40,visible:finite&&scratch.z>=-1&&scratch.z<=1&&Math.abs(scratch.x)<=1&&Math.abs(scratch.y)<=1}
}

/** Camera smoothing can run at 60Hz without rebuilding the DOM at that rate. */
export function createTalkViewPublisher(emit?: (value:TalkView|null)=>void){
 let last=-Infinity,key='';const scratch=new THREE.Vector3()
 return{
  update(time:number,camera:THREE.Camera,player:THREE.Vector3,speaker:THREE.Vector3,force=false){
   if(!emit||!force&&time-last<.05)return;last=time
   const view={speaker:projectTalkAnchor(speaker,camera,scratch),player:projectTalkAnchor(player,camera,scratch)},next=JSON.stringify(view)
   if(force||key!==next){key=next;emit(view)}
  },
  clear(){if(key==='null')return;key='null';last=-Infinity;emit?.(null)},
 }
}
