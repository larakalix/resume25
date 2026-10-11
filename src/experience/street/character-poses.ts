import * as THREE from 'three'
import type {MotionName} from '../explorer/character-asset.ts'

export const ORIGINAL_POSE_METRICS={pelvisHeight:.674,upperLeg:.25,lowerLeg:.25,ankleHeight:.18,walkStride:1.35,runStride:2.0}
const names:MotionName[]=['idle','walk','run','jumpStart','jumpAir','land','wave']
const bones=['upperarm','lowerarm','hand','thigh','calf','foot'] as const
type Bone=typeof bones[number]
type Angles=[number,number,number]
type Pose={pelvis:number;left:Record<Bone,Angles>;right:Record<Bone,Angles>}
const smooth=(t:number)=>{const v=THREE.MathUtils.clamp(t,0,1);return v*v*(3-2*v)}

function ankle(phase:number,running:boolean,strideScale:number){
 const stance=running?.24:.34,stride=(running?ORIGINAL_POSE_METRICS.runStride:ORIGINAL_POSE_METRICS.walkStride)*strideScale,reach=stride*stance/2
 if(phase<=stance)return{forward:reach-stride*phase,height:ORIGINAL_POSE_METRICS.ankleHeight,pitch:0}
 const t=(phase-stance)/(1-stance),lift=Math.sin(t*Math.PI)**2
 return{forward:THREE.MathUtils.lerp(-reach,reach,smooth(t)),height:ORIGINAL_POSE_METRICS.ankleHeight+lift*(running?.14:.095)*Math.sqrt(strideScale),pitch:-lift*(running?.13:.08)}
}

function leg(forward:number,ankleY:number,pelvis:number,pitch=0){
 const {upperLeg:a,lowerLeg:b}=ORIGINAL_POSE_METRICS,down=pelvis-ankleY
 const knee=Math.acos(THREE.MathUtils.clamp((down*down+forward*forward-a*a-b*b)/(2*a*b),-1,1))
 const hip=Math.atan2(-forward,down)-Math.atan2(b*Math.sin(knee),a+b*Math.cos(knee))
 return{thigh:[hip,0,0] as Angles,calf:[knee,0,0] as Angles,foot:[pitch-hip-knee,0,0] as Angles}
}

function sample(name:MotionName,t:number,strideScale:number):Pose{
 const active=name==='walk'||name==='run',running=name==='run',feet=[ankle(t%1,running,strideScale),ankle((t+.5)%1,running,strideScale)]
 let pelvis=ORIGINAL_POSE_METRICS.pelvisHeight
 if(active)for(const foot of feet){const reach=.496;pelvis=Math.min(pelvis,foot.height+Math.sqrt(Math.max(.001,reach*reach-foot.forward*foot.forward)))}
 if(name==='land')pelvis-=Math.sin(t*Math.PI)*.07*(1-t*.25)
 if(name==='jumpStart')pelvis=.65-Math.sin(t*Math.PI)*.025
 if(name==='jumpAir')pelvis=.65
 const sides=feet.map((foot,index)=>{
  const side=index===0?1:-1,phase=(t+index*.5)%1,cycle=Math.cos(phase*Math.PI*2)
  let legs=leg(active?foot.forward:0,active?foot.height:ORIGINAL_POSE_METRICS.ankleHeight,pelvis,active?foot.pitch:0)
  if(name==='jumpStart'||name==='jumpAir'){
   const tuck=name==='jumpStart'?smooth(t/.55):1,hip=-.22-.27*tuck,knee=.55+.48*tuck
   legs={thigh:[hip,0,0],calf:[knee,0,0],foot:[-hip-knee-.06,0,0]}
  }
  const arm:Angles=[active?(running?-.10:0)+cycle*(running?.40:.27):-.04,0,side*.18]
  const elbow:Angles=[active?(running?-.82: -.25)+cycle*(running?.10:.07):-.16,0,side*.025]
  const hand:Angles=[.035,0,0]
  if(name==='idle'){arm[2]+=side*Math.sin(t*Math.PI*2)*.008;elbow[0]+=Math.sin(t*Math.PI*2)*.01}
  if(name==='jumpStart'||name==='jumpAir'){arm[0]=-.18;arm[2]=side*(name==='jumpAir'?.32:.18+.20*smooth(t/.5));elbow[0]=-.42}
  if(name==='land'){arm[0]=-.07;arm[2]=side*(.12+Math.sin(t*Math.PI)*.09);elbow[0]=-.20}
  if(name==='wave'&&index===1){
   const envelope=smooth(t/.16)*(1-smooth((t-.9)/.1)),flutter=Math.sin(t*Math.PI*5)
   arm[0]=THREE.MathUtils.lerp(-.04,-.22,envelope);arm[2]=THREE.MathUtils.lerp(-.18,-2.5,envelope)
   elbow[0]=THREE.MathUtils.lerp(-.16,-.28,envelope);elbow[2]=THREE.MathUtils.lerp(-.025,-.32+flutter*.23,envelope);hand[2]=flutter*.14*envelope
  }
  return{...legs,upperarm:arm,lowerarm:elbow,hand}
 })
 return{pelvis,left:sides[0]!,right:sides[1]!}
}

/** Baked local joint tracks: hips follow contact arcs; stance ankles counter-rotate to a level sole. */
export function createOriginalMotions({strideScale=1}:{strideScale?:number}={}){
 if(!Number.isFinite(strideScale)||strideScale<=0||strideScale>1)throw new Error('Character stride scale must be in (0, 1].')
 return names.map(name=>{
  const duration=name==='wave'?1.8:1,times=Array.from({length:49},(_,i)=>i/48*duration),poses=times.map(time=>sample(name,time/duration,strideScale)),tracks:THREE.KeyframeTrack[]=[]
  const quaternion=new THREE.Quaternion(),euler=new THREE.Euler()
  for(const [index,side] of ['l','r'].entries())for(const bone of bones){
   const values:number[]=[]
   for(const pose of poses){const angles=(index===0?pose.left:pose.right)[bone];quaternion.setFromEuler(euler.set(...angles));values.push(quaternion.x,quaternion.y,quaternion.z,quaternion.w)}
   tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}_${side}.quaternion`,times,values))
  }
  tracks.push(new THREE.VectorKeyframeTrack('pelvis.position',times,poses.flatMap(pose=>[0,pose.pelvis,0])))
  return new THREE.AnimationClip(name,duration,tracks)
 })
}
