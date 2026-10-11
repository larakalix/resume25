import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Offline preparation of the creator's supplied files, never run a script from an asset archive.
const [fbxPath,palettePath]=process.argv.slice(2);
if(!fbxPath)throw new Error('Provide SimplePolygon_HousePack.fbx and optionally SimplePolygon_MultiColorPalette.png.');
const source=await readFile(fbxPath),palette=palettePath?await readFile(palettePath):undefined,pixels=palettePath?JSON.parse(execFileSync('python3',['-c','from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert("RGB"); print(json.dumps({"width":im.width,"height":im.height,"pixels":list(im.tobytes())}))',palettePath],{maxBuffer:32*1024*1024}).toString()):undefined;
const textureLoad=THREE.TextureLoader.prototype.load;let pack;
try{THREE.TextureLoader.prototype.load=()=>new THREE.Texture();pack=new FBXLoader().parse(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'');}finally{THREE.TextureLoader.prototype.load=textureLoad;}
pack.updateMatrixWorld(true);
const names=['Cube008','Cube010','Cube004','Cube015','Cube012','Cube013','Cube009'],scene=new THREE.Scene(),models=[],color=new THREE.Color(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
const walls=[0xe9ddc6,0xc5d7ce,0xe5c6b8,0xd5dadd,0xe7d4bd,0xc7d8cc,0xdad1df],roofs=[0x31546b,0xb66e56,0x447165,0x4b5b78,0xad705a,0x426b74,0x725d6e];
for(const [modelIndex,name] of names.entries()){
 const part=pack.getObjectByName(name);if(!part?.isMesh)throw new Error(`Missing actual source mesh ${name}`);
 // The source entrances face +X. Bake that authored frontage onto the world's +Z door convention.
 const geometry=part.geometry.clone().applyMatrix4(part.matrixWorld).rotateY(-Math.PI/2);geometry.computeBoundingBox();
 const box=geometry.boundingBox,centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),colors=new Float32Array(position.count*3);
 if(!uv)throw new Error(`${name} has no palette UVs`);
 for(let i=0;i<position.count;i++){
  position.setXYZ(i,(position.getX(i)-centre.x)/size.x,(position.getY(i)-box.min.y)/size.x,(position.getZ(i)-centre.z)/size.x);
 }
 for(let i=0;i<position.count;i+=3){
  a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);const normalY=b.sub(a).cross(c.sub(a)).normalize().y,relativeY=(position.getY(i)+position.getY(i+1)+position.getY(i+2))/(3*size.y/size.x);
  for(let vertex=i;vertex<i+3;vertex++){
   const u=uv.getX(vertex),v=uv.getY(vertex);
   if(pixels){
    const x=Math.min(pixels.width-1,Math.max(0,Math.floor(u*pixels.width))),y=Math.min(pixels.height-1,Math.max(0,Math.floor((1-v)*pixels.height))),offset=(y*pixels.width+x)*3;
    color.setRGB(pixels.pixels[offset]/255,pixels.pixels[offset+1]/255,pixels.pixels[offset+2]/255,THREE.SRGBColorSpace).multiply(part.material.color);
   }else{
    // Preserve the source's UV regions, with explicitly authored replacement colours. The creator's PNG was unavailable.
    const wall=u>.27&&u<.32&&v>.30&&v<.35,pane=u<.07&&v>.26&&v<.32,door=u<.07&&v>.10&&v<.17,roof=u>.10&&u<.15&&v>.19&&v<.25;
    color.setHex(wall?walls[modelIndex]:pane?0x29495b:door?0x6b5141:roof&&relativeY>.48&&normalY>.12?roofs[modelIndex]:roof?0x77624c:0xc6b48e);
   }
   colors.set(color.toArray(),vertex*3);
  }
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.deleteAttribute('uv');
 const welded=mergeVertices(geometry,1e-5);geometry.dispose();welded.computeBoundingBox();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0}),mesh=new THREE.Mesh(welded,material);mesh.name=name;scene.add(mesh);
 models.push({name,width:1,height:size.y/size.x,depth:size.z/size.x,triangles:welded.index.count/3});
}
globalThis.FileReader??=class FileReader{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const glb=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true}),bytes=Buffer.from(glb),hash=buffer=>createHash('sha256').update(buffer).digest('hex');
await mkdir(new URL('../public/models/city-street/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/models/city-street/simple-houses.glb',import.meta.url),bytes);
const manifest={creator:'SimplePolygon',credit:'3D Assets made by SimplePolygon',source:'https://simplepolygon.itch.io/simple-houses-lowpoly-pack',reference:'https://sketchfab.com/3d-models/free-simple-house-pack-asset-pack-a6410823481348d3b4ac1bb3b198adf0',licenseUrl:'https://simplepolygon.itch.io/simple-houses-lowpoly-pack',terms:'Personal and commercial end-project use with credit; no standalone redistribution or resale.',sourceSha256:hash(source),paletteSha256:palette?hash(palette):null,sha256:hash(bytes),bytes:bytes.length,sourceColorsRetained:!!palette,front:'+Z',preparation:`Seven actual source meshes. World transforms and -90 degree Y frontage rotation baked; centred in X/Z, base at Y=0 and width=1; ${palette?'source palette UV colours':'authored replacement colours using source UV regions and face orientation'} baked to linear vertex colours; coincident vertices indexed. No procedural replacement geometry.`,models};
await writeFile(new URL('../src/experience/globe/assets/simple-houses.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
scene.traverse(object=>{if(object.isMesh){object.geometry.dispose();object.material.dispose();}});
console.log(`Prepared ${models.length} actual houses, ${models.reduce((n,m)=>n+m.triangles,0)} triangles, ${bytes.length} GLB bytes.`);
