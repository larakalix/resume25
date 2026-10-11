import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createDuckFood,duckFoodStyle} from '../src/experience/globe/duck-food.ts';
import {normalAt,RADIUS,WATER} from '../src/experience/globe/geography.ts';

test('one reusable crumb draw lands on spherical water and signals one impact per throw',()=>{
 const a=createGlobeArt(new THREE.Scene()),impacts=[],food=createDuckFood(a,(point,time)=>impacts.push({point:point.clone(),time}));
 const shader={vertexShader:THREE.ShaderLib.points.vertexShader,fragmentShader:THREE.ShaderLib.points.fragmentShader,uniforms:{}};food.mesh.material.onBeforeCompile(shader,{});
 const n=normalAt(21,5),to=new THREE.Vector3(n.x,n.y,n.z).multiplyScalar(100),from=to.clone().normalize().multiplyScalar(RADIUS+1).add(new THREE.Vector3(2,0,0)),saved=from.clone(),position=food.mesh.geometry.attributes.position,vector=new THREE.Vector3();
 assert.equal(food.mesh.geometry.drawRange.count,0);assert.equal(a.scene.children.filter(child=>child.isPoints).length,1);
 food.feed(from,to,10,false);assert.equal(food.mesh.geometry.drawRange.count,duckFoodStyle.count);assert.equal(position.count,8);assert.deepEqual(shader.uniforms.crumbFrom.value.toArray(),saved.toArray());
 from.set(0,0,0);assert.deepEqual(shader.uniforms.crumbFrom.value.toArray(),saved.toArray());
 for(let i=0;i<position.count;i++){vector.fromBufferAttribute(position,i);assert.ok(Math.abs(vector.length()-(RADIUS+WATER+duckFoodStyle.waterLift))<.00001)}
 const version=position.version;food.update(10.7,false);assert.equal(impacts.length,0);food.update(10.73,false);assert.equal(impacts.length,1);assert.equal(impacts[0].time,10.73);
 assert.ok(Math.abs(impacts[0].point.length()-(RADIUS+WATER+duckFoodStyle.waterLift))<1e-10);
 food.update(12,false);food.update(15.9,false);assert.equal(impacts.length,1);assert.equal(position.version,version);assert.equal(shader.uniforms.crumbNow.value,15.9);
 food.update(16,false);assert.equal(food.mesh.geometry.drawRange.count,0);
 const geometry=food.mesh.geometry,material=food.mesh.material;food.feed(saved,to,17,false);assert.equal(food.mesh.geometry,geometry);assert.equal(food.mesh.material,material);assert.equal(food.mesh.geometry.drawRange.count,8);
 food.clear();food.update(30,false);assert.equal(impacts.length,1);assert.equal(food.mesh.geometry.drawRange.count,0);
 a.dispose();
});

test('Calm lands immediately, repeated feeding stays bounded, and the art owner releases all resources',()=>{
 const a=createGlobeArt(new THREE.Scene()),impacts=[],food=createDuckFood(a,(point,time)=>impacts.push(time)),to=new THREE.Vector3(0,RADIUS+WATER,0),from=new THREE.Vector3(1,RADIUS+1,1);
 const shader={vertexShader:THREE.ShaderLib.points.vertexShader,fragmentShader:THREE.ShaderLib.points.fragmentShader,uniforms:{}};food.mesh.material.onBeforeCompile(shader,{});
 for(let i=0;i<20;i++){food.feed(from,to,i*10,true);assert.equal(food.mesh.geometry.drawRange.count,8);assert.equal(shader.uniforms.crumbCalm.value,1);assert.equal(impacts.length,i+1);food.update(i*10+1,true);assert.equal(impacts.length,i+1)}
 assert.equal(a.scene.children.filter(child=>child.isPoints).length,1);assert.equal(food.mesh.geometry.attributes.position.count,8);assert.equal(food.mesh.castShadow,false);assert.equal(food.mesh.receiveShadow,false);
 food.clear();food.update(500,true);assert.equal(impacts.length,20);assert.equal(food.mesh.geometry.drawRange.count,0);
 food.feed(new THREE.Vector3(NaN,0,0),to,501,false);assert.equal(food.mesh.geometry.drawRange.count,0);
 let releases=0;food.mesh.geometry.addEventListener('dispose',()=>releases++);food.mesh.material.addEventListener('dispose',()=>releases++);a.dispose();assert.equal(releases,2);
});

test('food waits through a long approach and feeding, then fades without jumping to the real clock',()=>{
 const a=createGlobeArt(new THREE.Scene()),impacts=[],food=createDuckFood(a,(point,time)=>impacts.push(time)),from=new THREE.Vector3(1,RADIUS+1,1),to=new THREE.Vector3(0,RADIUS+WATER,0);
 const shader={vertexShader:THREE.ShaderLib.points.vertexShader,fragmentShader:THREE.ShaderLib.points.fragmentShader,uniforms:{}};food.mesh.material.onBeforeCompile(shader,{});
 food.feed(from,to,10,false);food.update(11,false,true);assert.deepEqual(impacts,[11]);food.update(15,false,true);food.update(30,false,true);
 assert.equal(food.mesh.geometry.drawRange.count,8);assert.ok(Math.abs(shader.uniforms.crumbNow.value-13.2)<1e-10);assert.deepEqual(impacts,[11]);
 food.update(30.5,false,false);assert.ok(Math.abs(shader.uniforms.crumbNow.value-13.7)<1e-10);assert.equal(food.mesh.geometry.drawRange.count,8);
 food.update(33,false,false);assert.equal(food.mesh.geometry.drawRange.count,0);
 food.feed(from,to,40,false);assert.equal(shader.uniforms.crumbNow.value,40);assert.equal(food.mesh.geometry.drawRange.count,8);food.update(41,false,true);assert.deepEqual(impacts,[11,41]);
 food.clear();food.update(100,false,true);assert.equal(food.mesh.geometry.drawRange.count,0);assert.deepEqual(impacts,[11,41]);a.dispose();
});
