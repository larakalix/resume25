import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {cityDistrict,cityPavingBounds,cityPaved,cityRoad,cityBenches,cityLamps,cityPlanters} from './city-district.ts'
import {RADIUS} from './geography.ts'
import {createTerrainInlay} from './terrain-inlay.ts'
import {buildBuildingSign} from './building-signs.ts'

export const citySurfaceColors={road:0x657f80,walk:0xd7cfb9,roadMortar:0x506868,walkMortar:0xb8b09d,paint:0xf3e8cc,mosaic:0x417e9c,gold:0xd3b36c} as const

/** One terrain-following draw: physical-size pavers, fine mortar and painted crossings. */
export function buildCity(a:GlobeArtist){
 const {kit,scene,root,block,mesh,beam}=a,inlay=createTerrainInlay(a,'city-paving-and-markings'),{quad}=inlay,tint=new THREE.Color(),paint=new THREE.Color(citySurfaceColors.paint)
 // Longitude shrinks towards the pole. Fixed world-size bricks retain a readable scale.
 let row=0
 for(let z=cityPavingBounds.minZ;z<cityPavingBounds.maxZ;z+=.66,row++){
  const z1=Math.min(cityPavingBounds.maxZ,z+.66),latitude=Math.cos((z+z1)/2/RADIUS),step=.78/latitude,inset=.022/latitude
  let column=0
  for(let x=cityPavingBounds.minX-(row%2?step/2:0);x<cityPavingBounds.maxX;x+=step,column++){
   const x0=Math.max(cityPavingBounds.minX,x),x1=Math.min(cityPavingBounds.maxX,x+step),center={x:(x0+x1)/2,z:(z+z1)/2}
   if(x1-x0<inset*2||!cityPaved(center))continue
   const road=cityRoad(center),distance=Math.hypot(center.x*Math.cos(center.z/RADIUS),center.z-cityDistrict.arrival.z),mosaic=distance<2.5
   tint.setHex(road?citySurfaceColors.roadMortar:citySurfaceColors.walkMortar);quad(x0,z,x1,z1,.032,tint)
   const base=mosaic?(distance<.85?citySurfaceColors.gold:Math.abs(center.x*Math.cos(center.z/RADIUS))<.36||Math.abs(center.z-cityDistrict.arrival.z)<.36?citySurfaceColors.mosaic:citySurfaceColors.walk):road?citySurfaceColors.road:citySurfaceColors.walk
   tint.setHex(base).multiplyScalar(.965+((column*17+row*7)%5)*.013)
   quad(x0+inset,z+.022,x1-inset,z1-.022,.036,tint)
  }
 }
 function stripe(x0:number,z0:number,x1:number,z1:number){
  const step=.35/Math.cos((z0+z1)/2/RADIUS)
  for(let x=x0;x<x1;x+=step)for(let z=z0;z<z1;z+=.3){const endX=Math.min(x1,x+step),endZ=Math.min(z1,z+.3);if(cityPaved({x:(x+endX)/2,z:(z+endZ)/2}))quad(x,z,endX,endZ,.045,paint)}
 }
 for(const z of [34,43])for(let i=0;i<5;i++)stripe(-3.8,z+i*.42,3.8,z+i*.42+.22)
 for(const x of [-25,25])for(const z of [36,45])for(let i=-2;i<=2;i++){const scale=Math.cos(z/RADIUS),start=x+i*.44/scale;stripe(start,z-.95,start+.22/scale,z+.95)}
 const pavement=inlay.finish();pavement.name='city-pavement'
 for(const bench of cityBenches){const g=root(bench.x,bench.z);for(const side of [-1,1]){block('navy',[side*.63,.25,0],[.12,.5,.5],g);block('navy',[side*.63,.7,-.24],[.09,.75,.09],g)}for(let i=0;i<3;i++)block('wood',[0,.53,-.2+i*.18],[1.9,.11,.15],g);for(let i=0;i<2;i++)block('wood',[0,.81+i*.18,-.28],[1.9,.14,.09],g)}
 const lampMaterial=new THREE.MeshStandardMaterial({color:0xffedbc,emissive:0xffd88b,emissiveIntensity:.1,roughness:.8});kit.extras.push(lampMaterial)
 const bulbs=new THREE.InstancedMesh(kit.sphere,lampMaterial,cityLamps.length),matrix=new THREE.Matrix4();bulbs.name='city-lanterns';scene.add(bulbs);kit.instances.push(bulbs)
 for(const [index,lamp] of cityLamps.entries()){const g=root(lamp.x,lamp.z);mesh(kit.cylinder,'navy',[0,1.35,0],[.065,2.7,.065],g);mesh(kit.cylinder,'navy',[0,.12,0],[.17,.24,.17],g);block('navy',[0,2.95,0],[.54,.12,.54],g);for(const side of [-1,1])block('navy',[side*.2,2.7,0],[.035,.44,.035],g);g.updateMatrixWorld(true);matrix.makeScale(.18,.22,.18);matrix.setPosition(0,2.7,0);matrix.premultiply(g.matrixWorld);bulbs.setMatrixAt(index,matrix)}bulbs.instanceMatrix.needsUpdate=true
 for(const planter of cityPlanters){const g=root(planter.x,planter.z);mesh(kit.cylinder,'sand',[0,.22,0],[.43,.44,.43],g);mesh(kit.cylinder,'wood',[0,.45,0],[.37,.04,.37],g);for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;mesh(kit.sphere,i%2?'green':'mint',[Math.sin(angle)*.22,.66,Math.cos(angle)*.22],[.18,.26,.18],g)}}
 const gate=root(0,29);gate.name='city-gateway'
 for(const side of [-1,1]){block('navy',[side*3.2,3.1,0],[.18,6.2,.18],gate);mesh(kit.sphere,'gold',[side*3.2,6.3,0],[.15,.15,.15],gate)}
 beam(new THREE.Vector3(-3.2,6.1,0),new THREE.Vector3(3.2,6.1,0),.085,'navy',gate)
 block('blue',[0,5.4,.03],[4.8,1.45,.22],gate)
 buildBuildingSign(a,cityDistrict.name,{position:[0,5.4,.20],width:4.3,theme:'navy'},gate)
 buildBuildingSign(a,'← Old Quarter · Bluebird →',{position:[0,4.0,.15],width:4.3},gate)
 a.fadeable('city-gateway',gate)
 return{pavement,bulbs,gate,update(day:number){lampMaterial.emissiveIntensity=THREE.MathUtils.lerp(1.4,.1,day)}}
}
