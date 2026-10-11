import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {grassCapacity,grassSlotCount,grassTiles,grassTilePoint,grassTileDistance,orderedGrassTiles,grassSlotIndex,grassSlotCapacity} from '../src/experience/globe/grass-placement.ts';
import {worldRadius,longitudeLimit} from '../src/experience/globe/world-expansion.ts';
import {normalAt,mapAt,terrainHeight,wet,distance,spawn} from '../src/experience/globe/geography.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildMeadow,meadowPatch} from '../src/experience/globe/meadow.ts';
import {expansionObstacles} from '../src/experience/globe/world-expansion-obstacles.ts';
import {insideBuildingFootprint} from '../src/experience/globe/building-footprint.ts';

test('ground and grass tint meet continuously at the longitude seam',()=>{
 for(const z of [-59,-24,0,24,59]){
  assert.ok(Math.abs(meadowPatch(-longitudeLimit,z)-meadowPatch(longitudeLimit,z))<1e-12);
  assert.ok(Math.abs(meadowPatch(-longitudeLimit+.00001,z)-meadowPatch(longitudeLimit-.00001,z))<.00001);
 }
});

test('stable spherical grass tiles cover the entire surface without a longitude seam or polar singularity',()=>{
 let area=0;
 for(const tile of grassTiles){
  area+=(tile.maxLongitude-tile.minLongitude)*(tile.maxSinLatitude-tile.minSinLatitude)*worldRadius*worldRadius;
  assert.ok(Math.abs(Math.hypot(tile.normal.x,tile.normal.y,tile.normal.z)-1)<1e-10);
  for(const index of [0,17,655]){
   const point=grassTilePoint(tile,index);assert.deepEqual(point,grassTilePoint(tile,index));
   assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.z));assert.ok(Math.abs(point.x)<=longitudeLimit&&Math.abs(point.z)<Math.PI*worldRadius/2);
  }
 }
 assert.ok(Math.abs(area-4*Math.PI*worldRadius*worldRadius)<1e-7);
 for(const z of [-60,-24,0,24,60]){
  const leftNormal=normalAt(-longitudeLimit+.0001,z),rightNormal=normalAt(longitudeLimit-.0001,z),left=orderedGrassTiles(leftNormal).slice(0,64).map(tile=>tile.id),right=new Set(orderedGrassTiles(rightNormal).slice(0,64).map(tile=>tile.id));
  assert.ok(left.filter(id=>right.has(id)).length>=62,`the same nearby tiles straddle the seam at ${z}`);
  for(const tile of grassTiles)assert.ok(Math.abs(grassTileDistance(tile,leftNormal)-grassTileDistance(tile,rightNormal))<.00021,'crossing the seam is a small physical step');
 }
});

test('every grass quality prefix stays spatially balanced and within the existing instance capacity',()=>{
 const indices=new Set();
 for(let slot=0;slot<grassSlotCount;slot++)for(let tuft=0;tuft<grassSlotCapacity(slot);tuft++)indices.add(grassSlotIndex(slot,tuft));
 assert.equal(indices.size,grassCapacity);assert.equal(Math.max(...indices),grassCapacity-1);
 for(const limit of [9000,12000,18000,26000,28000,42000]){
  const counts=Array(grassSlotCount).fill(0);for(let slot=0;slot<grassSlotCount;slot++)for(let tuft=0;tuft<grassSlotCapacity(slot);tuft++)if(grassSlotIndex(slot,tuft)<limit)counts[slot]++;
  assert.ok(Math.min(...counts)>0);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
 }
});

test('walking retains close tufts while recycled grass reaches rear continents and both polar gardens without new render resources',()=>{
 const art=createGlobeArt(new THREE.Scene()),meadow=buildMeadow(art,{value:0}),mesh=meadow.grass,geometry=mesh.geometry,material=mesh.material,matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 function world(p){const n=normalAt(p.x,p.z);return new THREE.Vector3(n.x,n.y,n.z).multiplyScalar(worldRadius+terrainHeight(n)+.1)}
 function rootsNear(p,radius){let count=0;for(let index=0;index<mesh.count;index+=31){mesh.getMatrixAt(index,matrix);point.setFromMatrixPosition(matrix);assert.ok(point.length()>worldRadius-2);point.normalize();const mapped=mapAt(point);assert.equal(wet(mapped),false);for(const prop of expansionObstacles)if(distance(mapped,prop)<6)assert.equal(insideBuildingFootprint(mapped,prop,.29),false);if(distance(mapped,p)<radius)count++}return count}
 const retained=[];
 for(let index=0;index<mesh.count;index+=73){mesh.getMatrixAt(index,matrix);point.setFromMatrixPosition(matrix).normalize();if(distance(mapAt(point),spawn)<12)retained.push({index,values:matrix.toArray()})}
 assert.ok(retained.length>25);
 for(let step=1;step<=60;step++)meadow.update(world({x:step*.1,z:spawn.z}),false,42000,64);
 for(const tuft of retained){mesh.getMatrixAt(tuft.index,matrix);assert.deepEqual(matrix.toArray(),tuft.values,'walking never moves existing close tufts')}
 for(const destination of [{x:88,z:20},{x:-112,z:24},{x:110,z:-59},{x:-90,z:59}]){
  const position=world(destination);for(let frame=0;frame<32;frame++)meadow.update(position,false,42000,64);
  assert.equal(meadow.grass,mesh);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(mesh.count,grassCapacity);
  assert.ok(rootsNear(destination,22)>100,`dense nearby grass at ${JSON.stringify(destination)}`);
 }
 const stable=mesh.instanceMatrix.array.slice();for(let frame=0;frame<10;frame++)meadow.update(world({x:-90,z:59}),false,9000,38);assert.deepEqual(mesh.instanceMatrix.array,stable);assert.equal(mesh.count,9000);
 art.dispose();
});
