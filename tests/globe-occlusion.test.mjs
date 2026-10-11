import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createOcclusionFade,meshOccluder,instancedOccluder} from '../src/experience/globe/occlusion.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
const up=new THREE.Vector3(0,1,0),feet=new THREE.Vector3();
function fixture(){
 const material=new THREE.MeshStandardMaterial({color:0x987052}),wall=new THREE.Mesh(new THREE.BoxGeometry(3,4,.5),material);wall.position.set(0,2,5);wall.castShadow=true;
 const window=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);window.position.set(0,2,5.3);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,3,10);camera.lookAt(0,1,0);
 const occluder=meshOccluder({id:'house',meshes:[wall],visuals:[wall,window]}),fade=createOcclusionFade([occluder]);
 return{material,wall,window,camera,occluder,fade,dispose(){fade.dispose();wall.geometry.dispose();window.geometry.dispose();material.dispose()}};
}
test('only the blocking house fades, including signs/windows, without mutating shared materials or collision geometry',()=>{
 const f=fixture(),unrelated=new THREE.Mesh(f.wall.geometry,f.material),positions=f.wall.geometry.attributes.position.array.slice();
 assert.deepEqual(f.fade.update(f.camera,feet,up,1/60,true,true),['house']);assert.equal(f.wall.material.opacity,.14);assert.equal(f.window.material,f.wall.material);assert.equal(unrelated.material.opacity,1);assert.equal(f.material.transparent,false);assert.equal(f.wall.material.depthWrite,false);assert.equal(f.wall.castShadow,false);assert.deepEqual(f.wall.geometry.attributes.position.array,positions);
 f.camera.position.x=12;f.camera.lookAt(0,1,0);f.fade.update(f.camera,feet,up,.04,true,false);assert.equal(f.wall.material.opacity,.14);for(let i=0;i<120;i++)f.fade.update(f.camera,feet,up,1/60,true,false);assert.equal(f.wall.material.opacity,1);assert.equal(f.wall.material.depthWrite,true);assert.equal(f.wall.castShadow,true);f.dispose();assert.equal(f.wall.material,f.material);
});
test('fade timing is refresh-rate independent and reduced/overview/interior states restore immediately',()=>{
 const values=[];for(const hz of [30,60,120]){const f=fixture();for(let i=0;i<hz/10;i++)f.fade.update(f.camera,feet,up,1/hz,true,false);values.push(f.occluder.opacity);assert.ok(f.occluder.opacity>.14&&f.occluder.opacity<.25);f.fade.update(f.camera,feet,up,0,false,true);assert.equal(f.occluder.opacity,1);f.fade.update(f.camera,feet,up,0,true,true);assert.equal(f.occluder.opacity,.14);f.fade.update(f.camera,feet,up,0,false,false);assert.equal(f.occluder.opacity,1);f.dispose()}assert.ok(Math.max(...values)-Math.min(...values)<1e-5);
});
test('occlusion rays stop at the character and also detect a camera inside an opaque object',()=>{
 const f=fixture();assert.equal(f.occluder.intersects(new THREE.Ray(new THREE.Vector3(0,2,10),new THREE.Vector3(0,0,-1)),2),false);assert.equal(f.occluder.intersects(new THREE.Ray(new THREE.Vector3(0,2,5),new THREE.Vector3(0,0,-1)),5),true);assert.equal(f.occluder.intersects(new THREE.Ray(new THREE.Vector3(0,2,0),new THREE.Vector3(0,0,-1)),10),false);f.dispose();
});
test('a fading canopy leaves other instances opaque and restores exact transforms without disposing shared geometry',()=>{
 const scene=new THREE.Scene(),geometry=new THREE.SphereGeometry(1,8,6),material=new THREE.MeshStandardMaterial(),source=new THREE.InstancedMesh(geometry,material,2),hook=()=>{};material.onBeforeCompile=hook;source.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,2,5));source.setMatrixAt(1,new THREE.Matrix4().makeTranslation(10,2,5));source.setColorAt(0,new THREE.Color('green'));source.setColorAt(1,new THREE.Color('pink'));scene.add(source);
 const before=new THREE.Matrix4(),other=new THREE.Matrix4(),matrix=new THREE.Matrix4();source.getMatrixAt(0,before);source.getMatrixAt(1,other);let disposedGeometry=false;geometry.addEventListener('dispose',()=>{disposedGeometry=true});
 const target=instancedOccluder('tree',source,[0]);target.fade(.14);source.getMatrixAt(0,matrix);assert.ok(matrix.getMaxScaleOnAxis()<.001);source.getMatrixAt(1,matrix);assert.deepEqual(matrix,other);const overlay=scene.children.find(child=>child!==source);assert.equal(overlay.visible,true);assert.equal(overlay.material.opacity,.14);assert.equal(overlay.material.onBeforeCompile,hook);assert.equal(overlay.geometry,geometry);assert.equal(source.material.opacity,1);
 assert.equal(target.intersects(new THREE.Ray(new THREE.Vector3(0,2,10),new THREE.Vector3(0,0,-1)),10),true);target.fade(1);source.getMatrixAt(0,matrix);assert.deepEqual(matrix,before);assert.equal(overlay.visible,false);target.dispose();assert.equal(scene.children.length,1);assert.equal(disposedGeometry,false);source.dispose();geometry.dispose();material.dispose();
});
test('fadeable batches retain object identity while unrelated scenery keeps its shared static batch',()=>{
 const a=createGlobeArt(new THREE.Scene()),house=a.root(0,0),wall=a.block('cream',[0,1,0],[2,2,2],house),window=a.mesh(a.kit.box,'gold',[0,1,1.1],[.5,.5,.1],house,true),other=a.block('cream',[8,1,0],[2,2,2]);a.fadeable('cottage',house);
 assert.equal(a.occlusionGroups.length,1);assert.equal(a.occlusionGroups[0].meshes.length,1);assert.ok(a.occlusionGroups[0].visuals.includes(window));assert.ok(!a.kit.staticMeshes.includes(wall));assert.ok(a.kit.staticMeshes.includes(other));assert.equal(a.finish().meshes.length,1);a.dispose();
});
