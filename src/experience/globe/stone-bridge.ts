import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {normalAt,RADIUS} from './geography.ts'
import {bridge,riverCrossings,bridgeProfile} from './bridge.ts'
import type {BridgeSpec} from './bridge.ts'

/** Stone follows the same spherical deck profile used to place Ivan's feet. */
export function bridgePrism(x0:number,x1:number,z0:number,z1:number,lower:(z:number)=>number,upper:(z:number)=>number,segments=1,crossing:BridgeSpec=bridge){
 const points:number[]=[],indices:number[]=[]
 for(let row=0;row<=segments;row++){
  const z=z0+(z1-z0)*row/segments
  for(const [x,height] of [[x0,upper(z)],[x1,upper(z)],[x1,lower(z)],[x0,lower(z)]]){const n=normalAt(x!,z),r=RADIUS+height!+bridgeProfile(z,x!,crossing)-bridgeProfile(z,crossing.x,crossing);points.push(n.x*r,n.y*r,n.z*r)}
  if(row){const a=(row-1)*4,b=row*4;for(let face=0;face<4;face++){const next=(face+1)%4;indices.push(a+face,b+face,a+next,a+next,b+face,b+next)}}
 }
 const end=segments*4;indices.push(0,1,2,0,2,3,end,end+2,end+1,end,end+3,end+2)
 const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(points,3));indexed.setIndex(indices)
 const geometry=indexed.toNonIndexed();indexed.dispose();geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

export function buildStoneBridge(a:GlobeArtist){
 const materials=['#eeeee5','#f9f8ee','#e6e8df','#c7cec7'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.95}));a.kit.extras.push(...materials)
 for(const crossing of riverCrossings)buildCrossing(crossing)
 function buildCrossing(crossing:BridgeSpec){
 function stone(x0:number,x1:number,z0:number,z1:number,lower:(z:number)=>number,upper:(z:number)=>number,tone=0,segments=1){
  const geometry=bridgePrism(x0+crossing.x,x1+crossing.x,z0,z1,lower,upper,segments,crossing);a.kit.geometries.push(geometry)
  const part=a.mesh(geometry,'cream',[0,0,0],[1,1,1]);part.name=crossing.id;part.material=materials[tone]!;return part
 }
 const h=(z:number)=>bridgeProfile(z,crossing.x,crossing),{halfWidth:w,startZ:start,endZ:end,wallWidth,wallHeight}=crossing,bridgeLength=end-start
 const detailed=crossing===bridge,rows=detailed?16:8,columns=detailed?4:3,arcSegments=detailed?40:20,slabSegments=detailed?2:1,brickRows=detailed?12:8
 // A single arched body, with an open underside above the river rather than a stack of planks.
 stone(-w,w,start,end,z=>-.55+1.06*Math.sin((z-start)/bridgeLength*Math.PI),z=>h(z)-.05,2,arcSegments)
 // Staggered paving slabs with fine, shallow mortar joints.
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const z0=start+row*bridgeLength/rows+.008,z1=start+(row+1)*bridgeLength/rows-.008,x0=-w+col*w*2/columns+.008,x1=x0+w*2/columns-.016
  stone(x0,x1,z0,z1,z=>h(z)-.055,z=>h(z)+.006,(row+col)%5===0?1:0,slabSegments)
 }
 for(const side of [-1,1]){
  const x0=side<0?-w:w-wallWidth,x1=x0+wallWidth
  // Continuous mortar core makes every visible border solid between masonry joints.
  stone(x0,x1,start,end,h,z=>h(z)+wallHeight,3,arcSegments)
  for(let course=0;course<3;course++){
   const step=bridgeLength/brickRows,offset=course%2?step/2:0
   for(let row=-1;row<brickRows+1;row++){
    const z0=Math.max(start,start+row*step+offset)+.009,z1=Math.min(end,start+(row+1)*step+offset)-.009
    if(z1<=z0)continue
    stone(x0-.006,x1+.006,z0,z1,z=>h(z)+course*wallHeight/3+.01,z=>h(z)+(course+1)*wallHeight/3-.01,(row+course+4)%4===0?1:0,slabSegments)
   }
  }
  for(let row=0;row<rows;row++){
   const z0=start+row*bridgeLength/rows+.01,z1=start+(row+1)*bridgeLength/rows-.01
   stone(x0-.06,x1+.06,z0,z1,z=>h(z)+wallHeight,z=>h(z)+wallHeight+.14,1,slabSegments)
  }
 }
 }
}
