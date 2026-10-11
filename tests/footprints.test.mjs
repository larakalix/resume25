import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createBootprintGeometry,createFootprints,footprintFade,footprintStyle,isFootprintSand} from '../src/experience/globe/footprints.ts';
import {RADIUS,terrainHeight,normalAt} from '../src/experience/globe/geography.ts';

test('surface classification allows dry paths and beaches but rejects grass, water, stone and buildings',()=>{
 assert.equal(isFootprintSand({x:0,z:18}),true);
 assert.equal(isFootprintSand({x:0,z:56.1}),true);
 for(const point of [{x:4,z:21},{x:21,z:5},{x:0,z:-4},{x:0,z:39.5},{x:-9,z:6},{x:NaN,z:18},{x:0,z:Infinity}])assert.equal(isFootprintSand(point),false,JSON.stringify(point));
 const water={x:21,z:5};assert.ok(terrainHeight(normalAt(water.x,water.z))<-.28);
});

test('the original split sole has a feathered perimeter and a small finite triangle budget',()=>{
 const geometry=createBootprintGeometry(),position=geometry.attributes.position,edge=geometry.attributes.footprintEdge;
 assert.ok(geometry.index.count/3<=60);assert.ok([...position.array,...geometry.attributes.normal.array].every(Number.isFinite));
 assert.ok([...edge.array].includes(0)&&[...edge.array].includes(1));
 let toe=false,heel=false;for(let i=0;i<position.count;i++){toe ||= position.getZ(i)>.2;heel ||= position.getZ(i)<-.18;assert.ok(position.getY(i)<=0&&position.getY(i)>-.001)}
 assert.ok(toe&&heel);geometry.dispose();
});

test('alternating boot impressions preserve physical spacing, direction and ground contact on steep shores',()=>{
 const a=createGlobeArt(new THREE.Scene()),footprints=createFootprints(a),matrix=new THREE.Matrix4(),vertex=new THREE.Vector3(),first=new THREE.Vector3(),second=new THREE.Vector3();
 // The south coast is a polar trail; the wider sea moves the steep eastern beach inland.
 assert.equal(isFootprintSand({x:48.5,z:-16}),false,'the former beach is now open water');
 for(const [x,z,yaw,left] of [[0,18,0,true],[0,18,0,false],[44,-16,Math.PI/2,true],[43.9,-16,0,true],[43.9,-16,0,false],[-10,56.1,Math.PI/2,true]]){
  assert.equal(footprints.stamp({x,z},yaw,left,0),true,`${x},${z} ${yaw} ${left}`);
  const slot=footprints.mesh.count-1;footprints.mesh.getMatrixAt(slot,matrix);assert.ok(Math.abs(matrix.determinant()-1)<1e-5);
  const p=footprints.mesh.geometry.attributes.position,side=footprints.mesh.geometry.attributes.footprintLife.getY(slot);
  assert.equal(side,left?-1:1);
  for(let i=0;i<p.count;i++){
   vertex.fromBufferAttribute(p,i);vertex.x*=side;vertex.applyMatrix4(matrix);
   const height=vertex.length()-RADIUS,ground=terrainHeight(vertex.clone().normalize());
   assert.ok(height-ground>.015&&height-ground<.04,`ground contact gap ${height-ground}`);
  }
 }
 footprints.mesh.getMatrixAt(0,matrix);first.setFromMatrixPosition(matrix);footprints.mesh.getMatrixAt(1,matrix);second.setFromMatrixPosition(matrix);
 assert.ok(Math.abs(first.distanceTo(second)-footprintStyle.footOffset*2)<.002);
 const forward=new THREE.Vector3().setFromMatrixColumn(matrix,2),south=new THREE.Vector3(-Math.sin(0)*Math.sin(18/RADIUS),-Math.cos(0)*Math.sin(18/RADIUS),Math.cos(18/RADIUS));
 assert.ok(forward.dot(south)>.99);a.dispose();
});

test('the fixed pool ages without instance uploads and can be cleared and reused without stale marks',()=>{
 const a=createGlobeArt(new THREE.Scene()),footprints=createFootprints(a),mesh=footprints.mesh,life=mesh.geometry.attributes.footprintLife;
 assert.equal(a.scene.children.filter(value=>value.isInstancedMesh).length,1);assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);assert.equal(mesh.material.blending,THREE.MultiplyBlending);assert.equal(mesh.material.premultipliedAlpha,true);
 assert.equal(footprints.count,0);assert.equal(footprints.stamp({x:0,z:18},0,true,0),true);assert.equal(footprints.count,1);
 const shader={vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader,uniforms:{}};mesh.material.onBeforeCompile(shader,{});
 const instanceVersion=mesh.instanceMatrix.version,lifeVersion=life.version;
 footprints.update(5);assert.equal(footprints.count,1);assert.equal(footprintFade(5),1);
 footprints.update(6.5);assert.equal(shader.uniforms.footprintNow.value,6.5);assert.equal(footprintFade(6.5),.5);
 footprints.update(8);assert.equal(footprints.count,0);assert.equal(footprintFade(8),0);
 assert.equal(mesh.instanceMatrix.version,instanceVersion);assert.equal(life.version,lifeVersion);
 footprints.clear();assert.equal(mesh.count,0);assert.equal(footprints.count,0);
 for(let i=0;i<footprintStyle.capacity+30;i++)assert.equal(footprints.stamp({x:0,z:18},.2,i%2===0,i*.02),true);
 assert.equal(mesh.count,footprintStyle.capacity);assert.equal(footprints.count,footprintStyle.capacity);assert.equal(mesh.instanceMatrix.count,footprintStyle.capacity);
 footprints.update(11);assert.equal(footprints.count,0);footprints.clear();footprints.update(1);assert.equal(footprints.count,0);
 assert.equal(footprints.stamp({x:4,z:21},0,true,1),false);assert.equal(footprints.stamp({x:0,z:18},NaN,true,1),false);assert.equal(mesh.count,0);
 assert.equal(footprints.stamp({x:0,z:18},0,false,1),true);assert.equal(mesh.count,1);assert.equal(footprints.count,1);
 let released=0;for(const owned of [mesh,mesh.geometry,mesh.material])owned.addEventListener('dispose',()=>released++);a.dispose();assert.equal(released,3);
});
