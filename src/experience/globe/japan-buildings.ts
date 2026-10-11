import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import type {GlobeArtist} from './art-kit.ts'
import type {Building} from './layout.ts'
import {heightAt,mapAt,RADIUS} from './geography.ts'
import {foundationGeometry} from './building-geometry.ts'
import {buildBuildingSign} from './building-signs.ts'
import {createJapaneseRoof,japanRoofRings} from './japan-roof.ts'

interface JapanesePalette {timber:THREE.MeshStandardMaterial;plaster:THREE.MeshStandardMaterial[];roofs:Record<Building['roof'],THREE.MeshStandardMaterial>;paper:THREE.MeshStandardMaterial;vermilion:THREE.MeshStandardMaterial;indigo:THREE.MeshStandardMaterial;lantern:THREE.SphereGeometry}
const palettes=new WeakMap<GlobeArtist,JapanesePalette>()
function paletteFor(a:GlobeArtist){
 let palette=palettes.get(a);if(palette)return palette
 const material=(color:number)=>{const value=new THREE.MeshStandardMaterial({color,roughness:.9});a.kit.extras.push(value);return value}
 const paper=material(0xf8e9c9);paper.emissive.setHex(0xffda9c);paper.emissiveIntensity=.16
 const lantern=new THREE.SphereGeometry(1,12,8);a.kit.geometries.push(lantern)
 palette={timber:material(0x50443c),plaster:[0xd7c8ae,0x8eafa2,0xd6a294,0x90b5c6].map(material),roofs:{blue:material(0x4c7184),coral:material(0xb66c55),green:material(0x667e70),violet:material(0x77798b)},paper,vermilion:material(0xa55345),indigo:material(0x42627a),lantern}
 palettes.set(a,palette);return palette
}

/** Original timber-and-plaster shops and a two-tier temple; no imported reference geometry. */
export function buildJapaneseBuilding(a:GlobeArtist,house:Building){
 const {kit,root,mesh}=a,h=root(house.x,house.z),palette=paletteFor(a),windows:THREE.Mesh[]=[],corePieces:THREE.BufferGeometry[]=[],temple=house.id==='japan-temple',floors=house.floors??1,{width:w,depth:d,height:y}=house
 h.name=house.id;h.userData.architecture=temple?'japanese-temple':'japanese-machiya'
 let hash=0;for(const letter of house.id)hash=(Math.imul(hash,31)+letter.charCodeAt(0))>>>0
 const plaster=palette.plaster[temple?0:hash%palette.plaster.length]!,roofMaterial=temple?palette.roofs.violet:palette.roofs[house.roof],timber=temple?palette.vermilion:palette.timber
 function part(geometry:THREE.BufferGeometry,material:THREE.MeshStandardMaterial,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D=h){const value=mesh(geometry,'wood',p,s,parent);value.material=material;return value}
 function box(material:THREE.MeshStandardMaterial,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D=h){return part(kit.box,material,p,s,parent)}
 function roof(width:number,depth:number,level:number,rise:number,parent:THREE.Object3D=h){
  const geometry=createJapaneseRoof(width,depth,rise);kit.geometries.push(geometry);part(geometry,roofMaterial,[0,level,0],[1,1,1],parent)
  const rings=japanRoofRings(width,depth,rise)
  for(const ring of rings.slice(0,-1))for(let i=0;i<ring.length;i++){
   const from=new THREE.Vector3(...ring[i]!),to=new THREE.Vector3(...ring[(i+1)%ring.length]!),delta=to.clone().sub(from),mid=from.clone().lerp(to,.5);mid.y+=level+.015
   const seam=part(kit.cylinder,roofMaterial,mid.toArray() as [number,number,number],[.024,delta.length(),.024],parent);seam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())
  }
  box(roofMaterial,[0,level+rise+.10,0],[Math.max(.4,width*.64),.13,.20],parent)
 }
 function panel(parent:THREE.Object3D,x:number,yy:number,z:number,width:number,height:number){
  box(palette.timber,[x,yy,z],[width+.16,height+.16,.10],parent)
  box(palette.indigo,[x,yy,z+.052],[width,height,.015],parent)
  const glow=kit.mesh(kit.box,'gold',[x,yy,z+.066],[width*.94,height*.94,.012],parent,true,false);glow.name='japanese-night-window';glow.visible=false;windows.push(glow)
  for(let column=0;column<4;column++)box(timber,[x-width/2+column*width/3,yy,z+.095],[.035,height+.05,.035],parent)
  for(const side of [-1,1])box(timber,[x,yy+side*height*.18,z+.095],[width+.05,.035,.035],parent)
 }
 h.updateWorldMatrix(true,false);const base=h.position.length(),sample=new THREE.Vector3(),foundation=foundationGeometry(w+.04,d+.04,(x,z)=>{let lift=0;for(let i=0;i<4;i++){sample.set(x,lift,z).applyMatrix4(h.matrixWorld);const radius=RADIUS+heightAt(mapAt(sample.normalize()));lift=Math.sqrt(radius*radius-x*x-z*z)-base}return lift});kit.geometries.push(foundation);mesh(foundation,'sand',[0,0,0],[1,1,1],h)
 if(temple){
  box(plaster,[0,1.70,0],[w,3.4,d]);roof(w,d,3.4,1.02)
  box(plaster,[0,4.45,0],[w*.62,1.82,d*.62]);roof(w*.66,d*.66,y,1.10)
 }else{box(plaster,[0,y/2,0],[w,y,d]);roof(w,d,y,Math.min(1.05,w*.22))}
 const bodyTop=temple?3.4:y
 for(const x of [-w/2+.065,0,w/2-.065])for(const z of [-d/2+.065,d/2-.065])box(timber,[x,bodyTop/2,z],[.13,bodyTop,.13])
 for(const yy of [.22,bodyTop-.10,...(floors===2&&!temple?[y/2]:[])]){box(timber,[0,yy,d/2+.006],[w,.12,.09]);box(timber,[0,yy,-d/2-.006],[w,.12,.09]);for(const side of [-1,1])box(timber,[side*(w/2-.025),yy,0],[.10,.12,d])}
 box(timber,[0,1.1,d/2+.035],[1.25,2.2,.09]);for(const side of [-1,1]){box(palette.paper,[side*.30,1.20,d/2+.090],[.53,1.56,.018]);for(let i=0;i<4;i++)box(timber,[side*.30-.24+i*.16,1.20,d/2+.115],[.023,1.6,.025])}
 const curtain=temple?palette.vermilion:hash%2?palette.indigo:palette.vermilion
 const norenY=temple?2.28:2.36
 box(timber,[0,norenY+.31,d/2+.20],[1.75,.09,.12]);for(let i=0;i<3;i++){const cloth=box(curtain,[(i-1)*.54,norenY,d/2+.20],[.50,.52,.055]);cloth.name='japanese-noren';box(palette.paper,[(i-1)*.54,norenY+.025,d/2+.233],[.06,.18,.008])}
 for(let floor=0;floor<floors;floor++){
  const upper=temple&&floor===1,fw=upper?w*.62:w,fd=upper?d*.62:d,yy=upper?4.45:floor*(y/floors)+1.43,windowWidth=Math.min(.80,fw*.18),windowX=fw*.32
  for(const side of [-1,1]){panel(h,side*windowX,yy,fd/2+.025,windowWidth,upper?.95:1.03);const wall=new THREE.Group();wall.position.set(side*(fw/2+.018),0,0);wall.rotation.y=side*Math.PI/2;h.add(wall);panel(wall,0,yy,0,Math.min(1.1,fd*.30),upper?.95:1.03)}
 }
 for(const side of [-1,1]){
  const lantern=new THREE.Group();lantern.name='japanese-paper-lantern';lantern.position.set(side*Math.min(w*.36,1.65),2.42,d/2+.40);h.add(lantern)
  box(timber,[0,.33,-.13],[.065,.40,.065],lantern);box(timber,[0,.48,-.02],[.08,.06,.40],lantern)
  corePieces.push(palette.lantern.clone().scale(.16,.25,.16).translate(lantern.position.x,lantern.position.y+.12,lantern.position.z+.10))
  for(const yy of [-.11,.35])part(kit.cylinder,palette.timber,[0,yy,.10],[.115,.055,.115],lantern)
  for(const yy of [0,.13,.26])part(kit.torus,curtain,[0,yy,.10],[.15,.15,.15],lantern).rotation.x=Math.PI/2
 }
 buildBuildingSign(a,house.name,{position:[0,temple?2.93:3.01,d/2+.145],width:Math.min(2.7,w-.75),theme:temple?'navy':'cream'},h)
 if(!temple){
  // The inner lane runs north/south; its shop frontage reads from the side as well.
  const side=house.x< -33?1:-1,front=new THREE.Group();front.name='japanese-lane-frontage';front.position.set(side*(w/2+.02),0,0);front.rotation.y=side*Math.PI/2;h.add(front)
  box(timber,[0,2.67,.12],[1.7,.09,.12],front)
  for(let i=0;i<3;i++)box(curtain,[(i-1)*.51,2.35,.14],[.47,.52,.055],front)
  buildBuildingSign(a,house.name,{position:[0,3.01,.14],width:Math.min(2.6,d-.75)},front)
  box(palette.paper,[w*.28,Math.min(2.9,y-.38),-d/2+.18],[.65,.45,.35]);for(let i=0;i<4;i++)box(palette.timber,[w*.28-.22+i*.15,Math.min(2.9,y-.38),-d/2-.005],[.035,.29,.018])
  box(palette.timber,[-w*.28,.43,d/2-.08],[.45,.65,.12])
 }
 const coreGeometry=mergeGeometries(corePieces)!;corePieces.forEach(geometry=>geometry.dispose());kit.geometries.push(coreGeometry)
 const cores=new THREE.Mesh(coreGeometry,palette.paper);cores.name='japanese-lantern-cores';h.add(cores)
 a.fadeable(house.id,h)
 return{root:h,windows,lanterns:[cores],lanternMaterials:[palette.paper],temple}
}
