import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createArtKit } from '../explorer/art-kit.ts'
import type { ArtColor } from '../explorer/art-kit.ts'

export const storyPalette = {blue:0x427eea,navy:0x263e59,cream:0xfff0ce,sand:0xe4bd8e,grass:0x98cfa1,green:0x468b65,mint:0xb9e3c2,wood:0xa77050,gold:0xf8c760,pale:0x9edbdc,skin:0xf2c6a1,hair:0x37415a,coral:0xed8c76,red:0xd85569,violet:0x9b8bc9}

/** Shared soft PBR surfaces. Source meshes merge once; colliders stay low resolution. */
export function createStreetArtKit(scene:THREE.Scene){
    const kit=createArtKit(scene,{palette:storyPalette,shading:'soft'})
    const colliderParts:THREE.BufferGeometry[]=[],textures:THREE.Texture[]=[]
    function mesh(g:THREE.BufferGeometry,color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D=scene,options:{solid?:boolean;castShadow?:boolean}={}){
        const value=kit.mesh(g,color,p,s,parent,false,false);value.castShadow=options.castShadow!==false
        if(options.solid){value.updateWorldMatrix(true,false);const collision=new THREE.BoxGeometry(1,1,1);collision.applyMatrix4(value.matrixWorld);collision.deleteAttribute('uv');colliderParts.push(collision)}
        return value
    }
    function beam(from:THREE.Vector3,to:THREE.Vector3,radius:number,color:ArtColor,parent:THREE.Object3D=scene){const d=to.clone().sub(from),part=mesh(kit.cylinder,color,from.clone().lerp(to,.5).toArray() as [number,number,number],[radius,d.length(),radius],parent);part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return part}
    function curve(points:number[][],radius:number,color:ArtColor,parent:THREE.Object3D=scene){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0]!,p[1]!,p[2]!))),g=new THREE.TubeGeometry(path,18,radius,7,false);kit.geometries.push(g);return mesh(g,color,[0,0,0],[1,1,1],parent)}
    function root(x:number,z:number,y=0){const group=new THREE.Group();group.position.set(x,y,z);scene.add(group);return group}
    function sign(text:string,width:number,height:number,p:[number,number,number],parent:THREE.Object3D=scene){
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*height/width);const ctx=canvas.getContext('2d')!
        ctx.fillStyle='#fff5dc';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#29455d';ctx.font=`700 ${Math.round(canvas.height*.47)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,canvas.height*.52,470)
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture)
        const material=new THREE.MeshStandardMaterial({map:texture,roughness:.8,polygonOffset:true,polygonOffsetFactor:-1});kit.extras.push(material)
        const g=new THREE.PlaneGeometry(width,height);kit.geometries.push(g);const value=new THREE.Mesh(g,material);value.position.set(...p);parent.add(value);return value
    }
    function finish(){
        const parts=kit.staticMeshes.splice(0);kit.batch(parts.filter(p=>p.castShadow));kit.batch(parts.filter(p=>!p.castShadow)).meshes.forEach(p=>{p.castShadow=false})
        const collision=mergeGeometries(colliderParts)!;colliderParts.forEach(g=>g.dispose())
        return{collision,resize(_w:number,_h:number){},dispose(){collision.dispose();textures.forEach(t=>t.dispose())}}
    }
    return{kit,mesh,beam,curve,root,sign,finish}
}
export type StreetArtist=ReturnType<typeof createStreetArtKit>
