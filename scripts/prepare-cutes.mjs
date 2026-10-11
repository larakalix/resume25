import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Download the creator's normal GLTF bundle first; this script never executes vendor code.
const input=resolve(process.argv[2]??'/tmp/resume25-cutes/source'),output=resolve('public/models/cutes');
const choices=[['generic-male','Generic Male','jNp6bjMW9a'],['generic-female','Generic Female','qot6C6GS9U'],['citizen-one','Citizen 1','sYl7E9whZH'],['citizen-two','Citizen 2','M37AwJwOzy'],['citizen-three','Citizen 3','26UC5iU4Fk'],['food-worker','Food Worker','6cjgeTS8Pl']];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
globalThis.ProgressEvent??=class{constructor(type,options){this.type=type;Object.assign(this,options);}};
await mkdir(output,{recursive:true});const models=[];
for(const[id,title,publicId]of choices){
 const path=resolve(input,`${title}.glb`),bytes=await readFile(path),length=bytes.readUInt32LE(12),source=JSON.parse(bytes.subarray(20,20+length));
 if(bytes.readUInt32LE(0)!==0x46546c67||!source.images?.length||!source.skins?.length)throw new Error(`Incomplete source: ${title}`);
 // Node inspection skips only image decoding. The shipped GLB is copied byte-for-byte.
 const fixture=structuredClone(source);fixture.materials.forEach(material=>{delete material.pbrMetallicRoughness?.baseColorTexture;});delete fixture.images;delete fixture.textures;delete fixture.samplers;
 fixture.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
 const asset=await new GLTFLoader().parseAsync(JSON.stringify(fixture),'');asset.scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(asset.scene),meshes=[];asset.scene.traverse(object=>{if(object instanceof THREE.SkinnedMesh)meshes.push({name:object.name,triangles:(object.geometry.index?.count??object.geometry.attributes.position.count)/3,vertices:object.geometry.attributes.position.count,bones:object.skeleton.bones.length});});
 const binaryOffset=28+length,image=source.images[0],view=source.bufferViews[image.bufferView],png=bytes.subarray(binaryOffset+(view.byteOffset??0),binaryOffset+(view.byteOffset??0)+view.byteLength);
 if(id==='generic-male')await writeFile(resolve(output,'gradient-atlas.png'),png);
 await copyFile(path,resolve(output,`${id}.glb`));
 models.push({id,title,url:`/models/cutes/${id}.glb`,source:`https://poly.pizza/m/${publicId}`,sha256:digest(bytes),bytes:bytes.length,atlasSha256:digest(png),materialNames:source.materials.map(material=>material.name),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},meshes,clips:asset.animations.map(clip=>({name:clip.name,duration:clip.duration,tracks:clip.tracks.length}))});
}
const manifest={version:1,creator:'J-Toastie',bundle:'https://poly.pizza/bundle/CUTES-Part-One-WD91WrT0gx',download:'https://static.poly.pizza/list/WD91WrT0gx-glb-1330409802.zip',license:'CC-BY-3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0/',atlasCredit:'Modified Kay Lousberg gradient atlas, supplied by J-Toastie',preparation:'Source GLBs copied byte-for-byte. Runtime normalizes height uniformly; source UVs, embedded atlas, rig, mesh geometry and five authored animation clips remain intact. Ivan adds original accessories and a blue/white garment shader mask.',models};
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({models:models.length,bytes:models.reduce((sum,model)=>sum+model.bytes,0),output}));
