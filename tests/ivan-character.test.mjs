import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createArtKit} from '../src/experience/explorer/art-kit.ts';
import {createStreetCharacter} from '../src/experience/street/character.ts';
import {createIvanCharacter} from '../src/experience/globe/ivan-character.ts';

function colors(mesh){const attribute=mesh.geometry.getAttribute('color'),values=[];for(let i=0;i<attribute.count;i++)values.push(new THREE.Color().fromBufferAttribute(attribute,i));return values;}
function hasColor(values,hex){const expected=new THREE.Color(hex);return values.some(color=>Math.abs(color.r-expected.r)+Math.abs(color.g-expected.g)+Math.abs(color.b-expected.b)<1e-5);}
function localMesh(character,name){return character.avatar.getObjectByName(name).children.find(child=>child.isMesh);}

test('portrait host has cloth stripes and a close beard, with no shirt texture or mutation of the shared palette',()=>{
 const scene=new THREE.Scene(),kit=createArtKit(scene,{shading:'soft'}),before=Object.fromEntries(Object.entries(kit.materials).map(([key,material])=>[key,material.color.getHex()])),ivan=createIvanCharacter(kit),torso=localMesh(ivan,'spine_03'),head=localMesh(ivan,'Head');
 assert.equal(ivan.avatar.name,'Ivan');assert.equal(ivan.source,'original');
 assert.ok(hasColor(colors(torso),0x85bdd8),'sky-blue cloth');assert.ok(hasColor(colors(torso),0xf6f2df),'warm-white cloth');assert.ok(hasColor(colors(head),0x745b48),'trimmed beard');assert.ok(hasColor(colors(head),0x35322f),'dark cropped hair');
 torso.geometry.computeBoundingBox();assert.ok(torso.geometry.boundingBox.min.z>-.24,'shirt has no projecting backpack');
 ivan.avatar.traverse(child=>{if(child.isMesh){assert.ok(child.geometry.getAttribute('position').array.every(Number.isFinite));assert.equal(child.material.map,null);}});
 assert.deepEqual(Object.fromEntries(Object.entries(kit.materials).map(([key,material])=>[key,material.color.getHex()])),before);
 const original=createStreetCharacter(kit,true);assert.equal(original.avatar.name,'Mira');assert.ok(!hasColor(colors(localMesh(original,'Head')),0x745b48),'existing cast keeps its appearance');
 ivan.dispose();original.dispose();kit.dispose();assert.equal(scene.children.length,0);
});

test('portrait shares the floor-safe locomotion, waving rig and stable reduced-motion pose',()=>{
 const scene=new THREE.Scene(),kit=createArtKit(scene,{shading:'soft'}),ivan=createIvanCharacter(kit);
 assert.deepEqual(ivan.clips.map(clip=>clip.name),['idle','walk','run','jumpStart','jumpAir','land','wave']);
 const right=ivan.avatar.getObjectByName('upperarm_r'),left=ivan.avatar.getObjectByName('upperarm_l');
 for(let i=0;i<50;i++){ivan.motion.update(1/60,{speed:.7,y:0,vy:0,waving:true,reduced:false});ivan.express(1/60,false);}
 assert.ok(right.quaternion.angleTo(left.quaternion)>.3,'greeting animates one arm');
 const reduced={speed:0,y:0,vy:0,waving:false,reduced:true};ivan.motion.update(0,reduced);ivan.express(0,true);const before=right.quaternion.clone();
 for(let i=0;i<90;i++){ivan.motion.update(1/60,reduced);ivan.express(1/60,true);}
 assert.ok(before.angleTo(right.quaternion)<1e-6);assert.equal(ivan.avatar.getObjectByName('eye_-1').scale.y,.78);
 ivan.avatar.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(ivan.avatar);assert.ok(bounds.min.y>-.01&&bounds.max.y<2.1);assert.ok(bounds.max.x-bounds.min.x<1.1);
 ivan.dispose();kit.dispose();
});
