import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {buildings} from './layout.ts'
import {heightAt,mapAt,RADIUS} from './geography.ts'
import {buildStoneBridge} from './stone-bridge.ts'
import {windmill} from './windmill.ts'
import {facadeLayout,foundationGeometry,gableGeometry,pitchedRoofGeometry,roofSection} from './building-geometry.ts'
import {buildDuckDock} from './duck-dock-art.ts'
import {buildBuildingSign} from './building-signs.ts'
import {cityBuildingStyle} from './building-style.ts'
import {buildJapaneseBuilding} from './japan-buildings.ts'
import {buildImportedCityBuilding} from './city-model-art.ts'
import type {CityModelLibrary} from './city-models.ts'
import type {WeatherState} from './weather.ts'

export function buildArchitecture(a:GlobeArtist,cityModels?:CityModelLibrary){
 const {kit,mesh,root,block,beam,tube,sign}=a,windows:THREE.Mesh[]=[],lanternMaterials:THREE.MeshStandardMaterial[]=[],lanterns:THREE.Mesh[]=[]
 function pot(parent:THREE.Object3D,x:number,z:number,size=.5,y=0){mesh(kit.cylinder,'coral',[x,y+size*.4,z],[size*.6,size*.8,size*.6],parent);mesh(kit.torus,'cream',[x,y+size*.8,z],[size*.59,size*.59,size*.59],parent).rotation.x=Math.PI/2;for(let i=0;i<4;i++){const leaf=mesh(kit.sphere,i%2?'mint':'green',[x+Math.sin(i*2.4)*.15,y+size*1.3,z+Math.cos(i*2.4)*.13],[.11,size*.7,.08],parent);leaf.rotation.z=Math.sin(i*2.4)*.4}}
 function window(parent:THREE.Object3D,x:number,y:number,z:number,w=1.05,h=1.2){block('wood',[x,y,z],[w+.22,h+.22,.16],parent);block('navy',[x,y,z+.12],[w,h,.08],parent);block('cream',[x,y,z+.18],[.065,h,.05],parent);block('cream',[x,y,z+.18],[w,.065,.05],parent);block('cream',[x,y-h/2-.16,z+.18],[w+.4,.16,.36],parent);const glow=kit.mesh(kit.box,'gold',[x,y,z+.168],[w*.90,h*.90,.01],parent,true,false);glow.visible=false;windows.push(glow)}
 for(const house of buildings){
  if(house.cityModel&&cityModels){buildImportedCityBuilding(a,house,cityModels);continue}
  if(house.style==='japanese'){const building=buildJapaneseBuilding(a,house);windows.push(...building.windows);lanterns.push(...building.lanterns);for(const material of building.lanternMaterials)if(!lanternMaterials.includes(material))lanternMaterials.push(material);continue}
  const h=root(house.x,house.z),{width:w,depth:d,height:y,roof:color}=house,city=house.style==='city',facade=facadeLayout(house),section=roofSection(w),style=cityBuildingStyle(house.id)
  const wall=block('cream',[0,y/2,0],[w,y,d],h),wallMaterial=city?kit.materials.cream.clone():kit.materials.cream
  if(city){wallMaterial.color.setHex(style.wall);kit.extras.push(wallMaterial);wall.material=wallMaterial}
  h.updateWorldMatrix(true,false);const base=h.position.length(),sample=new THREE.Vector3(),foundation=foundationGeometry(w+.06,d+.06,(x,z)=>{let lift=0;for(let i=0;i<4;i++){sample.set(x,lift,z).applyMatrix4(h.matrixWorld);const radius=RADIUS+heightAt(mapAt(sample.normalize()));lift=Math.sqrt(radius*radius-x*x-z*z)-base}return lift});kit.geometries.push(foundation);mesh(foundation,'sand',[0,0,0],[1,1,1],h)
  const gable=gableGeometry(w,d),roof=pitchedRoofGeometry(w,d);kit.geometries.push(gable,roof);mesh(gable,'cream',[0,y,0],[1,1,1],h).material=wallMaterial;mesh(roof,color,[0,y,0],[1,1,1],h)
  for(const side of [-1,1]){
   block(city?'sand':'wood',[side*section.halfWidth,y+section.eave+section.thickness/2,0],[.14,section.thickness+.05,d+.86],h)
   for(const end of [-1,1])beam(new THREE.Vector3(side*section.halfWidth,y+section.eave+.08,end*(d/2+.43)),new THREE.Vector3(0,y+section.rise+.08,end*(d/2+.43)),.055,city?'sand':'wood',h)
  }
  if(!city)for(let i=0;i<5;i++){const z=-d/2+i*d/4;tube([[-section.halfWidth,y+section.eave+section.thickness+.025,z],[0,y+section.rise+section.thickness+.025,z],[section.halfWidth,y+section.eave+section.thickness+.025,z]],.025,color,h)}
  block('coral',[w*.27,y+.7,-d*.25],[.50,1.3,.55],h);block('cream',[w*.27,y+1.39,-d*.25],[.7,.17,.7],h)
  block('wood',[0,1.1,d/2+.10],[1.55,2.3,.17],h);block(house.enter?'blue':'wood',[0,1.08,d/2+.22],[1.30,2.12,.10],h)
  block('cream',[0,.03,d/2+.60],[1.9,.16,1.0],h);mesh(kit.sphere,'gold',[.41,1.15,d/2+.31],[.06,.06,.045],h)
  if(city){
   const awningWidth=Math.min(2.6,w-.8),stripes=9
   for(let i=0;i<stripes;i++){const stripe=block(i%2?'cream':style.awning,[-awningWidth/2+(i+.5)*awningWidth/stripes,2.54,d/2+.52],[awningWidth/stripes+.012,.10,.94],h);stripe.rotation.x=.12;block(i%2?'cream':style.awning,[-awningWidth/2+(i+.5)*awningWidth/stripes,2.43,d/2+.97],[awningWidth/stripes+.012,.22,.08],h)}
   block('navy',[0,1.5,d/2+.285],[.84,1.0,.035],h);block('cream',[0,1.5,d/2+.31],[.045,1.0,.025],h)
   for(const side of [-1,1])beam(new THREE.Vector3(side*(awningWidth/2-.12),2.32,d/2+.11),new THREE.Vector3(side*(awningWidth/2-.12),2.43,d/2+.91),.025,style.trim,h)
  }else block(color,[0,2.52,d/2+.38],[2.4,.18,1.15],h).rotation.x=.15
  for(const yy of facade.rows){for(const side of [-1,1])window(h,side*facade.windowX,yy,d/2+.06,facade.windowWidth,1.18);for(const direction of [-1,1]){const side=new THREE.Group();side.position.set(direction*(w/2+.03),0,0);side.rotation.y=direction*Math.PI/2;h.add(side);window(side,0,yy,0,Math.min(1.35,d*.35),1.25)}}
  if(facade.floorBand!==null)block(city?'sand':'wood',[0,facade.floorBand,0],[w+.09,.14,d+.09],h)
  if(city){
   for(const side of [-1,1])block('sand',[side*(w/2-.1),y/2,d/2+.055],[.16,y-.12,.13],h)
   if(house.floors===2)for(const side of [-1,1]){
    const balconyY=facade.rows[1]!-.83,x=side*facade.windowX,balconyWidth=facade.windowWidth+.45
    block('cream',[x,balconyY,d/2+.35],[balconyWidth,.12,.7],h)
    for(const edge of [-1,1])block(style.trim,[x+edge*(balconyWidth/2-.05),balconyY+.37,d/2+.65],[.055,.68,.055],h)
    block(style.trim,[x,balconyY+.68,d/2+.65],[balconyWidth,.055,.055],h)
    for(let i=1;i<4;i++)block(style.trim,[x-balconyWidth/2+i*balconyWidth/4,balconyY+.37,d/2+.65],[.035,.6,.035],h)
   }
  }
  for(const side of [-1,1]){
   const x=side*facade.windowX,yy=facade.rows[0]!-.79;if(!city){block('wood',[x,yy,d/2+.31],[facade.windowWidth+.13,.25,.42],h)
   for(let j=0;j<3;j++){mesh(kit.sphere,j%2?'mint':'green',[x+(j-1)*.24,yy+.19,d/2+.33],[.13,.15,.13],h);mesh(kit.sphere,j%2?'gold':'coral',[x+(j-1)*.24,yy+.34,d/2+.33],[.07,.06,.07],h)}
   for(const row of facade.rows)for(const edge of [-1,1]){const shutter=block(color,[x+edge*(facade.windowWidth/2+.14),row,d/2+.10],[.16,1.15,.09],h);shutter.rotation.y=edge*.3}}
  }
  block('wood',[0,y-.06,d/2+.10],[w+.14,.12,.13],h)
  buildBuildingSign(a,house.name,{position:[0,facade.labelY+.10,d/2+.22],width:facade.labelWidth,theme:house.enter?'navy':'cream'},h)
  for(const side of [-1,1]){if(!city)pot(h,side*w*.38,d/2+.6);if(house.enter){beam(new THREE.Vector3(side*.95,.1,d/2+.63),new THREE.Vector3(side*.95,2.2,d/2+.63),.055,'wood',h);mesh(kit.sphere,'gold',[side*.95,2.25,d/2+.63],[.13,.18,.13],h)}}
  a.fadeable(house.id,h)
 }
 buildStoneBridge(a)
 // The windmill, bell and fire are real moving/toggleable props, independent of dialogue.
 const mill=root(windmill.x,windmill.z);mesh(kit.cylinder,'cream',[0,windmill.height/2,0],[windmill.radius,windmill.height,windmill.radius],mill);mesh(kit.cone,'blue',[0,windmill.height+windmill.roofHeight/2-windmill.roofOverlap,0],[windmill.roofRadius,windmill.roofHeight,windmill.roofRadius],mill)
 const sails=new THREE.Group();sails.position.set(0,3.55,1.45);mill.add(sails)
 for(let i=0;i<4;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2;sails.add(blade);block('wood',[0,1.15,0],[.12,2.4,.13],blade,true);block('cream',[.34,1.47,.02],[.67,1.42,.09],blade,true)}mesh(kit.sphere,'gold',[0,0,.08],[.22,.22,.13],sails,true)
 a.fadeable('windmill',mill)
 const b=root(-10,25);for(const side of [-1,1])block('wood',[side*.67,1.1,0],[.18,2.2,.18],b);block('wood',[0,2.22,0],[1.7,.18,.20],b)
 const bell=new THREE.Group();bell.position.y=1.74;b.add(bell);mesh(kit.cone,'gold',[0,-.23,0],[.38,.48,.38],bell,true);mesh(kit.torus,'gold',[0,-.45,0],[.36,.36,.36],bell,true).rotation.x=Math.PI/2;mesh(kit.sphere,'wood',[0,-.49,0],[.075,.075,.075],bell,true)
 const fire=root(20,-18);for(let i=0;i<8;i++){const angle=i*Math.PI/4;mesh(kit.sphere,'sand',[Math.cos(angle)*.73,.12,Math.sin(angle)*.73],[.20,.17,.20],fire)}
 for(const sign of [-1,1])beam(new THREE.Vector3(-.48,.13,sign*.3),new THREE.Vector3(.48,.13,-sign*.3),.11,'wood',fire)
 const flames=new THREE.Group();fire.add(flames);for(let i=0;i<3;i++)mesh(kit.sphere,i%2?'gold':'coral',[(i-1)*.17,.45,0],[.15,.50,.14],flames,true)
 const flameMaterials=[new THREE.MeshStandardMaterial({color:0xffc752,emissive:0xffa12e,emissiveIntensity:1.1,roughness:.9}),new THREE.MeshStandardMaterial({color:0xffe399,emissive:0xffc567,emissiveIntensity:1.3,roughness:.9})];kit.extras.push(...flameMaterials);flames.children.forEach((child,i)=>{(child as THREE.Mesh).material=flameMaterials[i%2]!})
 const fireLight=new THREE.PointLight(0xffc875,0,8,2);fireLight.position.y=1.0;fire.add(fireLight)
 const box=root(11,17);block('wood',[0,.6,0],[.15,1.2,.15],box);block('coral',[0,1.40,0],[.73,.70,.54],box);block('cream',[0,1.8,0],[.9,.16,.72],box);block('navy',[0,1.47,.29],[.44,.055,.02],box);sign('Say hello',[0,1.22,.292],.56,box)
 // Low fences make garden edges legible without closing the explorable meadow.
 for(const side of [-1,1])for(let i=0;i<10;i++){const g=root(side*(17+i*.55),-19+i*.56);block('cream',[0,.55,0],[.11,1.1,.11],g);block('wood',[.37,.79,0],[.84,.08,.08],g);block('wood',[.37,.38,0],[.84,.08,.08],g)}
 const fountain=root(-4,16);mesh(kit.cylinder,'sand',[0,.25,0],[1.0,.5,1.0],fountain);mesh(kit.cylinder,'pale',[0,.52,0],[.88,.04,.88],fountain);mesh(kit.cylinder,'cream',[0,.87,0],[.12,.7,.12],fountain);mesh(kit.sphere,'gold',[0,1.26,0],[.22,.18,.22],fountain)
 // The open-bank dock shares its real deck plane and rails with walking collision.
 buildDuckDock(a)
 for(let i=0;i<15;i++){const x=19+(i%5)*.6,z=-14-Math.floor(i/5)*.7,g=root(x,z);mesh(kit.sphere,'wood',[0,.05,0],[.32,.12,.3],g);mesh(kit.sphere,i%3?'green':'coral',[0,.28,0],[.22,.24,.22],g)}
 let bellCount=0,bellTime=-10,weatherWind=1,weatherRain=0,previousWindTime=0
 return{windows,lanternMaterials,lanterns,setWeather(state:Pick<WeatherState,'wind'|'rain'>){weatherWind=THREE.MathUtils.clamp(state.wind,0,2);weatherRain=THREE.MathUtils.clamp(state.rain,0,1)},setDaylight(day:number){for(const lantern of lanterns)(lantern.material as THREE.MeshStandardMaterial).emissiveIntensity=.04+(1-THREE.MathUtils.clamp(day,0,1))*.9},update(t:number,reduced:boolean,objects:{windmill:boolean;bell:number;campfire:boolean}){const windDt=Math.max(0,Math.min(.1,t-previousWindTime));previousWindTime=t;if(!reduced&&objects.windmill)sails.rotation.z+=windDt*.6*weatherWind;bell.rotation.x=reduced?0:Math.sin(t*15)*Math.max(0,1-(t-bellTime)*1.6)*.4;if(objects.bell!==bellCount){bellCount=objects.bell;bellTime=t}flames.visible=objects.campfire;fireLight.intensity=objects.campfire?9*(1-weatherRain*.12):0;if(!reduced){flames.rotation.z=(weatherWind-1)*.07;flames.scale.set(1+Math.sin(t*9)*.1,(1+Math.sin(t*11)*.13)*(1-weatherRain*.1),1+Math.cos(t*7)*.1)}}}
}
