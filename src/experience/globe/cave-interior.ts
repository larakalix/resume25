import {buildSecretArt} from './secret-art.ts'
import * as THREE from 'three'
import {createGlobeArt} from './art-kit.ts'
import type {createInterior} from './interiors.ts'

export function createCaveInterior(id:'crystal-cave'|'tide-cave'):ReturnType<typeof createInterior>{
 const scene=new THREE.Scene(),art=createGlobeArt(scene),{kit,mesh,block,sign}=art,tide=id==='tide-cave'
 block('sand',[0,-.15,0],[8.4,.3,8.4]);block('navy',[0,.015,.1],[4.8,.02,6.8])
 for(const x of [-3.7,3.7])for(let i=0;i<6;i++){const rock=mesh(kit.leaf,i%2?'sand':'cream',[x,1.3,-3.5+i*1.4],[.8,1.8,1.0]);rock.rotation.z=x>0?.12:-.12}
 for(let i=0;i<6;i++)mesh(kit.leaf,i%2?'cream':'sand',[-3.5+i*1.4,1.4,-3.7],[1.0,1.9,.8])
 const glow=new THREE.MeshStandardMaterial({color:tide?0x63cbd6:0x9f8adb,emissive:tide?0x3189a3:0x6c4ec7,emissiveIntensity:.6,roughness:.7});kit.extras.push(glow)
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const crystal=mesh(kit.cone,'violet',[side*(2.9+(i%2)*.15),.5+(i%3)*.12,-2.8+i*1.2],[.26,.9+(i%3)*.22,.26]);crystal.material=glow;crystal.rotation.z=-side*.18
 }
 const pool=new THREE.MeshStandardMaterial({color:tide?0x207b90:0x446c9e,emissive:0x183645,emissiveIntensity:.2,roughness:.3});kit.extras.push(pool)
 const water=mesh(kit.cylinder,'blue',[0,.04,-2.6],[1.1,.04,.65]);water.material=pool
 sign(tide?'Tideglass Cave':'Firefly Grotto',[0,2.6,-3.5],3,scene)
 sign('Follow the pale stones',[0,1.5,-3.5],2.6,scene)
 for(const side of [-1,1])for(let i=0;i<8;i++)mesh(kit.leaf,'cream',[side*2.2,.055,-2.4+i*.7],[.1,.06,.16])
 block('blue',[0,.04,3.8],[1.8,.07,.7]);const light=new THREE.PointLight(tide?0x83dbe0:0xbba1ff,12,10);light.position.set(0,2,0);scene.add(light);buildSecretArt(art,id);art.finish()
 return{scene,art,host:undefined,ivan:undefined,cat:undefined,update(){},dispose(){art.dispose()}}
}
