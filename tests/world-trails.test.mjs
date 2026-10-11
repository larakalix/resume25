import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildWorldTrails,worldTrailStyle} from '../src/experience/globe/world-trails.ts';
import {heightAt,normalAt,mapAt,RADIUS} from '../src/experience/globe/geography.ts';
import {bridgeFootprint} from '../src/experience/globe/bridge.ts';
import {cityPaved} from '../src/experience/globe/city-district.ts';
import {japanPaved} from '../src/experience/globe/japan-district.ts';
import {longitudeLimit} from '../src/experience/globe/world-expansion.ts';

function build(){const a=createGlobeArt(new THREE.Scene());return{a,trail:buildWorldTrails(a)}}
function hit(mesh,point){const n=normalAt(point.x,point.z),up=new THREE.Vector3(n.x,n.y,n.z),ray=new THREE.Raycaster(up.clone().multiplyScalar(RADIUS+heightAt(point)+2),up.negate());mesh.updateMatrixWorld(true);return ray.intersectObject(mesh)[0]}

test('whole-globe trails are one bounded owned draw grounded just above the real spherical surface',()=>{
 const {a,trail}=build(),position=trail.geometry.attributes.position,point=new THREE.Vector3();
 assert.equal(trail.name,'whole-globe-trails');assert.ok(position.count>1000);assert.ok(position.count/3<10000,'ribbon detail stays bounded');assert.equal(Array.isArray(trail.material),false);assert.ok(trail.material.isMeshStandardMaterial);assert.equal(trail.material.polygonOffset,true);assert.equal(trail.material.depthWrite,false,'shallow trail color never hides the lower footprint impressions');assert.equal(worldTrailStyle.lift,.035);
 for(let i=0;i<position.count;i++){
  point.fromBufferAttribute(position,i);const radius=point.length(),mapped=mapAt(point.normalize());
  assert.ok(Number.isFinite(radius));assert.ok(Math.abs(radius-RADIUS-heightAt(mapped)-worldTrailStyle.lift)<.00002,'fine ribbon follows the actual heightfield');
  assert.ok(!bridgeFootprint(mapped,-.002),'stone bridge decks are never painted over');assert.ok(!japanPaved(mapped,-.002),'existing Japanese paving remains clear');
  const epsilon=.002;assert.ok(!cityPaved(mapped)||[-1,1].some(x=>[-1,1].some(z=>!cityPaved({x:mapped.x+x*epsilon,z:mapped.z+z*epsilon}))),'existing city paving remains clear');
 }
 assert.ok(a.kit.geometries.includes(trail.geometry));assert.ok(a.kit.extras.includes(trail.material));const batch=a.finish();assert.equal(batch.meshes.length,0,'the sand material is preserved outside static color batching');let released=0;trail.geometry.addEventListener('dispose',()=>released++);trail.material.addEventListener('dispose',()=>released++);a.dispose();assert.equal(released,2);
});

test('sand ribbons meet across the longitude seam, keep physical polar width and stop at bridge/paving boundaries',()=>{
 const {a,trail}=build();
 for(const x of [longitudeLimit-.15,-longitudeLimit+.15])assert.ok(hit(trail,{x,z:24}),'both map edges meet on the globe');
 assert.ok(hit(trail,{x:-30,z:56}));assert.ok(hit(trail,{x:-30,z:56.8}),'physical trail width survives compressed polar longitude');assert.equal(hit(trail,{x:-30,z:57.3}),undefined,'the trail stays narrow');
 assert.equal(hit(trail,{x:110,z:-4}),undefined,'rear stone bridge remains unpainted');assert.equal(hit(trail,{x:54.5,z:28.3}),undefined,'city paving remains unpainted');assert.equal(hit(trail,{x:-51,z:-42.7}),undefined,'Japanese lane remains unpainted');
 a.dispose();
});
