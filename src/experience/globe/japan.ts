import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {frameAt} from './art-kit.ts'
import {createTerrainInlay} from './terrain-inlay.ts'
import {buildBuildingSign} from './building-signs.ts'
import {createJapaneseRoof} from './japan-roof.ts'
import {japanPavingBounds,japanPaved,japanLane,japanGate,japanGatePosts,japanLanterns,japanGardenTrees,japanBuildings} from './japan-district.ts'
import {RADIUS} from './geography.ts'

/** Original lantern lane and garden, with all ground obstacles sourced from the map data. */
export function buildJapan(a:GlobeArtist){
 const {kit,root,block,mesh,beam,tube}=a,inlay=createTerrainInlay(a,'japan-stone-lanes'),stone=new THREE.Color(),step=.56
 let row=0
 for(let z=japanPavingBounds.minZ;z<japanPavingBounds.maxZ;z+=step,row++){
  const endZ=Math.min(japanPavingBounds.maxZ,z+step),scale=Math.cos((z+endZ)/2/RADIUS),width=.72/scale,inset=.018/scale
  for(let x=japanPavingBounds.minX;x<japanPavingBounds.maxX;x+=width){
   const endX=Math.min(japanPavingBounds.maxX,x+width),point={x:(x+endX)/2,z:(z+endZ)/2}
   if(!japanPaved(point)||endX-x<inset*2)continue
   const courtyard=Math.hypot((point.x+33)*scale,point.z+36.5)<3.8
   stone.setHex(0x727d77);inlay.quad(x,z,endX,endZ,.025,stone)
   stone.setHex(courtyard?0xd8d2bd:japanLane(point)?0xc6c9b8:0x9ea99b).multiplyScalar(.96+(row%3)*.016)
   inlay.quad(x+inset,z+.018,endX-inset,endZ-.018,.036,stone)
  }
 }
 const pavement=inlay.finish(),paper=new THREE.MeshStandardMaterial({color:0xffd9aa,emissive:0xffa64d,emissiveIntensity:.08,roughness:.85});kit.extras.push(paper)
 const lampFrames:THREE.Matrix4[]=[],local=new THREE.Matrix4()
 function lantern(parent:THREE.Object3D,x:number,y:number,z:number,size:number){
  block('navy',[x,y+size*.85,z],[size*.9,.075,size*.9],parent);block('navy',[x,y-size*.85,z],[size*.75,.07,size*.75],parent)
  parent.updateWorldMatrix(true,false);local.makeScale(size*.7,size*.9,size*.7);local.setPosition(x,y,z);lampFrames.push(new THREE.Matrix4().multiplyMatrices(parent.matrixWorld,local))
  for(const offset of [-.4,0,.4]){const rib=mesh(kit.torus,'red',[x,y+size*offset,z],[size*.65,size*.65,size*.65],parent);rib.rotation.x=Math.PI/2;rib.scale.z=.11}
 }
 const gate=root(japanGate.x,japanGate.z);gate.name='japan-lantern-gate'
 for(const post of japanGatePosts){
  block('sand',[post.localX,0,post.localZ],[japanGate.postWidth,.44,japanGate.postWidth],gate)
  block('red',[post.localX,japanGate.height/2,post.localZ],[japanGate.postWidth,japanGate.height,japanGate.postWidth],gate)
  block('navy',[post.localX,.32,post.localZ],[japanGate.postWidth+.015,.12,japanGate.postWidth+.015],gate)
 }
 block('red',[0,japanGate.height-.18,0],[japanGate.halfWidth*2+.5,.24,.32],gate)
 const roof=createJapaneseRoof(japanGate.halfWidth*2+.5,1.45,.6,.28);kit.geometries.push(roof);mesh(roof,'navy',[0,japanGate.height,0],[1,1,1],gate)
 beam(new THREE.Vector3(0,japanGate.height-.12,0),new THREE.Vector3(0,4.4,0),.025,'navy',gate)
 lantern(gate,0,3.95,0,.57)
 buildBuildingSign(a,'Komorebi Quarter',{position:[0,japanGate.height+.42,.88],width:3.2,theme:'navy'},gate)
 a.fadeable('japan-lantern-gate',gate)
 for(const site of japanLanterns){
  const g=root(site.x,site.z);g.name='japan-stone-lantern'
  block('sand',[0,.10,0],[.64,.20,.64],g);block('pale',[0,.43,0],[.26,.58,.26],g)
  block('sand',[0,.78,0],[.53,.15,.53],g)
  for(const side of [-1,1])for(const end of [-1,1])block('navy',[side*.20,1.04,end*.20],[.045,.4,.045],g)
  const cap=createJapaneseRoof(.52,.52,.17,.07);kit.geometries.push(cap);mesh(cap,'navy',[0,1.23,0],[1,1,1],g)
  lantern(g,0,1.02,0,.20)
 }
 for(const [index,tree] of japanGardenTrees.entries()){
  const g=root(tree.x,tree.z);g.name=`japan-garden-${tree.variant}`
  if(tree.variant==='bamboo'){
   for(let i=0;i<5;i++){
    const x=Math.sin(i*2.4)*.19,z=Math.cos(i*2.4)*.19,h=2.6+(i%3)*.22
    mesh(kit.cylinder,'green',[x,h/2,z],[.045,h,.045],g)
    for(let j=1;j<6;j++){mesh(kit.cylinder,'mint',[x,j*h/6,z],[.052,.025,.052],g);const leaf=mesh(kit.sphere,'green',[x+(j%2?.17:-.17),j*h/6+.13,z],[.24,.055,.09],g);leaf.rotation.z=j%2?.35:-.35}
   }
  }else{
   mesh(kit.cylinder,'wood',[0,1.2,0],[.14,2.4,.14],g)
   for(const side of [-1,1])beam(new THREE.Vector3(0,1.85,0),new THREE.Vector3(side*.65,2.6,0),.08,'wood',g)
   const blossom=kit.materials.cream.clone();blossom.color.setHex(0xeab7bd);kit.extras.push(blossom)
   for(let i=0;i<5;i++){const crown=mesh(kit.sphere,'cream',[Math.sin(i*2.4)*.62,2.65+(i%2)*.35,Math.cos(i*2.4)*.48],[.80,.65,.72],g);crown.material=blossom}
  }
  g.scale.setScalar(tree.size);a.fadeable(`japan-garden-${index}`,g)
 }
 // Utility wires are attached to roof-mounted brackets, above every walking/jump path.
 for(const ids of [['japan-tea','japan-pottery'],['japan-noodles','japan-paper']] as const){
  if(ids.some(id=>japanBuildings.find(house=>house.id===id)?.cityModel))continue
  const ends=ids.map(id=>{
   const house=japanBuildings.find(house=>house.id===id)!,frame=frameAt(house.x,house.z),x=house.x<-33?house.width/2-.18:-house.width/2+.18,y=house.height+1.2,z=house.depth/2-.18,g=root(house.x,house.z)
   block('navy',[x,y-.25,z],[.07,.75,.07],g)
   return new THREE.Vector3(x,y+.1,z).applyMatrix4(frame)
  }),middle=ends[0]!.clone().lerp(ends[1]!,.5),up=middle.clone().normalize();middle.addScaledVector(up,-.45)
  tube([ends[0]!.toArray(),middle.toArray(),ends[1]!.toArray()],.018,'navy')
 }
 const lanterns=new THREE.InstancedMesh(kit.sphere,paper,lampFrames.length);lanterns.name='japan-paper-lanterns';lampFrames.forEach((frame,index)=>lanterns.setMatrixAt(index,frame));lanterns.instanceMatrix.needsUpdate=true;lanterns.castShadow=true;lanterns.computeBoundingSphere();a.scene.add(lanterns);kit.instances.push(lanterns)
 return{pavement,gate,lanterns,update(day:number){paper.emissiveIntensity=THREE.MathUtils.lerp(1.35,.08,day)}}
}
