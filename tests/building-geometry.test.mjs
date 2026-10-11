import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {facadeLayout,foundationGeometry,gableGeometry,pitchedRoofGeometry,roofSection} from '../src/experience/globe/building-geometry.ts';
import {frameAt,createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {mapAt,heightAt,RADIUS} from '../src/experience/globe/geography.ts';
import {buildArchitecture} from '../src/experience/globe/architecture.ts';
import {buildings} from '../src/experience/globe/layout.ts';

function assertClosed(geometry){
 const position=geometry.attributes.position,index=geometry.index,edges=new Map();
 assert.ok([...position.array,...geometry.attributes.normal.array].every(Number.isFinite));
 const point=i=>[0,1,2].map(axis=>Math.round(position.array[i*3+axis]*1e5)).join(',');
 for(let i=0;i<(index?.count??position.count);i+=3){const corners=[0,1,2].map(j=>point(index?index.getX(i+j):i+j));for(let j=0;j<3;j++){const key=[corners[j],corners[(j+1)%3]].sort().join('|');edges.set(key,(edges.get(key)??0)+1)}}
 for(const count of edges.values())assert.equal(count,2,'every welded edge belongs to two triangles');
}

test('solid gable ends meet the pitched roof underside on narrow cottages and wide townhouses',()=>{
 for(const width of [3.6,4,5.4,6.2,7])for(const depth of [4,5.4,6.4]){
  const gable=gableGeometry(width,depth),roof=pitchedRoofGeometry(width,depth),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),wall=new THREE.Mesh(gable,material),cover=new THREE.Mesh(roof,material),ray=new THREE.Raycaster();
  assertClosed(gable);assertClosed(roof);wall.updateMatrixWorld();cover.updateMatrixWorld();
  for(const fraction of [-.98,-.7,-.3,0,.3,.7,.98]){
   const x=fraction*width/2,expected=roofSection(width).rise*(1-Math.abs(fraction));
   ray.set(new THREE.Vector3(x,3,0),new THREE.Vector3(0,-1,0));const wallTop=ray.intersectObject(wall)[0];assert.ok(wallTop);assert.ok(wallTop.point.y>=expected+.024&&wallTop.point.y<=expected+.026,'wall overlaps the roof without a triangular void');
   ray.set(new THREE.Vector3(x,-.5,0),new THREE.Vector3(0,1,0));const underside=ray.intersectObject(cover)[0];assert.ok(underside);assert.ok(Math.abs(underside.point.y-expected)<1e-5);
   for(const end of [-1,1]){ray.set(new THREE.Vector3(x,expected*.5, end*(depth/2+1)),new THREE.Vector3(0,0,-end));const front=ray.intersectObject(wall)[0];assert.ok(front,'both triangular end walls are solid');assert.ok(Math.abs(front.distance-1)<1e-5)}
  }
  gable.dispose();roof.dispose();material.dispose();
 }
});

test('explicit two floors align window columns, keep ground entrances readable and fit their walls',()=>{
 for(const width of [3.6,4,5.4,6.2])for(const floors of [1,2]){
  const height=floors===2?6.6:3.1,facade=facadeLayout({width,depth:5,height,floors});
  assert.equal(facade.rows.length,floors);assert.ok(facade.rows[0]>1.5&&facade.rows[0]<2);
  assert.ok(facade.windowX-(facade.windowWidth+.22)/2>.775,'window frames clear the door frame');
  assert.ok(facade.windowX+(facade.windowWidth+.22)/2<width/2,'window frames fit the facade');
  assert.ok(facade.labelY-facade.labelWidth/8>2.7,'label clears the door canopy');
  assert.ok(facade.labelY+facade.labelWidth/8<height+roofSection(width).rise*(1-facade.labelWidth/width),'label fits below the roof including the solid gable');
  if(floors===2){assert.equal(facade.floorBand,height/2);assert.ok(facade.rows[1]-.7>facade.floorBand);assert.ok(facade.rows[1]+.7<height)}else assert.equal(facade.floorBand,null);
 }
 assert.equal(facadeLayout({width:5.4,depth:5,height:6.6}).rows.length,1,'a tall single-floor building does not silently acquire another floor');
});

test('closed foundation skirts overlap walls and bury their sampled lower edges in village and city terrain',()=>{
 for(const [x,z,width,depth] of [[-9,6,5.4,5.2],[9,-25,5.8,5.4],[-12,32,5.2,4.8],[14,41,4.8,4.8],[16.5,50,4.8,4.8]]){
  const frame=frameAt(x,z),base=new THREE.Vector3().setFromMatrixPosition(frame).length(),ground=(xx,zz)=>{let y=0;for(let i=0;i<4;i++){const p=new THREE.Vector3(xx,y,zz).applyMatrix4(frame),radius=RADIUS+heightAt(mapAt(p.normalize()));y=Math.sqrt(radius*radius-xx*xx-zz*zz)-base}return y},geometry=foundationGeometry(width+.06,depth+.06,ground),positions=geometry.attributes.position,count=(positions.count-2)/2;
  assertClosed(geometry);assert.equal(count,24,'six samples per side bound the foundation cost');
  for(let i=0;i<count;i++){assert.ok(Math.abs(positions.getY(i)-.38)<1e-6);const p=new THREE.Vector3().fromBufferAttribute(positions,i+count).applyMatrix4(frame),level=p.length()-RADIUS;assert.ok(level<heightAt(mapAt(p.clone().normalize()))-.1,'each bottom edge is buried below the actual spherical terrain')}
  geometry.dispose();
 }
});

test('procedural recovery houses retain their solid structure, lit windows, fading groups and geometry ownership',()=>{
 const previous=globalThis.document,owned=[],parts=new Map(),art=createGlobeArt(new THREE.Scene()),fade=art.fadeable;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 art.fadeable=(id,group)=>{if(buildings.some(house=>house.id===id)){const structures=[];group.traverse(child=>{if(child instanceof THREE.Mesh&&['gable-infill','pitched-roof','terrain-foundation','japanese-hipped-roof'].includes(child.geometry.name)){structures.push(child.geometry.name);owned.push(child.geometry)}});parts.set(id,structures.sort())}fade(id,group)};
 try{
  const result=buildArchitecture(art);
  assert.equal(result.windows.length,buildings.reduce((count,house)=>count+(house.floors===2?2:1)*4,0),'the recovery primitive supports one floor or an explicit two-floor facade; imported three-storey topology is checked separately');
  for(const house of buildings){assert.deepEqual(parts.get(house.id),house.style==='japanese'?[...Array.from({length:house.id==='japan-temple'?2:1},()=> 'japanese-hipped-roof'),'terrain-foundation'].sort():['gable-infill','pitched-roof','terrain-foundation']);const group=art.occlusionGroups.find(value=>value.id===house.id);assert.ok(group?.meshes.length);assert.equal(group.visuals.filter(mesh=>result.windows.includes(mesh)).length,(house.floors===2?2:1)*4,'each recovery house fade includes its own rendered night windows')}
  let released=0;owned.forEach(geometry=>{assert.ok(art.kit.geometries.includes(geometry));geometry.addEventListener('dispose',()=>released++)});art.dispose();assert.equal(released,owned.length);
 }finally{globalThis.document=previous}
});
