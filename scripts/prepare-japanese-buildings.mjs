import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Offline preparation reads the creator's supplied GLBs; it never executes archive contents.
const [sourceDirectory,archivePath]=process.argv.slice(2);
if(!sourceDirectory)throw new Error('Provide the GLB directory from LowPolyJapaneseTown_v1.0.zip, optionally followed by the original ZIP.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const archive={name:'LowPolyJapaneseTown_v1.0.zip',sha256:'23deda4956bc026000cc33f389ddf17e881371e0e1ffb985db458fa6b4ea3c7a',bytes:531564};
if(archivePath){const bytes=await readFile(archivePath);if(hash(bytes)!==archive.sha256||bytes.length!==archive.bytes)throw new Error('The archive differs from the verified creator download.');}
const sources={
 japanese_house:{sha256:'2430d2e72d3871bedf89c5546bec16f25c4fd605765778b9345b8cb1734aeb75',triangles:108},
 ramen_shop:{sha256:'f574f5263b6e0aa664d074587f3ee0a343ee84a42a9e28519b379fdb4c627be6',triangles:84},
 shrine_hall:{sha256:'81fb9e4c623e83c1a46b184b945e60781c1f9de39ad4e1ff5845cbe962bdf2eb',triangles:176},
 pagoda:{sha256:'c8935477451523954523d5975623852fb6af1b09f404b74ddd7022a666e8044c',triangles:288},
 castle_tower:{sha256:'4a80f1c17811074686ef7b0df26d755a89d6fb49757837a21abb625f5d135feb',triangles:78},
};
const loader=new GLTFLoader(),scene=new THREE.Scene(),models=[],color=new THREE.Color();
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0});
material.name='source-japanese-linear-colors';
function buffer(bytes){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}
for(const [sourceName,expected] of Object.entries(sources)){
 const sourceFile=`${sourceName}.glb`,source=await readFile(resolve(sourceDirectory,sourceFile));
 if(hash(source)!==expected.sha256)throw new Error(`Unexpected source content: ${sourceFile}`);
 const gltf=await loader.parseAsync(buffer(source),'');gltf.scene.updateMatrixWorld(true);
 const variants=[['east',Math.PI/2],['west',-Math.PI/2],...(sourceName==='shrine_hall'?[['front',0]]:[])];
 for(const [direction,rotationY] of variants){
  const parts=[];let sourceTriangles=0;
  gltf.scene.traverse(part=>{
   if(!part.isMesh)return;
   if(Array.isArray(part.material)||part.material.map||part.material.emissiveMap)throw new Error(`Unexpected textured or multi-material primitive in ${sourceFile}`);
   const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
   geometry.applyMatrix4(part.matrixWorld).rotateY(rotationY);
   const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),sourceColor=geometry.getAttribute('color'),colors=new Float32Array(position.count*3);
   if(!normal)throw new Error(`Source normals missing from ${sourceFile}`);
   for(let i=0;i<position.count;i++){
    color.copy(part.material.color);
    if(part.material.vertexColors&&sourceColor)color.multiply(new THREE.Color(sourceColor.getX(i),sourceColor.getY(i),sourceColor.getZ(i)));
    colors.set(color.toArray(),i*3);
   }
   for(const name of Object.keys(geometry.attributes))if(name!=='position'&&name!=='normal')geometry.deleteAttribute(name);
   geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.clearGroups();parts.push(geometry);sourceTriangles+=position.count/3;
  });
  if(sourceTriangles!==expected.triangles)throw new Error(`Source triangle count differs for ${sourceFile}`);
  const merged=mergeGeometries(parts);parts.forEach(part=>part.dispose());
  if(!merged)throw new Error(`Could not merge source primitives for ${sourceFile}`);
  merged.computeBoundingBox();const box=merged.boundingBox,centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),sourceBounds={min:box.min.toArray(),max:box.max.toArray()};
  if(!(size.x>0&&size.y>0&&size.z>0))throw new Error(`Invalid source bounds for ${sourceFile}`);
  merged.translate(-centre.x,-box.min.y,-centre.z).scale(1/size.x,1/size.x,1/size.x);
  const geometry=mergeVertices(merged,1e-6);merged.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const name=`${sourceName}-${direction}`,mesh=new THREE.Mesh(geometry,material);mesh.name=name;scene.add(mesh);
  models.push({name,width:1,height:size.y/size.x,depth:size.z/size.x,triangles:sourceTriangles,sourceFile,sourceSha256:expected.sha256,rotationY,sourceBounds,sourceDimensions:{width:size.x,height:size.y,depth:size.z}});
 }
 gltf.scene.traverse(part=>{if(part.isMesh){part.geometry.dispose();part.material.dispose();}});
}
globalThis.FileReader??=class FileReader{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const bytes=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true}));
const prepared=await loader.parseAsync(buffer(bytes),'');
for(const model of models){
 const mesh=prepared.scene.getObjectByName(model.name);if(!mesh?.isMesh)throw new Error(`Prepared model missing: ${model.name}`);
 const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3()),triangleCount=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3;
 if(triangleCount!==model.triangles||Math.abs(size.x-1)>2e-6||Math.abs(size.y-model.height)>2e-6||Math.abs(size.z-model.depth)>2e-6||Math.abs(bounds.min.y)>2e-6||Math.abs(bounds.min.x+bounds.max.x)>2e-6||Math.abs(bounds.min.z+bounds.max.z)>2e-6)throw new Error(`Prepared bounds or topology differ: ${model.name}`);
}
const manifest={creator:'reodesuxz',credit:'Low Poly Japanese Town Pack by reodesuxz',source:'https://reodesuxz.itch.io/low-poly-japanese-town-pack',reference:'https://reodesuxz.itch.io/low-poly-japanese-town-pack',licenseUrl:'https://reodesuxz.itch.io/low-poly-japanese-town-pack',terms:'Unlimited personal and commercial project use and modification; no standalone asset redistribution or resale, no AI training. Attribution optional.',sourceArchive:archive,sourceSha256:archive.sha256,sha256:hash(bytes),bytes:bytes.length,sourceColorsRetained:true,up:'+Y',front:'Source frontage is +Z; named east/west variants bake +90/-90 degree Y rotations.',preparation:'Five actual creator-supplied building models. Source primitives retain their topology, normals and linear material colors. Full source world transforms and named frontage rotations are baked before complete bounds are centered in X/Z, based at Y=0 and uniformly normalized to width=1, including porches and eaves. No procedural replacement geometry or source textures.',models};
await mkdir(new URL('../public/models/japanese-town/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/models/japanese-town/town-buildings.glb',import.meta.url),bytes);
await writeFile(new URL('../src/experience/globe/assets/japanese-town.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
for(const root of [scene,prepared.scene])root.traverse(part=>{if(part.isMesh){part.geometry.dispose();part.material.dispose();}});
console.log(`Prepared ${models.length} actual Japanese building variants, ${models.reduce((sum,model)=>sum+model.triangles,0)} triangles, ${bytes.length} GLB bytes.`);
