import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {harborBasis,harborWorldPoint,shipBasis,shipPosition} from '../src/experience/globe/harbor.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {WATER} from '../src/experience/globe/terrain.ts';
import {createHarborCamera} from '../src/experience/globe/harbor-camera.ts';
import {MeshBVH} from 'three-mesh-bvh';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildHarborDock} from '../src/experience/globe/harbor-dock-art.ts';
import {createCruiseShip} from '../src/experience/globe/cruise-ship.ts';
import {createCameraClearance} from '../src/experience/globe/camera-clearance.ts';

function dockCamera(){
 const art=createGlobeArt(new THREE.Scene());art.sign=()=>new THREE.Object3D();buildHarborDock(art);
 const clear=createCameraClearance(new MeshBVH(art.finish().meshes[0].geometry)),cruise=createCruiseShip(art),ship=cruise.root.localToWorld(new THREE.Vector3(0,2,0));
 return{art,clear,ship,frame:createHarborCamera(),up:new THREE.Vector3(harborBasis.up.x,harborBasis.up.y,harborBasis.up.z)};
}

test('the ship composition target below the pier never pulls a clear camera into the deck',()=>{
 const f=dockCamera();
 try{for(const small of [false,true])for(const x of [3,8]){
  const p=harborWorldPoint(x,0),feet=new THREE.Vector3(p.x,p.y,p.z),position=new THREE.Vector3(),target=new THREE.Vector3();f.frame(feet,f.ship,small,position,target);const original=position.clone();
  f.clear(target,position,feet,f.up);assert.ok(position.distanceTo(original)<1e-8,`clear ${small?'portrait':'desktop'} pier ${x} should retain its framing`);
 }}finally{f.art.dispose()}
});

test('approaching the dock rail keeps a comfortable camera distance and the whole character visible',()=>{
 const f=dockCamera();
 try{for(const small of [false,true]){
  const p=harborWorldPoint(9.1,3.9),feet=new THREE.Vector3(p.x,p.y,p.z),position=new THREE.Vector3(),target=new THREE.Vector3();f.frame(feet,f.ship,small,position,target);const distance=position.distanceTo(target);
  f.clear(target,position,feet,f.up);assert.ok(position.distanceTo(target)>=distance*.65,'nearby fixtures must not collapse the follow distance');assert.ok(position.clone().sub(feet).dot(f.up)>=6,'the camera must stay above the dock');
  const camera=new THREE.PerspectiveCamera(small?56:50,small?375/812:1440/960,.14,420);camera.position.copy(position);camera.up.copy(f.up);camera.lookAt(target);camera.updateMatrixWorld();
  for(const height of [0,2.8]){const point=feet.clone().addScaledVector(f.up,height).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1,'the character stays in frame')}
 }}finally{f.art.dispose()}
});

test('the harbor view keeps Ivan and the whole cruise silhouette visible on desktop and portrait',()=>{
 const vector=p=>new THREE.Vector3(p.x,p.y,p.z),ship=new THREE.Vector3().setFromMatrixPosition(frameAt(shipPosition.x,shipPosition.z,WATER)),east=vector(shipBasis.east),up=vector(shipBasis.up),south=vector(shipBasis.south),frame=createHarborCamera(),position=new THREE.Vector3(),target=new THREE.Vector3();
 for(const {small,fov,aspect} of [{small:false,fov:50,aspect:1440/960},{small:true,fov:56,aspect:375/812},{small:true,fov:50,aspect:768/1024}])for(const [x,z] of [[8,0],[8.6,3],[-2,0],[8,-3]]){
  const hero=vector(harborWorldPoint(x,z));frame(hero,ship.clone().addScaledVector(up,2),small,position,target);
  const camera=new THREE.PerspectiveCamera(fov,aspect,.14,420);camera.position.copy(position);camera.up.copy(vector(harborBasis.up));camera.lookAt(target);camera.updateMatrixWorld();
  const visible=p=>{const q=p.project(camera);assert.ok(q.z>-1&&q.z<1);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,`${small?'portrait':'desktop'} pier${x},${z}: ${q.toArray()}`)};
  for(const height of [0,2.8])visible(hero.clone().addScaledVector(vector(harborBasis.up),height));
  for(const length of [-6.5,6.5])for(const height of [0,4.5])for(const beam of [-1.9,1.9])visible(ship.clone().addScaledVector(east,length).addScaledVector(up,height).addScaledVector(south,beam));
 }
});
