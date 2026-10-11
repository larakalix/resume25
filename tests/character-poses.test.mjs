import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createOriginalMotions,ORIGINAL_POSE_METRICS as metrics} from '../src/experience/street/character-poses.ts';
import {createCharacterMotion} from '../src/experience/explorer/character-motion.ts';

function rig(){
 const root=new THREE.Group(),pelvis=new THREE.Group();pelvis.name='pelvis';pelvis.position.y=metrics.pelvisHeight;root.add(pelvis);
 const torso=new THREE.Group();torso.name='spine_03';pelvis.add(torso);const head=new THREE.Group();head.name='Head';head.rotation.set(.08,.12,0);torso.add(head);
 for(const [side,x] of [['l',.135],['r',-.135]]){
  const thigh=new THREE.Group(),calf=new THREE.Group(),foot=new THREE.Group();thigh.name=`thigh_${side}`;thigh.position.x=x;calf.name=`calf_${side}`;calf.position.y=-metrics.upperLeg;foot.name=`foot_${side}`;foot.position.y=-metrics.lowerLeg;pelvis.add(thigh);thigh.add(calf);calf.add(foot);
  const arm=new THREE.Group(),lower=new THREE.Group(),hand=new THREE.Group();arm.name=`upperarm_${side}`;arm.position.set(Math.sign(x)*.3,.46,0);lower.name=`lowerarm_${side}`;lower.position.y=-.23;hand.name=`hand_${side}`;hand.position.y=-.2;torso.add(arm);arm.add(lower);lower.add(hand);
 }
 return root;
}
function sample(name,time,strideScale=1){const root=rig(),clip=createOriginalMotions({strideScale}).find(clip=>clip.name===name),mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).play();mixer.setTime(time);root.updateMatrixWorld(true);return root;}
function sole(root,side){const foot=root.getObjectByName(`foot_${side}`);return new THREE.Vector3(0,-metrics.ankleHeight,0).applyMatrix4(foot.matrixWorld);}

test('authored clips contain finite normalized rotations, seamless locomotion loops and no head/spine overrides',()=>{
 const clips=createOriginalMotions();assert.deepEqual(clips.map(clip=>clip.name),['idle','walk','run','jumpStart','jumpAir','land','wave']);
 for(const clip of clips)for(const track of clip.tracks){
  assert.ok([...track.times,...track.values].every(Number.isFinite));assert.ok(!/Head|spine_03|scale/.test(track.name));
  if(track.ValueTypeName==='quaternion')for(let i=0;i<track.values.length;i+=4)assert.ok(Math.abs(Math.hypot(...track.values.slice(i,i+4))-1)<1e-6);
  if(['idle','walk','run','jumpAir'].includes(clip.name)){const width=track.getValueSize();for(let i=0;i<width;i++)assert.ok(Math.abs(track.values[i]-track.values.at(-width+i))<1e-6,clip.name+track.name)}
 }
 assert.ok(2.65/metrics.walkStride<2.1);assert.ok(5.2/metrics.runStride<2.7);
});
test('stance soles remain level at the floor and counter actual forward travel rather than skating',()=>{
 for(const [name,stride,times] of [['walk',metrics.walkStride,[.04,.10,.18,.26,.31]],['run',metrics.runStride,[.03,.08,.13,.18,.21]]]){
  let anchor;
  for(const time of times){const root=sample(name,time),point=sole(root,'l'),direction=new THREE.Vector3(0,1,0).applyQuaternion(root.getObjectByName('foot_l').getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(Math.abs(point.y)<.003,`${name} phase ${time}: ${point.y}`);assert.ok(direction.y>.9999);
   const worldZ=point.z+time*stride;anchor??=worldZ;assert.ok(Math.abs(worldZ-anchor)<.004,`${name}: stance slides`);
  }
 }
 const idle=sample('idle',.4);assert.ok(idle.getObjectByName('calf_l').rotation.x<.4);assert.ok(Math.abs(sole(idle,'l').y)<.001);
});
test('swing clears the ground without kicking the toes downward or producing a large double-foot hover',()=>{
 for(const name of ['walk','run']){
  let bothAir=0,lift=0;
  for(let frame=0;frame<96;frame++){
   const root=sample(name,frame/96),feet=[];
   for(const side of ['l','r']){
    const foot=root.getObjectByName(`foot_${side}`);let lowest=Infinity;
    for(const x of [-.13,.13])for(const z of [-.08,.22])lowest=Math.min(lowest,new THREE.Vector3(x,-metrics.ankleHeight,z).applyMatrix4(foot.matrixWorld).y);
    assert.ok(lowest>-.004,`${name}: foot penetrates floor at ${frame}`);feet.push(lowest);lift=Math.max(lift,lowest);
   }
   bothAir=Math.max(bothAir,Math.min(...feet));
  }
  assert.ok(lift>.06);assert.ok(bothAir<(name==='run'?.055:.03),`${name}: both feet hover ${bothAir}`);
 }
});
test('greeting stays on the right arm, a reduced pose is stable, and authored motion preserves head transforms',()=>{
 const a=rig(),b=rig(),clips=createOriginalMotions(),gait={walkStride:metrics.walkStride,runStride:metrics.runStride,runStart:2.6,runFull:4.2,waveRate:1},motion=createCharacterMotion(a,clips,0,gait),other=createCharacterMotion(b,createOriginalMotions(),0,gait),head=a.getObjectByName('Head').quaternion.clone();
 for(let i=0;i<70;i++){motion.update(1/60,{speed:2.65,y:0,vy:0,waving:true,reduced:false});other.update(1/60,{speed:2.65,y:0,vy:0,waving:false,reduced:false})}
 assert.ok(a.getObjectByName('thigh_l').quaternion.angleTo(b.getObjectByName('thigh_l').quaternion)<1e-6);assert.equal(a.getObjectByName('pelvis').position.y,b.getObjectByName('pelvis').position.y);assert.ok(a.getObjectByName('upperarm_r').quaternion.angleTo(b.getObjectByName('upperarm_r').quaternion)>.3);assert.ok(a.getObjectByName('Head').quaternion.angleTo(head)<1e-6);
 const reduced={speed:0,y:0,vy:0,waving:false,reduced:true};motion.update(0,reduced);const before=a.getObjectByName('foot_l').quaternion.clone(),height=a.getObjectByName('pelvis').position.y;
 for(let i=0;i<60;i++)motion.update(1/60,reduced);assert.ok(a.getObjectByName('foot_l').quaternion.angleTo(before)<1e-6);assert.equal(a.getObjectByName('pelvis').position.y,height);motion.dispose();other.dispose();
});


test('short resident steps keep the same planted sole contact with a scale-matched cadence',()=>{
 const strideScale=.60;
 for(const scale of [.82,.88,.94,1.02]){
  let anchor;
  for(const phase of [.04,.10,.18,.26,.31]){
   const root=sample('walk',phase,strideScale);root.scale.setScalar(scale);root.updateMatrixWorld(true);const point=sole(root,'l'),worldZ=point.z+phase*metrics.walkStride*strideScale*scale;
   anchor??=worldZ;assert.ok(Math.abs(worldZ-anchor)<.004,`resident at scale ${scale}: stance stays planted`);assert.ok(Math.abs(point.y)<.003);
  }
 }
 for(const strideScale of [0,-1,NaN,Infinity,1.1])assert.throws(()=>createOriginalMotions({strideScale}),/stride scale/u);
});
