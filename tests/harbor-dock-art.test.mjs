import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildHarborDock} from '../src/experience/globe/harbor-dock-art.ts';
import {harbor,harborHeight,harborRails,shipBasis} from '../src/experience/globe/harbor.ts';
import {mapAt,RADIUS,WATER} from '../src/experience/globe/terrain.ts';

function build(){
 const a=createGlobeArt(new THREE.Scene()),labels=[];
 a.sign=(text,p,width,parent)=>{labels.push(text);const marker=new THREE.Object3D();marker.position.set(...p);parent.add(marker);return marker};
 return{a,labels,...buildHarborDock(a)};
}

test('the large marina deck matches its walk plane, with deep supports and rails on the shared collision bands',()=>{
 const {a,group,labels}=build(),planks=[],piles=[],ropes=[];a.scene.updateMatrixWorld(true);
 group.traverse(part=>{if(part.name==='harbor-plank')planks.push(part);if(part.name==='harbor-pile')piles.push(part);if(part.name==='harbor-rope-rail')ropes.push(part)});
 assert.ok(planks.length>=40);assert.ok(piles.length>=20);assert.deepEqual(labels,['Harbor']);
 for(const plank of planks)for(const x of [-.499,.499])for(const z of [-.499,.499]){
  const top=new THREE.Vector3(x,.5,z).applyMatrix4(plank.matrixWorld),point=mapAt(top.clone().normalize()),height=harborHeight(point);
  assert.notEqual(height,null);assert.ok(Math.abs(top.length()-RADIUS-height)<1e-8,'each rendered board top supports the published player height');
 }
 for(const pile of piles){const bottom=new THREE.Vector3(0,-.5,0).applyMatrix4(pile.matrixWorld);assert.ok(bottom.length()-RADIUS<WATER-.5,'structural piles extend below the water surface')}
 for(const [index,rail] of harborRails.entries()){
  const pieces=ropes.filter(part=>part.userData.rail===index);assert.ok(pieces.length>=2);
  for(const piece of pieces){piece.geometry.computeBoundingBox();const bounds=piece.geometry.boundingBox;assert.ok(bounds.min.x>=rail.x0-1e-5&&bounds.max.x<=rail.x1+1e-5);assert.ok(bounds.min.z>=rail.z0-1e-5&&bounds.max.z<=rail.z1+1e-5)}
 }
 a.dispose();
});

test('mooring lines meet the shared ship berth basis and details stay within a small geometry budget',()=>{
 const {a,group}=build(),moorings=[],rings=[],world=new THREE.Vector3();let triangles=0;
 a.scene.updateMatrixWorld(true);group.traverse(part=>{if(part.name==='harbor-mooring')moorings.push(part);if(part.name==='harbor-life-ring')rings.push(part);if(part.isMesh){triangles+=(part.geometry.index?.count??part.geometry.attributes.position.count)/3*(part.isInstancedMesh?part.count:1);assert.ok([...part.geometry.attributes.position.array].every(Number.isFinite))}});
 assert.equal(moorings.length,2);assert.equal(rings.length,2);assert.ok(triangles<20000,`${triangles} triangles`);
 for(const [i,rope] of moorings.entries()){
  world.copy(rope.geometry.parameters.path.getPoint(1)).applyMatrix4(group.matrixWorld);
  const expected=new THREE.Vector3(shipBasis.up.x,shipBasis.up.y,shipBasis.up.z).multiplyScalar(RADIUS+WATER+.95).addScaledVector(new THREE.Vector3(shipBasis.east.x,shipBasis.east.y,shipBasis.east.z),i===0?-4:4).addScaledVector(new THREE.Vector3(shipBasis.south.x,shipBasis.south.y,shipBasis.south.z),1.8);
  assert.ok(world.distanceTo(expected)<1e-8,'mooring follows the real ship berth, including its spherical frame');
 }
 assert.equal(group.name,'harbor-dock');assert.equal(group.position.length(),RADIUS+harbor.level);a.dispose();
});

test('night globes share one draw, the bell responds only to actions, and all resources remain art-owned',()=>{
 const {a,bell,lamps,update}=build(),geometryCount=a.kit.geometries.length,materialCount=a.kit.extras.length,version=lamps.instanceMatrix.version;
 assert.equal(lamps.count,4);assert.ok(a.kit.instances.includes(lamps));update(100,false,1,0);assert.equal(bell.rotation.z,0);const day=lamps.material.emissiveIntensity;
 update(101,false,0,0);assert.ok(lamps.material.emissiveIntensity>day*10);assert.equal(bell.rotation.z,0);
 update(102,false,0,1);update(102.12,false,0,1);assert.ok(Math.abs(bell.rotation.z)>.05);update(105,false,0,1);assert.equal(bell.rotation.z,0);
 update(106,true,0,2);update(106.1,true,0,2);assert.equal(bell.rotation.z,0);update(107,false,1,0);assert.equal(bell.rotation.z,0,'Reset clears a previous ring');
 assert.equal(lamps.instanceMatrix.version,version);assert.equal(a.kit.geometries.length,geometryCount);assert.equal(a.kit.extras.length,materialCount);
 const batch=a.finish();assert.equal(batch.meshes.length,1);assert.equal(a.kit.staticMeshes.length,0,'all fixed dock furniture joins the static scene batch');
 const owned=[...new Set([...a.kit.geometries,...a.kit.extras])];let releases=0;owned.forEach(value=>value.addEventListener('dispose',()=>releases++));a.dispose();assert.equal(releases,owned.length);
});
