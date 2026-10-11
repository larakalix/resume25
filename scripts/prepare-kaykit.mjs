import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,basename} from 'node:path'
import {createHash} from 'node:crypto'

// Consume the creator's downloaded pack; never change source geometry, UVs or atlas pixels.
const source=process.argv[2]
if(!source)throw new Error('Usage: node scripts/prepare-kaykit.mjs <Assets/gltf directory>')
const destination=resolve('public/models/kaykit')
const selected=['building_A_withoutBase','building_B_withoutBase','building_C_withoutBase','building_D_withoutBase','building_E_withoutBase','building_F_withoutBase','building_H_withoutBase','bench','streetlight','box_A','trash_A']
const document={asset:{version:'2.0',generator:'Ivan Lara: selected unmodified KayKit City Builder meshes'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}],materials:[],textures:[],images:[],samplers:[]}
const chunks=[],models=[];let offset=0
function append(bytes){const index=document.bufferViews.length;document.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding}return index}
for(const name of selected){
 const input=JSON.parse(await readFile(resolve(source,name+'.gltf'),'utf8')),binary=await readFile(resolve(source,input.buffers[0].uri)),base=offset,viewOffset=document.bufferViews.length,accessorOffset=document.accessors.length
 append(binary);document.bufferViews.pop()
 for(const view of input.bufferViews)document.bufferViews.push({...view,buffer:0,byteOffset:base+(view.byteOffset??0)})
 for(const accessor of input.accessors)document.accessors.push({...accessor,bufferView:accessor.bufferView+viewOffset})
 if(!document.materials.length){
  const image=await readFile(resolve(source,input.images[0].uri)),view=append(image)
  document.images=[{mimeType:'image/png',bufferView:view,name:basename(input.images[0].uri)}];document.materials=input.materials;document.textures=input.textures;document.samplers=input.samplers
 }
 const meshIndex=document.meshes.length,modelName='kay-'+name.replace('_withoutBase','').toLowerCase().replaceAll('_','-')
 document.meshes.push({...input.meshes[0],name:modelName,primitives:input.meshes[0].primitives.map(primitive=>({...primitive,indices:primitive.indices+accessorOffset,attributes:Object.fromEntries(Object.entries(primitive.attributes).map(([key,value])=>[key,value+accessorOffset])),material:0}))})
 const bounds=input.accessors[input.meshes[0].primitives[0].attributes.POSITION],nodeIndex=document.nodes.length
 document.nodes.push({mesh:meshIndex,name:modelName,translation:[0,-bounds.min[1],0]});document.scenes[0].nodes.push(nodeIndex)
 models.push({name:modelName,width:bounds.max[0]-bounds.min[0],height:bounds.max[1]-bounds.min[1],depth:bounds.max[2]-bounds.min[2],triangles:input.accessors[input.meshes[0].primitives[0].indices].count/3})
}
document.buffers[0].byteLength=offset
const json=Buffer.from(JSON.stringify(document)),jsonPadding=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks),header=Buffer.alloc(12),jsonHeader=Buffer.alloc(8),binHeader=Buffer.alloc(8)
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+jsonPadding.length+8+bin.length,8);jsonHeader.writeUInt32LE(json.length+jsonPadding.length);jsonHeader.writeUInt32LE(0x4e4f534a,4);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4)
const glb=Buffer.concat([header,jsonHeader,json,jsonPadding,binHeader,bin])
await mkdir(destination,{recursive:true});await writeFile(resolve(destination,'harbor.glb'),glb)
await writeFile(resolve(destination,'manifest.json'),JSON.stringify({source:'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',creator:'Kay Lousberg',title:'KayKit City Builder Bits',license:'CC0-1.0',changes:'Selected meshes; base-height normalization in node transform; original geometry, UVs and gradient atlas retained.',bytes:glb.length,sha256:createHash('sha256').update(glb).digest('hex'),models},null,2)+'\n')
console.log(`Prepared ${models.length} KayKit meshes, ${glb.length} bytes.`)
