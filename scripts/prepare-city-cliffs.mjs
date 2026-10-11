import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';

// Offline preparation only. Keep the licensed source FBX outside the published app.
const input=process.argv[2];
if(!input)throw new Error('Provide the locally downloaded SimplePolygon_LayeredCliffs.fbx path.');
const source=await readFile(input),original=THREE.TextureLoader.prototype.load;
let root;
try{
 THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
 root=new FBXLoader().parse(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'');
}finally{THREE.TextureLoader.prototype.load=original;}
root.updateMatrixWorld(true);
const names=['Plane001','Plane002','Plane003'],models=names.map(name=>{
 const mesh=root.getObjectByName(name);
 if(!mesh?.isMesh)throw new Error(`Missing source mesh ${name}`);
 const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geometry.computeBoundingBox();
 const box=geometry.boundingBox,centre=box.getCenter(new THREE.Vector3()),height=box.max.y-box.min.y,position=geometry.getAttribute('position');
 const positions=[],indices=[],welded=new Map();
 for(let index=0;index<position.count;index++){
  const point=[(position.getX(index)-centre.x)/height,(position.getY(index)-box.min.y)/height,(position.getZ(index)-centre.z)/height].map(value=>Math.round(value*100000)/100000),key=point.join(',');
  let target=welded.get(key);
  if(target===undefined){target=positions.length/3;welded.set(key,target);positions.push(...point);}
  indices.push(target);
 }
 geometry.dispose();return{name,positions,indices};
});
const output={credit:'3D Assets by SimplePolygon',creator:'https://simplepolygon.net',source:'https://simplepolygon.itch.io/layered-cliffs',reference:'https://sketchfab.com/3d-models/free-layered-cliffs-eda6c468f54b421ca300db6fd717c66c/',licenseUrl:'https://simplepolygon.itch.io/layered-cliffs',terms:'Free for personal and commercial projects. Credit required. No redistribution or resale.',sourceSha256:createHash('sha256').update(source).digest('hex'),preparation:'Three source meshes; FBX world transforms baked, centred on X/Z, base Y=0 and height=1, texture/UV/material data removed, coincident positions welded.',models};
await writeFile(new URL('../src/experience/globe/assets/layered-cliffs.json',import.meta.url),JSON.stringify(output));
console.log(`Prepared ${models.length} cliff variants (${models.reduce((sum,model)=>sum+model.indices.length/3,0)} triangles).`);
