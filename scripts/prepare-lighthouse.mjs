import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Offline normalization of the creator-supplied GLB. No network, images, code or new dependencies execute.
const [sourcePath]=process.argv.slice(2);
if(!sourcePath)throw new Error('Provide the Lighthouse by CG ART Creation - c1-hm3Zs-8U.glb downloaded from Poly Pizza.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const expectedSource={bytes:361436,sha256:'32173017e141d23e5e83245b36f5db075a753ed5d4136508880fceff013b8078'};
const original=await readFile(sourcePath);
if(original.length!==expectedSource.bytes||hash(original)!==expectedSource.sha256)throw new Error('The lighthouse source differs from the verified Poly Pizza download.');

function parse(bytes){
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('Invalid GLB 2 header.');
 let json,bin;
 for(let offset=12;offset<bytes.length;){
  const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4),end=offset+8+length;
  if(end>bytes.length||length%4)throw new Error('Invalid GLB chunk length.');
  const chunk=bytes.subarray(offset+8,end);
  if(type===0x4e4f534a){if(json)throw new Error('Duplicate JSON chunk.');json=JSON.parse(chunk.toString('utf8'));}
  else if(type===0x004e4942){if(bin)throw new Error('Duplicate binary chunk.');bin=chunk;}
  else throw new Error('Unexpected source GLB chunk.');
  offset=end;
 }
 if(!json||!bin||json.buffers.length!==1||json.buffers[0].uri||json.buffers[0].byteLength!==bin.length)throw new Error('The model must be one self-contained binary GLB.');
 return{json,bin};
}
function accessor(json,bin,index){
 const value=json.accessors[index],view=json.bufferViews[value?.bufferView],sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},readers={5123:['readUInt16LE',2],5126:['readFloatLE',4]},reader=readers[value?.componentType],components=sizes[value?.type];
 if(!value||!view||view.buffer!==0||value.sparse||!reader||!components)throw new Error(`Unsupported source accessor ${index}.`);
 const offset=(view.byteOffset??0)+(value.byteOffset??0),stride=view.byteStride??components*reader[1],end=offset+(value.count-1)*stride+components*reader[1];
 if(value.count<1||stride<components*reader[1]||offset<0||end>(view.byteOffset??0)+view.byteLength||end>bin.length)throw new Error(`Out-of-bounds source accessor ${index}.`);
 return{value,offset,stride,components,get(row,column){const result=bin[reader[0]](offset+row*stride+column*reader[1]);if(!Number.isFinite(result))throw new Error(`Non-finite source accessor ${index}.`);return result;}};
}
function boundsOf(data){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let horizontalRadius=0;
 for(let row=0;row<data.value.count;row++){
  const p=[0,1,2].map(column=>data.get(row,column));
  for(let column=0;column<3;column++){min[column]=Math.min(min[column],p[column]);max[column]=Math.max(max[column],p[column]);}
  horizontalRadius=Math.max(horizontalRadius,Math.hypot(p[0],p[2]));
 }
 return{min,max,width:max[0]-min[0],height:max[1]-min[1],depth:max[2]-min[2],horizontalRadius};
}
function combined(values){
 const min=[0,1,2].map(axis=>Math.min(...values.map(value=>value.min[axis]))),max=[0,1,2].map(axis=>Math.max(...values.map(value=>value.max[axis])));
 return{min,max,width:max[0]-min[0],height:max[1]-min[1],depth:max[2]-min[2],horizontalRadius:Math.max(...values.map(value=>value.horizontalRadius))};
}
function imageRecord(json,bin){
 if(json.images.length!==1)throw new Error('The original embedded lighthouse PNG must remain present.');
 const image=json.images[0],view=json.bufferViews[image.bufferView];
 if(image.uri||image.mimeType!=='image/png'||!view||view.buffer!==0)throw new Error('Unexpected lighthouse image storage.');
 const bytes=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('The embedded image is not the source PNG.');
 return{name:image.name,mimeType:image.mimeType,bytes:bytes.length,sha256:hash(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
const {json,bin}=parse(original),binary=Buffer.from(bin);
if(json.nodes.length!==3||json.meshes.length!==3||json.animations?.length||json.skins?.length||json.extensionsRequired?.length)throw new Error('Unexpected animated or extended source geometry.');
const models=json.nodes.map(node=>{
 if(node.matrix||node.translation||node.rotation||node.scale||node.children)throw new Error('Source nodes must retain identity transforms.');
 const mesh=json.meshes[node.mesh],primitive=mesh.primitives[0];
 if(mesh.primitives.length!==1||primitive.mode!==4)throw new Error('Expected one triangle primitive per lighthouse mesh.');
 const position=accessor(json,bin,primitive.attributes.POSITION),normal=accessor(json,bin,primitive.attributes.NORMAL),uv=accessor(json,bin,primitive.attributes.TEXCOORD_0),indices=accessor(json,bin,primitive.indices);
 if(position.components!==3||normal.components!==3||uv.components!==2||position.value.componentType!==5126||normal.value.count!==position.value.count||uv.value.count!==position.value.count||indices.components!==1||indices.value.count%3)throw new Error('Inconsistent source geometry.');
 for(let row=0;row<position.value.count;row++)for(let column=0;column<3;column++){normal.get(row,column);if(column<2)uv.get(row,column);}
 for(let row=0;row<indices.value.count;row++)if(indices.get(row,0)>=position.value.count)throw new Error('An original index is outside its source vertex array.');
 return{name:node.name,mesh:mesh.name,vertices:position.value.count,triangles:indices.value.count/3,materialIndex:primitive.material,positionAccessor:primitive.attributes.POSITION,sourceBounds:boundsOf(position)};
});
if(models.reduce((sum,model)=>sum+model.triangles,0)!==1830)throw new Error('The original lighthouse topology changed.');
const sourceBounds=combined(models.map(model=>model.sourceBounds)),centre=[(sourceBounds.min[0]+sourceBounds.max[0])/2,sourceBounds.min[1],(sourceBounds.min[2]+sourceBounds.max[2])/2],scale=1/sourceBounds.height;
// The verified source's elongated +Y tower and ascending glass/light bands establish +Y up.
if(sourceBounds.height<2*sourceBounds.width||sourceBounds.height<2*sourceBounds.depth||sourceBounds.min[1]!==0||models.find(model=>model.name==='lighthouse_light')?.sourceBounds.min[1]<sourceBounds.height*.7)throw new Error('The source no longer matches its verified +Y-up tower orientation.');
const changedRanges=[];
for(const model of models){
 const data=accessor(json,binary,model.positionAccessor);
 for(let row=0;row<data.value.count;row++){
  for(let column=0;column<3;column++)binary.writeFloatLE((data.get(row,column)-centre[column])*scale,data.offset+row*data.stride+column*4);
  changedRanges.push([data.offset+row*data.stride,data.offset+row*data.stride+12]);
 }
 const prepared=boundsOf(data);data.value.min=prepared.min;data.value.max=prepared.max;model.bounds=prepared;
}
// A byte mask proves normals, UVs, indices, padding and image bytes did not change.
const positionBytes=new Uint8Array(bin.length);for(const [start,end] of changedRanges)positionBytes.fill(1,start,end);
for(let offset=0;offset<bin.length;offset++)if(!positionBytes[offset]&&bin[offset]!==binary[offset])throw new Error('Non-position binary source content changed.');
const sourceImage=imageRecord(json,bin),preparedImage=imageRecord(json,binary);
if(sourceImage.sha256!==preparedImage.sha256)throw new Error('The embedded original PNG changed.');
const copyright='Lighthouse by CG ART Creation, via Poly Pizza (https://poly.pizza/m/c1-hm3Zs-8U), CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). Normalized uniformly, centered in X/Z and based at Y=0 for this portfolio.';
json.asset.copyright=copyright;
const jsonBytes=Buffer.from(JSON.stringify(json)),paddedJson=Buffer.concat([jsonBytes,Buffer.alloc((4-jsonBytes.length%4)%4,0x20)]),header=Buffer.alloc(12),jsonHeader=Buffer.alloc(8),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+paddedJson.length+8+binary.length,8);jsonHeader.writeUInt32LE(paddedJson.length);jsonHeader.writeUInt32LE(0x4e4f534a,4);binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);
const output=Buffer.concat([header,jsonHeader,paddedJson,binHeader,binary]),check=parse(output),bounds=combined(models.map(model=>model.bounds));
if(Math.abs(bounds.height-1)>1e-7||Math.abs(bounds.min[1])>1e-7||Math.abs(bounds.min[0]+bounds.max[0])>1e-7||Math.abs(bounds.min[2]+bounds.max[2])>1e-7)throw new Error('Prepared lighthouse is not based and uniformly normalized.');
for(const model of models){
 const actual=boundsOf(accessor(check.json,check.bin,model.positionAccessor));
 if(JSON.stringify(actual)!==JSON.stringify(model.bounds))throw new Error('Reloaded bounds differ from the prepared manifest.');
 for(const axis of [0,1,2])for(const edge of ['min','max'])if(Math.abs(actual[edge][axis]-(model.sourceBounds[edge][axis]-centre[axis])*scale)>1e-7)throw new Error('Prepared bounds no longer preserve source proportions.');
}
if(JSON.stringify(check.json.materials)!==JSON.stringify(json.materials)||imageRecord(check.json,check.bin).sha256!==sourceImage.sha256)throw new Error('Reloaded source appearance differs.');
const light=models.find(model=>model.name==='lighthouse_light'),beacon={mesh:light.name,center:[0,1,2].map(axis=>(light.bounds.min[axis]+light.bounds.max[axis])/2),color:json.materials[light.materialIndex].pbrMetallicRoughness.baseColorFactor.slice(0,3)};
const manifest={name:'Lighthouse',creator:'CG ART Creation',credit:'Lighthouse by CG ART Creation via Poly Pizza',source:'https://poly.pizza/m/c1-hm3Zs-8U',license:'CC BY 3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0/',sourceFile:'Lighthouse by CG ART Creation - c1-hm3Zs-8U.glb',sourceBytes:original.length,sourceSha256:hash(original),bytes:output.length,sha256:hash(output),up:'+Y',triangles:1830,sourceColorsRetained:true,sourceTextureRetained:true,sourceBounds,bounds,normalization:{center:centre,scale,height:1},beacon,embeddedImage:preparedImage,materials:json.materials,textures:json.textures,samplers:json.samplers,preparation:'Actual original three-mesh model. Only POSITION values and their accessor bounds are normalized: full X/Z bounds centered, base Y=0, uniform height=1. Source topology, normals, UVs, material factors, samplers and original embedded PNG bytes are unchanged.',models};
await mkdir(new URL('../public/models/lighthouse/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/models/lighthouse/lighthouse.glb',import.meta.url),output);
await writeFile(new URL('../src/experience/globe/assets/lighthouse.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared actual lighthouse: ${models.length} meshes, ${manifest.triangles} triangles, ${output.length} bytes, PNG ${preparedImage.width}×${preparedImage.height} retained.`);
