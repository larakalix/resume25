import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createWildlife} from '../src/experience/globe/wildlife.ts';

test('ducks rest without time-driven spinning, paddle below water when swimming, and dip their bill to feed',()=>{
 const a=createGlobeArt(new THREE.Scene()),duck=createWildlife(a.kit,'duck'),body=duck.avatar.getObjectByName('duck-body'),head=duck.avatar.getObjectByName('duck-head'),neck=duck.avatar.getObjectByName('duck-neck'),tail=duck.avatar.getObjectByName('duck-tail'),feet=[0,1].map(i=>duck.avatar.getObjectByName(`duck-foot-${i}`));
 duck.avatar.position.y=.12;duck.avatar.scale.setScalar(.78);
 duck.update(1,10,false,{speed:0,bob:0,peck:0});const resting=duck.avatar.toJSON();duck.update(1,100,false,{speed:0,bob:0,peck:0});assert.deepEqual(duck.avatar.toJSON(),resting);assert.equal(tail.rotation.y,0);assert.equal(head.rotation.z,0);
 duck.update(.25,101,false,{speed:.55,bob:.015,peck:0});assert.ok(Math.abs(feet[0].rotation.x)>0);assert.ok(Math.abs(feet[0].rotation.x+feet[1].rotation.x)<1e-10);assert.ok(Math.abs(body.rotation.z)<.01);assert.equal(duck.avatar.rotation.y,0);
 duck.avatar.updateMatrixWorld(true);for(const foot of feet){const center=foot.localToWorld(new THREE.Vector3(0,-.12,.035));assert.ok(center.y<0,'paddles remain submerged')}
 duck.update(.1,102,false,{speed:0,bob:0,peck:1});duck.avatar.updateMatrixWorld(true);const bill=head.localToWorld(new THREE.Vector3(0,-.065,.17));assert.ok(Math.abs(bill.y)<.03,`bill reaches water: ${bill.y}`);assert.equal(neck.rotation.x,1.15);
 duck.update(.1,103,true,{speed:.55,bob:.03,peck:.4});assert.equal(body.position.y,-.24);assert.equal(body.rotation.x,0);assert.equal(body.rotation.z,0);for(const foot of feet){assert.equal(foot.rotation.x,0);assert.equal(foot.rotation.y,0)}
 const calm=duck.avatar.toJSON();duck.update(1,203,true,{speed:.55,bob:-.03,peck:.4});assert.deepEqual(duck.avatar.toJSON(),calm);a.dispose();
});

test('fox and rabbit gait and reactions preserve their existing behavior',()=>{
 const a=createGlobeArt(new THREE.Scene());
 for(const species of ['fox','rabbit']){
  const animal=createWildlife(a.kit,species),body=animal.avatar.getObjectByName(`${species}-body`),head=animal.avatar.getObjectByName(`${species}-head`),tail=animal.avatar.getObjectByName(`${species}-tail`),foot=animal.avatar.getObjectByName(`${species}-foot-0`);
  animal.update(.1,2,false,{speed:.5});assert.ok(Math.abs(foot.rotation.x-Math.sin(.35)*.25)<1e-12);assert.ok(Math.abs(body.position.y-Math.abs(Math.sin(.35))*(species==='rabbit'?.12:.025))<1e-12);assert.equal(head.rotation.z,.04);assert.equal(tail.rotation.y,Math.sin(10)*.2);
  animal.update(.1,3,true,{speed:.5},true);assert.equal(foot.rotation.x,0);assert.equal(body.position.y,0);assert.equal(head.rotation.z,0);assert.equal(tail.rotation.y,0);
 }
 a.dispose();
});
