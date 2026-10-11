import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {insideBuildingFootprint,buildingMapOutline} from '../src/experience/globe/building-footprint.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {mapAt} from '../src/experience/globe/geography.ts';

const houses=[{x:15,z:18,width:6,depth:5},{x:-8,z:40,width:6,depth:5},{x:12,z:48,width:6,depth:5}];
const mapLocal=(house,x,z)=>mapAt(new THREE.Vector3(x,0,z).applyMatrix4(frameAt(house.x,house.z)).normalize());

test('map outlines use the actual rendered tangent-frame corners at meadow and city latitudes',()=>{
 for(const house of houses){
  const before=JSON.stringify(house),outline=buildingMapOutline(house),corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  assert.equal(outline.length,4);assert.deepEqual(outline,buildingMapOutline(house));
  for(const [i,[side,end]] of corners.entries()){
   const expected=mapLocal(house,side*house.width/2,end*house.depth/2),actual=outline[i];
   assert.ok(Number.isFinite(actual.x)&&Number.isFinite(actual.z));
   assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<1e-10);
  }
  assert.equal(JSON.stringify(house),before,'outlines do not change authored building data');
 }
 const spans=houses.map(house=>{const xs=buildingMapOutline(house).map(point=>point.x);return Math.max(...xs)-Math.min(...xs)});
 assert.ok(spans[1]>spans[0]*1.5);assert.ok(spans[2]>spans[1]*1.3,'southern minimap widths account for converging longitudes');
});

test('collision matches surface points transformed into the rendered building frame',()=>{
 for(const house of houses){
  const inverse=frameAt(house.x,house.z).invert();
  for(let dx=-10;dx<=10;dx+=.5)for(let dz=-4;dz<=4;dz+=.5){
   const point={x:house.x+dx,z:house.z+dz},local=new THREE.Vector3().setFromMatrixPosition(frameAt(point.x,point.z)).applyMatrix4(inverse);
   for(const clearance of [0,.32,1]){
    const expected=Math.abs(local.x)<=house.width/2+clearance&&Math.abs(local.z)<=house.depth/2+clearance;
    assert.equal(insideBuildingFootprint(point,house,clearance),expected,JSON.stringify({house,point,clearance,local:local.toArray()}));
   }
  }
 }
});

test('city walls block their visible width and clearance remains in physical metres',()=>{
 for(const house of houses)for(const side of [-1,1]){
  assert.equal(insideBuildingFootprint(mapLocal(house,side*(house.width/2-.2),0),house),true);
  assert.equal(insideBuildingFootprint(mapLocal(house,side*(house.width/2+.2),0),house),false);
  assert.equal(insideBuildingFootprint(mapLocal(house,side*(house.width/2+.2),0),house,.32),true);
  assert.equal(insideBuildingFootprint(mapLocal(house,side*(house.width/2+.6),0),house,.32),false);
  assert.equal(insideBuildingFootprint(mapLocal(house,0,side*(house.depth/2-.2)),house),true);
  assert.equal(insideBuildingFootprint(mapLocal(house,0,side*(house.depth/2+.6)),house,.32),false);
 }
 const city=houses[2],withinWall=mapLocal(city,city.width*.4,0);
 assert.ok(Math.abs(withinWall.x-city.x)>city.width/2,'old map-unit rectangle misses part of the visible city house');
 assert.equal(insideBuildingFootprint(withinWall,city),true);
});
