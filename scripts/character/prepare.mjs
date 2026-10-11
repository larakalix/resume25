import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { retargetClip } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Local, already-downloaded CC0 inputs. No network, third-party scripts, or Blender required.
const modelDirectory=resolve(process.argv[2]??'/tmp/resume25-quaternius-base');
const motionDirectory=resolve(process.argv[3]??'/tmp/resume25-m2m-source');
const output=resolve('public/models/engineer/engineer.glb');
globalThis.ProgressEvent??=class ProgressEvent {constructor(type,options={}){this.type=type;Object.assign(this,options);}};
globalThis.FileReader??=class FileReader {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function arrayBuffer(buffer){return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);}
async function loadGLB(path, rigOnly=false){
 const bytes=await readFile(path);
 if(!rigOnly)return loader.parseAsync(arrayBuffer(bytes),'');
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
 const start=28+length;
 json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(start,start+json.buffers[0].byteLength).toString('base64');
 json.materials=json.materials?.map(material=>({name:material.name}));delete json.images;delete json.textures;delete json.samplers;
 return loader.parseAsync(JSON.stringify(json),'');
}
async function loadLocalGLTF(name){
 const json=JSON.parse(await readFile(resolve(modelDirectory,name),'utf8'));
 json.materials=json.materials.map(material=>({name:material.name,doubleSided:true,pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:1}}));
 delete json.images;delete json.textures;delete json.samplers;
 for(const buffer of json.buffers)buffer.uri='data:application/octet-stream;base64,'+(await readFile(resolve(modelDirectory,buffer.uri))).toString('base64');
 return loader.parseAsync(JSON.stringify(json),'');
}
const model=await loadLocalGLTF('Superhero_Male_FullBody.gltf');
const skinned=[];model.scene.traverse(object=>{if(object.isSkinnedMesh)skinned.push(object);});
const target=skinned.find(mesh=>mesh.geometry.attributes.position.count>1000);
const head=target.skeleton.getBoneByName('Head');
if(!target||!head)throw Error('Expected Quaternius humanoid rig and head bone');
// Runtime cartoon eyes replace the source eye/brow meshes and their unused bitmap.
for(const mesh of skinned)if(mesh!==target)mesh.removeFromParent();
model.scene.updateMatrixWorld(true);
const colors={skin:new THREE.Color('#d8ac8b'),shirt:new THREE.Color('#275e90'),tee:new THREE.Color('#f3eed6'),pants:new THREE.Color('#273a36'),boot:new THREE.Color('#e8bc59'),hair:new THREE.Color('#303b3d')};
for(const mesh of skinned){
 mesh.frustumCulled=false;
 const material=mesh.material;
 if(material.name==='MI_Hair_1')material.color.copy(colors.hair);
 if(mesh===target){
  const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal,values=new Uint8Array(position.count*3);
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
   const dressed=y<1.55&&Math.abs(x)<.74;
   let color=colors.skin;
   if(dressed){
    color=y<.035?colors.tee:y<.16?colors.boot:y<.97?colors.pants:colors.shirt;
    // A little ease in the garment silhouette; original skin weights remain intact.
    const hem=Math.min(1,Math.max(0,(y-.16)*20),Math.max(0,(1.55-y)*20),Math.max(0,(.74-Math.abs(x))*20));
    const ease=hem*(y>.97?.035:.055);
    position.setXYZ(i,x+normal.getX(i)*ease,y,z+normal.getZ(i)*ease);
   }
   values[i*3]=Math.round(color.r*255);values[i*3+1]=Math.round(color.g*255);values[i*3+2]=Math.round(color.b*255);
  }
  mesh.geometry.setAttribute('color',new THREE.BufferAttribute(values,3,true));mesh.geometry.computeVertexNormals();material.vertexColors=true;
 }
 // Bone indices fit in a byte; leave floating point weights unchanged.
 const joints=mesh.geometry.attributes.skinIndex;
 if(joints&&Math.max(...joints.array)<256)mesh.geometry.setAttribute('skinIndex',new THREE.BufferAttribute(new Uint8Array(joints.array),4));
}
const hair=await loadLocalGLTF('Hair_SimpleParted.gltf');
const hairMesh=hair.scene.getObjectByName('Hair_SimpleParted');
const hairGeometry=hairMesh.geometry.clone(),count=hairGeometry.attributes.position.count,headIndex=target.skeleton.bones.indexOf(head);
const indices=new Uint8Array(count*4),weights=new Float32Array(count*4);
for(let i=0;i<count;i++){indices[i*4]=headIndex;weights[i*4]=1;}
hairGeometry.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));hairGeometry.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));
const hairstyle=new THREE.SkinnedMesh(hairGeometry,new THREE.MeshStandardMaterial({name:'Engineer_Hair',color:colors.hair,roughness:1}));
hairstyle.name='Engineer_Hair';hairstyle.bind(target.skeleton,target.bindMatrix);model.scene.add(hairstyle);
const source=await loadGLB(resolve(motionDirectory,'source-rig.glb'),true);
let sourceMesh;source.scene.traverse(object=>{if(object.isSkinnedMesh&&!sourceMesh)sourceMesh=object;});
source.scene.updateMatrixWorld(true);
const targetHip=target.skeleton.getBoneByName('pelvis').getWorldPosition(new THREE.Vector3()).y;
const sourceHip=sourceMesh.skeleton.getBoneByName('pelvis').getWorldPosition(new THREE.Vector3()).y;
const names=Object.fromEntries(target.skeleton.bones.map(bone=>[bone.name,bone.name==='Head'?'head':bone.name]));
const selections=[['idle','idle-a'],['walk','walk-relaxed'],['run','jog'],['jumpStart','jump-start'],['jumpAir','jump-air'],['land','jump-land'],['wave','greeting']];
const clips=[];
for(const [name,file] of selections){
 target.skeleton.pose();sourceMesh.skeleton.pose();model.scene.updateMatrixWorld(true);source.scene.updateMatrixWorld(true);
 const input=await loadGLB(resolve(motionDirectory,file+'.glb'));
 const clip=retargetClip(target,sourceMesh,input.animations[0],{fps:24,names,hip:'pelvis',scale:targetHip/sourceHip,preserveBonePositions:true,preserveBoneMatrix:true});
 clip.name=name;
 for(const track of clip.tracks)track.name=track.name.replace(/^\.bones\[([^\]]+)\]/,'$1');
 // The parent root converts Blender Z-up to world Y-up. Keep local Z (vertical),
 // suppress local X/Y travel: the spherical simulation owns horizontal position.
 const hipTrack=clip.tracks.find(track=>track.name==='pelvis.position');
 if(hipTrack)for(let i=0;i<hipTrack.values.length;i+=3){hipTrack.values[i]=hipTrack.values[0];hipTrack.values[i+1]=hipTrack.values[1];}
 clip.optimize();clips.push(clip);
 console.log(name,clip.duration.toFixed(3),clip.tracks.length,'tracks');
}
target.skeleton.pose();model.scene.updateMatrixWorld(true);
model.scene.name='Quaternius_Engineer';
// Normalize once in the file; accessory sockets use the same 2.6-unit character height.
const bounds=new THREE.Box3().setFromObject(model.scene),scale=2.6/(bounds.max.y-bounds.min.y);
model.scene.scale.setScalar(scale);model.scene.position.y=-bounds.min.y*scale;model.scene.updateMatrixWorld(true);
// Retain only the weighted head. Original garment/limb volumes now follow the same rig at runtime.
const full=target.geometry,index=full.index,position=full.attributes.position,triangles=[];
for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];if(ids.every(id=>position.getY(id)>1.54))triangles.push(...ids);}
const used=[...new Set(triangles)],lookup=new Map(used.map((id,i)=>[id,i])),headGeometry=new THREE.BufferGeometry();
for(const [name,attribute] of Object.entries(full.attributes)){
 const values=new attribute.array.constructor(used.length*attribute.itemSize);
 used.forEach((id,i)=>{for(let c=0;c<attribute.itemSize;c++)values[i*attribute.itemSize+c]=attribute.array[id*attribute.itemSize+c];});
 headGeometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize,attribute.normalized));
}
headGeometry.setIndex(triangles.map(id=>lookup.get(id)));target.geometry=headGeometry;target.name='Engineer_Head';
const exported=await new GLTFExporter().parseAsync(model.scene,{binary:true,animations:clips,onlyVisible:true});
// All visible color is geometry/shader driven; no unused source texture set is exported.
const result=Buffer.from(exported);
await mkdir(dirname(output),{recursive:true});await writeFile(output,result);
await writeFile(resolve(dirname(output),'LICENSE-Quaternius.txt'),await readFile(resolve(modelDirectory,'LICENSE.txt')));
await writeFile(resolve(dirname(output),'LICENSE-Mesh2Motion.txt'),await readFile(resolve(motionDirectory,'LICENSE-CC0.MD')));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const inputs=[];
for(const file of ['Superhero_Male_FullBody.gltf','Superhero_Male_FullBody.bin','Hair_SimpleParted.gltf','Hair_SimpleParted.bin','LICENSE.txt']){
 const bytes=await readFile(resolve(modelDirectory,file));inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});
}
await writeFile(resolve(dirname(output),'provenance.json'),JSON.stringify({
 asset:'engineer.glb',bytes:result.length,sha256:hash(result),
 character:{creator:'Quaternius',pack:'Universal Base Characters [Standard]',source:'https://quaternius.itch.io/universal-base-characters',license:'CC0 1.0, as supplied in License_Standard.txt',inputs,adaptation:'Weighted source head and hair on the original humanoid skeleton; source body anatomy, eye/brow meshes and textures removed. Original cartoon garments, limbs, mittens, shoes and face attach at runtime. Neutral rig normalized to 2.6 units before trimming; runtime short stature and enlarged head.'},
 motion:{source:'https://github.com/Mesh2Motion/mesh2motion-app',revision:'4f1316296660f2b9827ff46b4db10fb241ec2147',license:'CC0 1.0 (LICENSE-CC0.MD)',files:selections.map(([,file])=>file+'.glb'),preparation:'Retargeted locally with Three.js SkeletonUtils.retargetClip at 24fps; local X/Y hip travel suppressed, local Z-up vertical bob retained.'},
 originalAccessories:'Five seasonal hats, glasses and satchel built from original procedural geometry at runtime.',
 preparation:'node scripts/character/prepare.mjs <extracted-character-inputs> <downloaded-motion-inputs>'
},null,2)+'\n');
console.log('asset',result.length,'bytes','sha256',hash(result));
