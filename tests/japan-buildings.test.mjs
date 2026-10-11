import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createJapaneseRoof,japanRoofRings} from '../src/experience/globe/japan-roof.ts';
import {buildJapaneseBuilding} from '../src/experience/globe/japan-buildings.ts';
import {buildArchitecture} from '../src/experience/globe/architecture.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildings} from '../src/experience/globe/layout.ts';
import {meshOccluder} from '../src/experience/globe/occlusion.ts';

const japanese=buildings.filter(house=>house.style==='japanese');
function canvas(run){const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=before}}
function closed(geometry){
 const p=geometry.getAttribute('position'),index=geometry.index,edges=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(value=>Math.round(value*1e5)).join(',');
 for(let i=0;i<index.count;i+=3){const corners=[0,1,2].map(j=>key(index.getX(i+j)));for(let j=0;j<3;j++){const edge=[corners[j],corners[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1)}}
 assert.ok([...p.array,...geometry.getAttribute('normal').array].every(Number.isFinite));for(const count of edges.values())assert.equal(count,2);
}

test('original hipped roofs have a closed wall-overlap underside, broad eaves and a lifted-corner silhouette',()=>{
 for(const [width,depth,rise] of [[3.2,3.7,.8],[4.6,4.8,1],[7.2,5,1.1],[3.6,.9,.35]]){
  const geometry=createJapaneseRoof(width,depth,rise),rings=japanRoofRings(width,depth,rise),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();closed(geometry);mesh.updateMatrixWorld();
  geometry.computeBoundingBox();assert.ok(Math.abs(geometry.boundingBox.min.y+.10)<1e-6);assert.ok(geometry.boundingBox.max.x>width/2+.5);assert.ok(geometry.boundingBox.max.z>depth/2+.5);
  assert.ok(rings[0][0][1]>rings[0][1][1],'corners lift above the middle of the eave');assert.ok(rings.at(-1)[0][1]>rings[1][0][1]);
  for(const x of [-.48,0,.48])for(const z of [-.48,0,.48]){ray.set(new THREE.Vector3(x*width,-.30,z*depth),new THREE.Vector3(0,1,0));const hit=ray.intersectObject(mesh)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y+.10)<1e-5,'roof volume overlaps the top of the wall at every footprint sample')}
  geometry.dispose();mesh.material.dispose();
 }
});

test('Japanese shops and the two-tier temple have their own architecture, lane signs and no low geometry outside body clearance',()=>canvas(()=>{
 assert.ok(japanese.length>2);const a=createGlobeArt(new THREE.Scene()),captured=new Map(),fade=a.fadeable;
 a.fadeable=(id,root)=>{root.updateMatrixWorld(true);const roofs=[];root.traverse(child=>{if(child instanceof THREE.Mesh&&child.geometry.name==='japanese-hipped-roof')roofs.push(child)});captured.set(id,{root,roofs,noren:!!root.getObjectByName('japanese-noren')});root.traverse(child=>{if(!(child instanceof THREE.Mesh))return;const localBox=new THREE.Box3().setFromBufferAttribute(child.geometry.getAttribute('position')).applyMatrix4(root.matrixWorld.clone().invert().multiply(child.matrixWorld));if(localBox.min.y<1.98){const house=japanese.find(house=>house.id===id);assert.ok(localBox.min.x>=-house.width/2-.27&&localBox.max.x<=house.width/2+.27,id);assert.ok(localBox.min.z>=-house.depth/2-.27&&localBox.max.z<=house.depth/2+.27,id)}});fade(id,root)};
 for(const house of japanese){
  const result=buildJapaneseBuilding(a,house),record=captured.get(house.id),root=record.root,roofKinds=record.roofs;
  assert.equal(result.windows.length,(house.floors??1)*4);assert.ok(result.windows.every(window=>window.visible===false));assert.ok(root.getObjectByName('japanese-paper-lantern'));assert.ok(record.noren);
  assert.equal(root.userData.architecture,house.id==='japan-temple'?'japanese-temple':'japanese-machiya');assert.equal(roofKinds.length,house.id==='japan-temple'?2:1);
  const lane=root.getObjectByName('japanese-lane-frontage');if(house.id!=='japan-temple'){assert.ok(lane);assert.equal(Math.sign(lane.position.x),house.x< -33?1:-1);assert.equal(lane.getObjectByName('building-sign').userData.signText,house.name)}
  assert.ok(a.occlusionGroups.find(group=>group.id===house.id).visuals.includes(result.lanterns[0]));
 }
 a.dispose();
}));

test('night lantern updates follow occlusion material copies and room art owns the new resources',()=>canvas(()=>{
 const a=createGlobeArt(new THREE.Scene()),architecture=buildArchitecture(a),occluders=a.occlusionGroups.filter(group=>japanese.some(house=>house.id===group.id)).map(meshOccluder);
 assert.equal(architecture.lanterns.length,japanese.length);architecture.setDaylight(1);const day=architecture.lanterns.map(mesh=>mesh.material.emissiveIntensity);architecture.setDaylight(0);
 for(const [index,mesh] of architecture.lanterns.entries()){assert.ok(mesh.material.emissiveIntensity>day[index]+.8);assert.ok(a.kit.geometries.includes(mesh.geometry))}
 const geometry=a.kit.geometries.filter(geometry=>geometry.name==='japanese-hipped-roof');let released=0;geometry.forEach(geometry=>geometry.addEventListener('dispose',()=>released++));occluders.forEach(occluder=>occluder.dispose());a.dispose();assert.equal(released,geometry.length);assert.ok(geometry.length>=japanese.length);
}));
