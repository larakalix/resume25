import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {layoutBuildingSign,buildBuildingSign} from '../src/experience/globe/building-signs.ts';
import {cityBuildingStyle} from '../src/experience/globe/building-style.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildings} from '../src/experience/globe/layout.ts';
import {buildArchitecture} from '../src/experience/globe/architecture.ts';

function withCanvas(run){
 const previous=globalThis.document,calls=[];
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(...args){calls.push(args)}})})};
 try{return run(calls)}finally{globalThis.document=previous}
}
test('building names wrap into legible words without horizontal letter compression or losing text',()=>{
 const labels=[...buildings.map(house=>house.name),'Extraordinary Product Workshop','A small town with big ideas'];
 for(const text of labels){
  const layout=layoutBuildingSign(text,(value,size)=>value.length*size*.54);
  assert.equal(layout.lines.join(' '),text);assert.ok(layout.lines.length<=2);assert.ok(layout.fontSize>=9&&layout.fontSize<=25);
  for(const line of layout.lines)assert.ok(line.length*layout.fontSize*.54<=228);
  assert.equal(layout.pixelWidth,256);assert.equal(layout.pixelHeight,layout.lines.length===1?64:80);
 }
 assert.equal(layoutBuildingSign('  Corner   Café  ').lines.join(' '),'Corner Café');
 assert.ok(layoutBuildingSign('Extraordinary Product Workshop').lines.length>1);
});
test('framed sign geometry preserves the texture aspect and packs forty labels per owned atlas page',()=>withCanvas(calls=>{
 const a=createGlobeArt(new THREE.Scene()),parent=new THREE.Group(),signs=[];a.scene.add(parent);
 for(let i=0;i<45;i++)signs.push(buildBuildingSign(a,`Shop number ${i}`,{position:[0,3,0],width:2.8,theme:i%2?'navy':'cream'},parent));
 const materials=a.kit.extras.filter(material=>material.name==='building-sign-lettering');assert.equal(materials.length,2);
 const faces=signs.map(sign=>sign.getObjectByName('building-sign-lettering'));
 assert.ok(faces.slice(0,40).every(face=>face.material===materials[0]));assert.ok(faces.slice(40).every(face=>face.material===materials[1]));
 for(const [index,sign] of signs.entries()){
  const face=faces[index],layout=sign.userData.signLayout;face.geometry.computeBoundingBox();const size=new THREE.Vector3();face.geometry.boundingBox.getSize(size);
  assert.ok(Math.abs(size.x/size.y-layout.pixelWidth/layout.pixelHeight)<1e-6);assert.ok(a.kit.geometries.includes(face.geometry));assert.equal(sign.userData.signText,`Shop number ${index}`);
  assert.ok([...face.geometry.attributes.uv.array].every(value=>value>0&&value<1));assert.equal(sign.children.length,4,'dimensional backing, lettering and two fastening heads');
 }
 assert.equal(new Set(faces.slice(0,40).map(face=>[...face.geometry.attributes.uv.array].join(','))).size,40);
 assert.equal(calls.length,45);assert.ok(calls.every(args=>args.length===3),'fillText receives no maxWidth that could squeeze the type');
 for(const material of materials){assert.equal(material.map,material.emissiveMap);assert.equal(material.map.image.width,1024);assert.equal(material.map.image.height,1024);assert.equal(material.map.colorSpace,THREE.SRGBColorSpace);assert.ok(material.emissiveIntensity>0&&material.emissiveIntensity<.2)}
 let released=0;materials.forEach(material=>material.map.addEventListener('dispose',()=>released++));a.dispose();assert.equal(released,2);
}));
test('procedural recovery houses keep framed lettering in their fade group and varied city colours retain structure',()=>withCanvas(()=>{
 const a=createGlobeArt(new THREE.Scene()),signs=new Map(),fade=a.fadeable;
 a.fadeable=(id,group)=>{if(buildings.some(house=>house.id===id)){const labels=[];group.traverse(child=>{if(child.name==='building-sign')labels.push(child)});signs.set(id,labels);}fade(id,group)};
 const {windows}=buildArchitecture(a);
 assert.equal(windows.length,buildings.reduce((count,house)=>count+(house.floors===2?2:1)*4,0),'the optional recovery renderer supports one or two floors; imported home storeys are covered by source-geometry tests');
 for(const house of buildings){
  const labels=signs.get(house.id);assert.ok(labels?.length);const group=a.occlusionGroups.find(group=>group.id===house.id);
  for(const sign of labels){assert.equal(sign.userData.signText,house.name);const face=sign.getObjectByName('building-sign-lettering');assert.ok(group.visuals.includes(face),'lettering fades with the obstructing building');assert.ok(sign.position.y>2.9)}assert.ok(group.meshes.length);
  assert.equal(labels.length,house.style==='japanese'&&house.id!=='japan-temple'?2:1,'Japanese shops also identify the inner-lane frontage');
 }
 assert.equal(a.kit.extras.filter(material=>material.name==='building-sign-lettering').length,Math.ceil([...signs.values()].reduce((total,labels)=>total+labels.length,0)/40));
 const variants=buildings.filter(house=>house.style==='city').map(house=>cityBuildingStyle(house.id));assert.ok(new Set(variants.map(variant=>variant.wall)).size>1);
 for(const house of buildings)assert.deepEqual(cityBuildingStyle(house.id),cityBuildingStyle(house.id));
 a.dispose();
}));
