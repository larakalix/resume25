import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Box3,PerspectiveCamera,Ray,Vector3} from 'three';
import {createInteriorCameraClearance} from '../src/experience/globe/interior-camera.ts';
import {roomLabels} from '../src/experience/globe/rooms.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
const up=new Vector3(0,1,0),heights=[.04,1.1,2.8];
const wall=(a,b)=>new Box3(new Vector3(...a),new Vector3(...b));
// Authored room dimensions, independently taken from the room shell builders.
function walls(room){
 if(room.includes('cave'))return[wall([-4.7,0,-4.7],[-2.8,3.5,4.7]),wall([2.8,0,-4.7],[4.7,3.5,4.7]),wall([-4.7,0,-4.7],[4.7,3.5,-2.8])];
 const rear=wall([-4.2,0,-4.15],[4.2,3.1,-3.95]);
 return room==='home-balcony'?[rear,wall([-3.96,0,-4],[-3.84,1.1,4]),wall([3.84,0,-4],[3.96,1.1,4]),wall([-3.96,0,3.84],[3.96,1.1,4])]:[rear,wall([-4.2,0,-4.2],[-4,3.1,4.2]),wall([4,0,-4.2],[4.2,3.1,4.2])];
}
function shot(player,small,yaw,pitch,zoom){const target=new Vector3(player.x*.6,.85,player.z*.6),position=new Vector3(target.x+(small?1:3),small?8.3:6.2,target.z+(small?12.5:8.4)),offset=position.clone().sub(target).applyAxisAngle(up,yaw).multiplyScalar(zoom);offset.y=Math.max(3,offset.y+pitch*7);position.copy(target).add(offset);return{position,target}}
function blocked(room,position,player){return heights.some(height=>{const point=player.clone().addScaledVector(up,height),delta=point.clone().sub(position),ray=new Ray(position,delta.clone().normalize());return walls(room).some(box=>{const hit=ray.intersectBox(box,new Vector3());return hit&&hit.distanceTo(position)<delta.length()-.02})})}
function visible(position,target,player,small){const camera=new PerspectiveCamera(small?56:50,small?375/812:1.5,.14,100);camera.position.copy(position);camera.up.copy(up);camera.lookAt(target);camera.updateMatrixWorld();for(const height of heights){const p=player.clone().addScaledVector(up,height).project(camera);assert.ok(Math.abs(p.x)<.91&&Math.abs(p.y)<.91&&p.z>-1&&p.z<1,`${p.toArray()}`)}}

test('the original side-wall orbit failure is corrected while a comfortable unobstructed room view stays identical',()=>{
 const clear=createInteriorCameraClearance(),player=new Vector3(),bad=shot(player,false,.8,-.3,1);assert.ok(blocked('library',bad.position,player));assert.ok(clear('library',bad.position,bad.target,player));assert.equal(blocked('library',bad.position,player),false);visible(bad.position,bad.target,player,false);
 const good=shot(player,false,0,0,1),original={position:good.position.clone(),target:good.target.clone()};assert.equal(clear('library',good.position,good.target,player),false);assert.deepEqual(good.position,original.position);assert.deepEqual(good.target,original.target);
});

test('every room keeps feet, body and seasonal-hat height visible across orbit/zoom extremes and side-wall approaches',()=>{
 const clear=createInteriorCameraClearance();let checks=0;
 for(const room of Object.keys(roomLabels))for(const small of [false,true])for(const point of [{x:0,z:0},{x:3.4,z:.1},{x:-3.4,z:-1},{x:3.4,z:3.5},{x:0,z:3.5},{x:2.35,z:-1}]){
  if(!roomWalkable(room,point))continue;const player=new Vector3(point.x,0,point.z);
  for(const yaw of [-.8,0,.8])for(const pitch of [-.3,0,.5])for(const zoom of [.8,1.5]){
   const {position,target}=shot(player,small,yaw,pitch,zoom);clear(room,position,target,player,{fov:small?56:50,aspect:small?375/812:1.5});assert.equal(blocked(room,position,player),false,`${room} ${small} ${JSON.stringify(point)} ${yaw}/${pitch}/${zoom}`);visible(position,target,player,small);assert.ok(position.y<20,'local correction must not turn rooms into distant overhead maps');assert.ok(position.distanceTo(player)<40);checks++;
  }
 }
 assert.ok(checks>1000);
});

test('a near-front balcony visitor is kept above the rail by a local pull-in without moving the player',()=>{
 const clear=createInteriorCameraClearance(),player=new Vector3(2,0,3.5),before=player.clone(),{position,target}=shot(player,false,.8,-.3,1.5);clear('home-balcony',position,target,player);assert.equal(blocked('home-balcony',position,player),false);assert.ok(position.y<10);assert.ok(position.z<7);assert.deepEqual(player,before);visible(position,target,player,false);
});

test('corrected sightlines also clear the actual rendered room-shell meshes, including cave rocks and balcony rails',async()=>{
 const {createInterior}=await import('../src/experience/globe/interiors.ts'),{createCaveInterior}=await import('../src/experience/globe/cave-interior.ts'),{Raycaster}=await import('three');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}});
 try{
  const clear=createInteriorCameraClearance(),caster=new Raycaster();let checks=0;
  for(const room of Object.keys(roomLabels)){
   const built=room.includes('cave')?createCaveInterior(room):createInterior(room);built.scene.updateMatrixWorld(true);
   try{
    const staticMeshes=built.scene.children.filter(object=>object.isMesh&&!object.isSkinnedMesh);
    for(const point of [{x:0,z:0},{x:3.4,z:.1},{x:0,z:3.5}]){
     if(!roomWalkable(room,point))continue;const player=new Vector3(point.x,0,point.z);
     for(const [yaw,pitch] of [[.8,-.3],[-.8,-.3]]){
      const {position,target}=shot(player,false,yaw,pitch,1.5);clear(room,position,target,player);
      for(const height of heights){
       const to=player.clone().addScaledVector(up,height),delta=to.clone().sub(position);caster.set(position,delta.clone().normalize());caster.near=.01;caster.far=delta.length()-.02;
       const hits=caster.intersectObjects(staticMeshes,false).filter(({point:p})=>room.includes('cave')?Math.abs(p.x)>2.79||p.z<-2.79:room==='home-balcony'?p.z<-3.949||p.y<1.101&&(Math.abs(p.x)>3.839||p.z>3.839):Math.abs(p.x)>3.999||p.z<-3.949);
       assert.equal(hits.length,0,`${room} ${JSON.stringify(point)} ${yaw} ${height}: rendered shell obstructs the player`);checks++;
      }
     }
    }
   }finally{built.dispose()}
  }
  assert.ok(checks>100);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document}
});
