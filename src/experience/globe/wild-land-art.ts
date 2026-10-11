import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {caveSites,coastalLookout} from './wild-land.ts'
import {buildBuildingSign} from './building-signs.ts'
import {coastalCrossing,coastalDeck} from './coastal-crossing.ts'
import {normalAt,RADIUS} from './terrain.ts'

/** Original cave mouths and a masonry causeway share simulation dimensions, not decoration-only bridges. */
export function buildWildLand(a:GlobeArtist){
 const {kit,root,mesh,block}=a
 for(const cave of caveSites){
  const g=root(cave.x,cave.z);g.name=cave.id
  // The door is an actual dark recess, framed with irregular stones and a covered lintel.
  block('navy',[0,1.05,.2],[2.45,2.1,.24],g)
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const stone=mesh(kit.leaf,i%2?'cream':'sand',[side*(1.6-i*.10),.35+i*.62,.38],[.65,.53,.72],g);stone.rotation.z=side*(.08+i*.09)
  }
  for(let i=0;i<5;i++){const angle=.2+i*(Math.PI-.4)/4;mesh(kit.leaf,i%2?'sand':'cream',[Math.cos(angle)*1.5,1.8+Math.sin(angle)*.65,.37],[.65,.52,.72],g)}
  for(const side of [-1,1])mesh(kit.cone,cave.tone,[side*.95,.42,1.1],[.17,.8,.17],g)
  buildBuildingSign(a,cave.name,{position:[0,3.1,1.25],width:2.45,theme:'navy'},g)
  const warning=root(cave.x+3.7,cave.z+1.7);warning.name=`${cave.id}-warning`
  block('wood',[0,.7,0],[.12,1.4,.12],warning)
  buildBuildingSign(a,cave.warning,{position:[0,1.4,.06],width:1.8,theme:'cream'},warning)
  mesh(kit.cone,'gold',[0,2.02,.08],[.18,.3,.08],warning)
  a.fadeable(cave.id,g)
 }
 const lookout=root(coastalLookout.x+1.6,coastalLookout.z+2.1);lookout.name='coastal-lookout-art'
 block('wood',[0,.55,0],[2.4,.15,.6],lookout);for(const x of [-.9,.9])block('navy',[x,.27,0],[.13,.54,.48],lookout)
 buildBuildingSign(a,'Beyond the Blue',{position:[0,1.8,-.6],width:2.6,theme:'navy'},lookout).rotation.y=Math.PI
 block('wood',[0,.75,-.67],[.12,1.5,.12],lookout)
 const c=coastalCrossing,materials=['#ecede4','#c5cdc9','#f8f6e8'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));kit.extras.push(...materials)
 // Longitudinal strips follow the globe and use the exact same deck function as the player.
 function strip(z0:number,z1:number,low:(x:number)=>number,high:(x:number)=>number,tone:number,start=c.startX,end=c.endX,segments=36){
  const positions:number[]=[],indices:number[]=[]
  for(let row=0;row<=segments;row++){
   const x=start+(end-start)*row/segments
   for(const [z,h] of [[z0,high(x)],[z1,high(x)],[z1,low(x)],[z0,low(x)]]){const n=normalAt(x,z!),r=RADIUS+h!;positions.push(n.x*r,n.y*r,n.z*r)}
   if(row){const p=(row-1)*4,q=row*4;for(let side=0;side<4;side++){const next=(side+1)%4;indices.push(p+side,q+side,p+next,p+next,q+side,q+next)}}
  }
  const e=segments*4;indices.push(0,2,1,0,3,2,e,e+1,e+2,e,e+2,e+3)
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();kit.geometries.push(geometry)
  const part=mesh(geometry,'cream',[0,0,0],[1,1,1]);part.material=materials[tone]!;part.name=c.id
 }
 for(let col=0;col<6;col++){const z0=c.z-c.halfWidth+col*c.halfWidth/3;strip(z0,z0+c.halfWidth/3,x=>coastalDeck(x)-.28,coastalDeck,0)}
 for(const side of [-1,1]){
  const edge=c.z+side*c.halfWidth,z0=side<0?edge:edge-c.wallWidth,z1=z0+c.wallWidth
  strip(z0,z1,coastalDeck,x=>coastalDeck(x)+c.wallHeight,1)
  strip(z0-.05,z1+.05,x=>coastalDeck(x)+c.wallHeight,x=>coastalDeck(x)+c.wallHeight+.11,2)
 }
 // Paving joints and short supports give the span a readable cadence from shore and overview.
 for(let i=0;i<20;i++){
  const x=c.startX+(c.endX-c.startX)*(i+.5)/20
  for(let col=0;col<6;col++){const width=(c.halfWidth-c.wallWidth)/3,z0=c.z-c.halfWidth+c.wallWidth+col*width;strip(z0,z0+width,v=>coastalDeck(v)+.002,v=>coastalDeck(v)+.015,1,x-.018,x+.018,1)}
 }
 for(const t of [.22,.5,.78]){const x=c.startX+(c.endX-c.startX)*t,g=root(x,c.z,0,-1.1);mesh(kit.cylinder,'cream',[0,1.05,0],[.48,2.1,.48],g)}
 const sign=root(c.startX+.9,c.z+2.65);block('wood',[0,.9,0],[.14,1.8,.14],sign);buildBuildingSign(a,'Horizon Causeway',{position:[0,1.8,-.08],width:2.6},sign).rotation.y=Math.PI
 return{crossing:c.id,caves:caveSites.map(cave=>cave.id)}
}
