import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {cruiseProfile,cruiseHullGeometry,createCruiseShip} from '../src/experience/globe/cruise-ship.ts';
import {shipBasis} from '../src/experience/globe/harbor.ts';
import {mapAt,normalAt,terrainHeight,RADIUS,WATER} from '../src/experience/globe/terrain.ts';

test('the original cruise hull is closed, finite, full-beamed and has a raked bow with a rounder stern',()=>{
 const geometry=cruiseHullGeometry(),p=geometry.attributes.position,edges=new Map();
 assert.ok([...p.array,...geometry.attributes.normal.array].every(Number.isFinite));geometry.computeBoundingBox();const bounds=geometry.boundingBox;
 assert.ok(Math.abs(bounds.max.x-bounds.min.x-cruiseProfile.length)<1e-5);assert.ok(Math.abs(bounds.max.z-bounds.min.z-cruiseProfile.beam)<1e-5);assert.ok(Math.abs(bounds.min.y+cruiseProfile.draft)<1e-6);assert.ok(Math.abs(bounds.max.y-cruiseProfile.freeboard)<1e-6);
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(value=>Math.round(value*1e5)).join(',');
 for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++){const edge=[key(i+j),key(i+(j+1)%3)].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1)}for(const count of edges.values())assert.equal(count,2,'every welded hull edge is closed');
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material),ray=new THREE.Raycaster();mesh.updateMatrixWorld();
 ray.set(new THREE.Vector3(10,.8,0),new THREE.Vector3(-1,0,0));const upperBow=ray.intersectObject(mesh)[0].point.x;ray.set(new THREE.Vector3(10,-.6,0),new THREE.Vector3(-1,0,0));const keelBow=ray.intersectObject(mesh)[0].point.x;assert.ok(upperBow-keelBow>.2,'the bow slopes back beneath the waterline');
 ray.set(new THREE.Vector3(6,.7,10),new THREE.Vector3(0,0,-1));const bowWidth=ray.intersectObject(mesh)[0].point.z;ray.set(new THREE.Vector3(-6,.7,10),new THREE.Vector3(0,0,-1));const sternWidth=ray.intersectObject(mesh)[0].point.z;assert.ok(sternWidth>bowWidth+.4,'the rounded stern is fuller than the pointed bow');geometry.dispose();material.dispose();
});

test('the complete liner has stepped decks and window rows in two draws with bounded geometry and no world-static baking',()=>{
 const a=createGlobeArt(new THREE.Scene()),ship=createCruiseShip(a),meshes=[];ship.root.traverse(value=>{if(value instanceof THREE.Mesh)meshes.push(value)});
 assert.equal(meshes.length,2);assert.ok(ship.windows instanceof THREE.InstancedMesh);assert.ok(ship.windows.count>=70&&ship.windows.count<140);assert.ok(a.kit.instances.includes(ship.windows));assert.equal(a.kit.staticMeshes.length,0);
 const geometry=ship.geometry;assert.ok([...geometry.attributes.position.array,...geometry.attributes.normal.array,...geometry.attributes.color.array].every(Number.isFinite));geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.y>=4.4&&geometry.boundingBox.max.y<4.6);
 const triangles=geometry.attributes.position.count/3+ship.windows.count*12;assert.ok(triangles<13500,'the liner stays below a modest triangle budget, including repeated windows');assert.ok(geometry.attributes.position.array.byteLength+geometry.attributes.normal.array.byteLength+geometry.attributes.color.array.byteLength<1_400_000);
 const before=meshes.map(value=>value.parent),batch=a.finish();assert.equal(batch.meshes.length,0);assert.deepEqual(meshes.map(value=>value.parent),before,'the global static bake does not detach the ship parts');a.dispose();
});

test('the real keel stays submerged against curved water and clear of the seabed through the full gentle bob',()=>{
 const a=createGlobeArt(new THREE.Scene()),ship=createCruiseShip(a),geometry=cruiseHullGeometry(),p=geometry.attributes.position;
 assert.ok(Math.abs(ship.root.position.length()-RADIUS-WATER)<1e-10);const east=new THREE.Vector3(1,0,0).applyQuaternion(ship.root.quaternion);assert.ok(east.dot(new THREE.Vector3(shipBasis.east.x,shipBasis.east.y,shipBasis.east.z))>1-1e-10,'the ship stays parallel to its berth');
 for(const time of [0,1,3,5,8,13]){
  ship.update(time,false,1);ship.root.updateWorldMatrix(true,true);
  for(let i=0;i<p.count;i++){
   const local=new THREE.Vector3().fromBufferAttribute(p,i),world=local.clone().applyMatrix4(ship.body.matrixWorld),point=mapAt(world.clone().normalize()),level=world.length()-RADIUS;
   assert.ok(level-terrainHeight(normalAt(point.x,point.z))>.07,'the hull does not ground on the inner berth');
   if(Math.abs(local.y+cruiseProfile.draft)<1e-5){assert.ok(level<WATER-.20,'even the tapered keel tips stay visibly in the curved water');if(Math.abs(local.x)>5.5)assert.ok(WATER-level<.4,'the tips taper to a shallow physical draft')}
  }
 }
 geometry.dispose();a.dispose();
});

test('reduced motion restores a neutral pose, night windows glow and the artist owns every ship resource',()=>{
 const a=createGlobeArt(new THREE.Scene()),ship=createCruiseShip(a),material=ship.windows.material,counts=[a.kit.geometries.length,a.kit.extras.length,a.kit.instances.length],matrices=ship.windows.instanceMatrix.array.slice();
 for(let i=0;i<180;i++){ship.update(i/12,false,1);assert.ok(Math.abs(ship.body.position.y)<=.035);assert.ok(Math.abs(ship.body.rotation.x)<=.004)}
 assert.ok(Math.abs(ship.body.position.y)>.001);ship.update(30,true,0);assert.equal(ship.body.position.y,0);assert.equal(ship.body.rotation.x,0);assert.ok(material.emissiveIntensity>.8);ship.update(31,true,1);assert.equal(material.emissiveIntensity,0);
 assert.deepEqual([a.kit.geometries.length,a.kit.extras.length,a.kit.instances.length],counts);assert.deepEqual(ship.windows.instanceMatrix.array,matrices,'ambient motion transforms the whole ship rather than rewriting every window');
 const resources=[ship.geometry,ship.windows.geometry,material,ship.body.children[0].material,ship.windows],released=new Map();resources.forEach(resource=>{released.set(resource,0);resource.addEventListener('dispose',()=>released.set(resource,released.get(resource)+1))});a.dispose();for(const count of released.values())assert.equal(count,1);
});
