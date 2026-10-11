import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {test} from 'node:test';
import * as THREE from 'three';
import data from '../src/experience/globe/assets/layered-cliffs.json' with {type:'json'};
import {cityCliffSites,cityCliffGeometry,buildCityCliffs,cliffCredit} from '../src/experience/globe/city-cliffs.ts';
import {terrainHeight,RADIUS,WATER,mapAt} from '../src/experience/globe/terrain.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';

test('the project embeds only three small prepared cliff variants, with creator credit and reproducible source provenance',async()=>{
 assert.deepEqual(data.models.map(model=>model.name),['Plane001','Plane002','Plane003']);assert.equal(data.credit,'3D Assets by SimplePolygon');
 assert.equal(cliffCredit.licenseUrl,'https://simplepolygon.itch.io/layered-cliffs');assert.ok(cliffCredit.reference.includes('eda6c468f54b421ca300db6fd717c66c'));assert.match(data.sourceSha256,/^[a-f0-9]{64}$/);
 assert.ok((await stat(new URL('../src/experience/globe/assets/layered-cliffs.json',import.meta.url))).size<15000);
 let triangles=0;
 for(const model of data.models){
  const xs=[],ys=[],zs=[];
  for(let vertex=0;vertex<model.positions.length;vertex+=3){xs.push(model.positions[vertex]);ys.push(model.positions[vertex+1]);zs.push(model.positions[vertex+2]);}
  assert.equal(Math.min(...ys),0);assert.equal(Math.max(...ys),1);assert.ok(Math.abs(Math.min(...xs)+Math.max(...xs))<.00002);assert.ok(Math.abs(Math.min(...zs)+Math.max(...zs))<.00002);
  assert.ok(model.indices.every(index=>Number.isInteger(index)&&index>=0&&index<model.positions.length/3));triangles+=model.indices.length/3;
 }
 assert.equal(triangles,476);
 const runtime=await readFile(new URL('../src/experience/globe/city-cliffs.ts',import.meta.url),'utf8');assert.ok(!runtime.includes('FBXLoader'));assert.ok(!runtime.includes('TextureLoader'));assert.ok(!runtime.includes('fetch('));
});

test('all transformed cliff faces stay recessed below dry walking ground and expose stone only at the city coast',()=>{
 const resolution=24;let drySamples=0,exposedWetSamples=0,total=0;
 for(const site of cityCliffSites){
  const geometry=cityCliffGeometry(site),p=geometry.getAttribute('position'),indices=geometry.index,colors=geometry.getAttribute('color');
  assert.ok(p.array.every(Number.isFinite));assert.ok(geometry.getAttribute('normal').array.every(Number.isFinite));assert.ok(colors.array.every(value=>value>=0&&value<=1));
  for(let triangle=0;triangle<indices.count;triangle+=3){
   const ids=[indices.getX(triangle),indices.getX(triangle+1),indices.getX(triangle+2)];
   for(let row=0;row<=resolution;row++)for(let col=0;col<=resolution-row;col++){
    const b=row/resolution,c=col/resolution,weights=[1-b-c,b,c],point=new THREE.Vector3();for(let corner=0;corner<3;corner++)point.addScaledVector(new THREE.Vector3().fromBufferAttribute(p,ids[corner]),weights[corner]);
    const level=point.length()-RADIUS,normal=point.clone().normalize(),ground=terrainHeight(normal),map=mapAt(normal);
    assert.ok(map.z>28,'cliffs do not reach the old meadow or harbor');
    if(ground>WATER+.07){drySamples++;assert.ok(level<=ground-.03,`${site.x},${site.z}: face above walking terrain by ${level-ground}`);}
    else if(level>WATER)exposedWetSamples++;
   }
  }
  total+=indices.count/3;geometry.dispose();
 }
 assert.ok(drySamples>0);assert.ok(exposedWetSamples>0);assert.ok(total<3000);
});

test('coastal cliffs stay one static draw through art batching and existing disposal owns every resource',()=>{
 const scene=new THREE.Scene(),art=createGlobeArt(scene),cliffs=buildCityCliffs(art);let geometries=0,materials=0;
 assert.equal(cliffs.triangles,cliffs.geometry.index.count/3);assert.ok(cliffs.triangles<3000);assert.equal(cliffs.mesh.name,'city-coastal-cliffs');assert.equal(cliffs.mesh.material.vertexColors,true);assert.equal(cliffs.mesh.material.flatShading,true);assert.equal(cliffs.mesh.material.map,null);
 assert.ok(art.kit.geometries.includes(cliffs.geometry));assert.ok(art.kit.extras.includes(cliffs.mesh.material));assert.ok(!art.kit.staticMeshes.includes(cliffs.mesh));
 cliffs.geometry.addEventListener('dispose',()=>geometries++);cliffs.mesh.material.addEventListener('dispose',()=>materials++);
 art.block('cream',[0,0,0],[1,1,1]);const batch=art.finish();assert.equal(batch.meshes.length,1);assert.equal(cliffs.mesh.parent,scene);assert.equal(scene.children.filter(child=>child.name==='city-coastal-cliffs').length,1);
 art.dispose();assert.equal(geometries,1);assert.equal(materials,1);
});
