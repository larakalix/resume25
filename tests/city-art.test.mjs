import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {buildCity,citySurfaceColors} from '../src/experience/globe/city.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {cityPavingBounds,cityQuarters,cityLamps} from '../src/experience/globe/city-district.ts';
import {heightAt,normalAt,mapAt,RADIUS} from '../src/experience/globe/geography.ts';

function build(){
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 try{const a=createGlobeArt(new THREE.Scene());return{a,...buildCity(a)}}finally{globalThis.document=previous}
}
function hit(pavement,point){
 const n=normalAt(point.x,point.z),up=new THREE.Vector3(n.x,n.y,n.z),ray=new THREE.Raycaster(up.clone().multiplyScalar(RADIUS+heightAt(point)+3),up.clone().negate());
 pavement.updateMatrixWorld(true);const value=ray.intersectObject(pavement)[0];assert.ok(value,`paved coverage at ${point.x},${point.z}`);return value;
}
function colorAt(pavement,point){const value=hit(pavement,point),colors=pavement.geometry.attributes.color,index=value.face.a;return new THREE.Color().setRGB(colors.getX(index),colors.getY(index),colors.getZ(index));}
const luminance=color=>color.r*.2126+color.g*.7152+color.b*.0722;

test('the complete three-quarter pavement stays on the terrain, within shared bounds and one small draw',()=>{
 const {a,pavement}=build(),positions=pavement.geometry.attributes.position,point=new THREE.Vector3();
 assert.equal(pavement.name,'city-pavement');assert.equal(pavement.geometry.name,'city-paving-and-markings');assert.equal(Array.isArray(pavement.material),false);assert.equal(pavement.material.vertexColors,true);
 assert.ok(positions.count/3<15000,`${positions.count/3} paving triangles`);assert.ok(a.kit.geometries.includes(pavement.geometry));assert.ok(a.kit.extras.includes(pavement.material));
 for(let i=0;i<positions.count;i++){
  point.fromBufferAttribute(positions,i);const radius=point.length(),p=mapAt(point.normalize()),lift=radius-RADIUS-heightAt(p);
  assert.ok(Number.isFinite(radius));assert.ok(p.x>=cityPavingBounds.minX-1e-5&&p.x<=cityPavingBounds.maxX+1e-5);assert.ok(p.z>=cityPavingBounds.minZ-1e-5&&p.z<=cityPavingBounds.maxZ+1e-5);
  assert.ok(lift>.03&&lift<.047,'paint and paving remain shallow terrain inlays');
 }
 for(const quarter of cityQuarters){const value=hit(pavement,quarter.arrival);assert.ok(value.distance>2.94&&value.distance<3);}
 for(const p of [{x:-53,z:36},{x:53,z:45},{x:-29,z:52.5},{x:29,z:52.5}])hit(pavement,p);
 a.dispose();
});

test('slate roads, pale sidewalks, painted crossings and a blue-gold arrival mosaic remain visually distinct',()=>{
 const {a,pavement}=build(),road=colorAt(pavement,{x:0,z:32}),walk=colorAt(pavement,{x:22,z:32}),crossing=colorAt(pavement,{x:0,z:34.1}),mosaic=colorAt(pavement,{x:0,z:39.5});
 assert.ok((luminance(walk)+.05)/(luminance(road)+.05)>2.4,'walkways clearly separate from the road');
 assert.ok((luminance(crossing)+.05)/(luminance(road)+.05)>3,'crossings read clearly against slate');
 assert.ok(mosaic.r>mosaic.b*1.5,'the arrival has a warm gold mosaic centre');
 const blues=new THREE.Color(citySurfaceColors.mosaic);assert.ok(blues.b>blues.r*2,'the compass mosaic has a contrasting blue accent');
 a.dispose();
});

test('the gateway uses framed shared-atlas directions above the walking space and night globes remain batched',()=>{
 const {a,gate,bulbs,update}=build(),signs=gate.children.filter(child=>child.userData.signText),before=bulbs.instanceMatrix.version;
 assert.deepEqual(signs.map(sign=>sign.userData.signText),['Little City','← Old Quarter · Bluebird →']);
 for(const sign of signs){const layout=sign.userData.signLayout;assert.ok(sign.position.y-(4.3*layout.pixelHeight/layout.pixelWidth+.14)/2>3.2,'framed plaques clear the explorer while jumping');assert.ok(a.occlusionGroups.find(group=>group.id==='city-gateway').visuals.includes(sign.getObjectByName('building-sign-lettering')));}
 const lettering=a.kit.extras.filter(material=>material.name==='building-sign-lettering');assert.equal(lettering.length,1);assert.equal(lettering[0].map.name,'building-sign-atlas');
 assert.equal(bulbs.count,cityLamps.length);assert.ok(a.kit.instances.includes(bulbs));update(1);const day=bulbs.material.emissiveIntensity;update(0);assert.ok(bulbs.material.emissiveIntensity>day*10);assert.equal(bulbs.instanceMatrix.version,before);
 const batch=a.finish();assert.equal(batch.meshes.length,1,'remaining fixed urban furniture shares the world batch');
 const owned=[...new Set([...a.kit.geometries,...a.kit.extras])];let releases=0;owned.forEach(value=>value.addEventListener('dispose',()=>releases++));let textures=0;lettering[0].map.addEventListener('dispose',()=>textures++);a.dispose();assert.equal(releases,owned.length);assert.equal(textures,1);
});
