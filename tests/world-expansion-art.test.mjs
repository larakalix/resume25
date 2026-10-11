import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildWorldExpansion} from '../src/experience/globe/world-expansion-art.ts';
import {expansionObstacles} from '../src/experience/globe/world-expansion-obstacles.ts';
import {worldPlaces} from '../src/experience/globe/world-expansion.ts';
import {heightAt,normalAt,RADIUS} from '../src/experience/globe/geography.ts';
import {insideBuildingFootprint} from '../src/experience/globe/building-footprint.ts';
import {meshOccluder} from '../src/experience/globe/occlusion.ts';

function build(){
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 try{const a=createGlobeArt(new THREE.Scene());return{a,...buildWorldExpansion(a)}}finally{globalThis.document=previous}
}

test('each far-side destination has distinct grounded art beside the clear arrival and trail',()=>{
 const {a,groups}=build();assert.equal(groups.length,expansionObstacles.length);
 for(const prop of expansionObstacles){
  const group=groups.find(value=>value.name===prop.id),n=normalAt(prop.x,prop.z),up=new THREE.Vector3(n.x,n.y,n.z);
  assert.ok(group,prop.id);assert.ok(group.position.distanceTo(up.multiplyScalar(RADIUS+heightAt(prop)))<1e-8,'each prop is grounded in its own radial frame');
  assert.ok(a.occlusionGroups.some(value=>value.id===prop.id),'tall art keeps camera transparency');
  group.traverse(part=>{if(part.isMesh){assert.ok(part.geometry.attributes.position.count>0);for(const value of part.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});
 }
 for(const place of worldPlaces){
  const props=expansionObstacles.filter(value=>value.place===place.id);assert.equal(props.length,2);
  for(const point of [place,place.arrival])assert.ok(props.every(prop=>!insideBuildingFootprint(point,prop,.32)),`${place.id} arrival and central trail stay open`);
 }
 a.dispose();
});

test('shared sign atlas, bounded ambient motion and owned resources survive day/night and calm changes',()=>{
 const {a,groups,update}=build(),stars=[];groups.forEach(group=>group.traverse(part=>{if(part.isMesh&&part.material.emissive?.getHex()===0xffc35a)stars.push(part)}));
 assert.equal(stars.length,5);const occluder=meshOccluder(a.occlusionGroups.find(value=>value.id==='star-garden-observatory'));update(5,false,0);const glow=stars[0].material.emissiveIntensity;assert.ok(glow>.7);assert.ok(stars[0].scale.x<.12,'pulse preserves small stars');
 update(50,true,1);assert.equal(stars[0].scale.x,.1);assert.equal(stars[0].scale.y,.18);assert.ok(stars[0].material.emissiveIntensity<glow);
 const signs=a.kit.extras.filter(material=>material.name==='building-sign-lettering');assert.equal(signs.length,1,'destination plaques reuse the atlas');
 const batch=a.finish();assert.equal(batch.meshes.length,0,'landmark fixed geometry is already batched for independent camera fading');
 occluder.dispose();const owned=[...new Set([...a.kit.geometries,...a.kit.extras])];let disposed=0;owned.forEach(value=>value.addEventListener('dispose',()=>disposed++));let textures=0;signs[0].map.addEventListener('dispose',()=>textures++);a.dispose();assert.equal(disposed,owned.length);assert.equal(textures,1);
});
