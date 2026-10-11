import * as THREE from 'three'
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {createArtKit} from '../explorer/art-kit.ts'
import type {ArtColor} from '../explorer/art-kit.ts'
import {normalAt,heightAt,RADIUS} from './geography.ts'
import type {OcclusionGroup} from './occlusion.ts'

export const palette={blue:0x357db8,navy:0x263b4e,cream:0xf5e7c4,sand:0xd3b58b,grass:0x72a76e,green:0x397958,mint:0xb3ce8b,wood:0x987052,gold:0xe8bc62,pale:0x7bc8cb,skin:0xf2c6a1,hair:0x37415a,coral:0xe78a70,red:0xc65e63,violet:0x9282ad}
export function frameAt(x:number,z:number,level=heightAt({x,z})){
 const n=normalAt(x,z),up=new THREE.Vector3(n.x,n.y,n.z),east=new THREE.Vector3(Math.cos(x/RADIUS),-Math.sin(x/RADIUS),0),south=new THREE.Vector3().crossVectors(east,up).normalize(),matrix=new THREE.Matrix4().makeBasis(east,up,south)
 matrix.setPosition(up.clone().multiplyScalar(RADIUS+level));return matrix
}
export function createGlobeArt(scene:THREE.Scene,surface?:{heightAt:(point:{x:number;z:number})=>number}){
 const ground=surface?.heightAt??heightAt
 const frame=(x:number,z:number,level=ground({x,z}))=>frameAt(x,z,level)
 const kit=createArtKit(scene,{palette,shading:'soft'}),textures:THREE.Texture[]=[],occlusionGroups:OcclusionGroup[]=[]
 function mesh(g:THREE.BufferGeometry,color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D=scene,dynamic=false){return kit.mesh(g,color,p,s,parent,dynamic,false)}
 function root(x:number,z:number,lift=0,level?:number){const group=new THREE.Group();group.applyMatrix4(frame(x,z,(level??ground({x,z}))+lift));scene.add(group);return group}
 function block(color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D=scene,dynamic=false){const g=new RoundedBoxGeometry(...s,2,.07);kit.geometries.push(g);return mesh(g,color,p,[1,1,1],parent,dynamic)}
 function beam(a:THREE.Vector3,b:THREE.Vector3,r:number,color:ArtColor,parent:THREE.Object3D=scene,dynamic=false){const d=b.clone().sub(a),part=mesh(kit.cylinder,color,a.clone().lerp(b,.5).toArray() as [number,number,number],[r,d.length(),r],parent,dynamic);part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return part}
 function tube(points:number[][],radius:number,color:ArtColor,parent:THREE.Object3D=scene,dynamic=false){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0]!,p[1]!,p[2]!))),20,radius,7,false);kit.geometries.push(g);return mesh(g,color,[0,0,0],[1,1,1],parent,dynamic)}
 function sign(text:string,p:[number,number,number],w:number,parent:THREE.Object3D){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle='#fff5dd';c.fillRect(0,0,512,128);c.fillStyle='#263b4e';c.textAlign='center';c.textBaseline='middle';c.font='600 48px sans-serif';c.fillText(text,256,66,470);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const material=new THREE.MeshStandardMaterial({map:texture,roughness:.9});kit.extras.push(material);const g=new THREE.PlaneGeometry(w,w/4);kit.geometries.push(g);const value=new THREE.Mesh(g,material);value.position.set(...p);parent.add(value);return value}
 function finish(){return kit.batch(kit.staticMeshes.splice(0))}
 function fadeable(id:string,group:THREE.Object3D,surfaces:THREE.Mesh[]=[]){
  const descendants=new Set<THREE.Mesh>();group.traverse(child=>{if(child instanceof THREE.Mesh)descendants.add(child)})
  const parts:THREE.Mesh[]=[];for(let i=kit.staticMeshes.length-1;i>=0;i--)if(descendants.has(kit.staticMeshes[i]!)){parts.push(kit.staticMeshes[i]!);kit.staticMeshes.splice(i,1)}
  const batch=kit.batch(parts),visuals=[...batch.meshes];group.traverse(child=>{if(child instanceof THREE.Mesh)visuals.push(child)})
  occlusionGroups.push({id,meshes:[...batch.meshes,...surfaces],visuals})
 }
 return{kit,scene,heightAt:ground,frameAt:frame,mesh,root,block,beam,tube,sign,finish,fadeable,occlusionGroups,dispose(){textures.forEach(t=>t.dispose());kit.dispose()}}
}
export type GlobeArtist=ReturnType<typeof createGlobeArt>
