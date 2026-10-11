import * as THREE from 'three'

export interface BuildingDimensions {width:number;depth:number;height:number;floors?:1|2|3}

export function roofSection(width:number){
 const rise=1.55,overhang=.4,thickness=.22
 return{rise,overhang,thickness,halfWidth:width/2+overhang,eave:-rise*overhang/(width/2)}
}

/** A closed wall wedge overlaps the wall below and the roof above, including both gable ends. */
export function gableGeometry(width:number,depth:number){
 const {rise}=roofSection(width),shape=new THREE.Shape()
 shape.moveTo(-width/2,-.1);shape.lineTo(width/2,-.1);shape.lineTo(width/2,.025);shape.lineTo(0,rise+.025);shape.lineTo(-width/2,.025);shape.closePath()
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.name='gable-infill';geometry.translate(0,0,-depth/2);return geometry
}

export function pitchedRoofGeometry(width:number,depth:number){
 const {rise,overhang,thickness,halfWidth,eave}=roofSection(width),shape=new THREE.Shape()
 shape.moveTo(-halfWidth,eave+thickness);shape.lineTo(0,rise+thickness);shape.lineTo(halfWidth,eave+thickness);shape.lineTo(halfWidth,eave);shape.lineTo(0,rise);shape.lineTo(-halfWidth,eave);shape.closePath()
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth+overhang*2,bevelEnabled:false});geometry.name='pitched-roof';geometry.translate(0,0,-depth/2-overhang);return geometry
}

/** Keep the entrance at pedestrian height and align matching window columns across explicit floors. */
export function facadeLayout({width,height,floors=1}:BuildingDimensions){
 const floorHeight=height/floors,windowWidth=Math.min(.87,width/2-1.2),windowX=Math.max(width*.32,.86+(windowWidth+.22)/2),ground=Math.min(1.86,floorHeight*.56)
 return{windowWidth,windowX,rows:floors===2?[ground,floorHeight+ground]:[ground],labelY:3.08,labelWidth:Math.min(width-1.25,2.8),floorBand:floors===2?floorHeight:null}
}

/** The top overlaps the wall; a sampled lower ring seals the tangent footprint into curved terrain. */
export function foundationGeometry(width:number,depth:number,ground:(x:number,z:number)=>number,segments=6){
 const ring:[number,number][]=[]
 for(let side=0;side<4;side++)for(let i=0;i<segments;i++){const t=i/segments;ring.push(side===0?[-width/2+t*width,-depth/2]:side===1?[width/2,-depth/2+t*depth]:side===2?[width/2-t*width,depth/2]:[-width/2,depth/2-t*depth])}
 const count=ring.length,bottom=ring.map(([x,z])=>Math.min(.28,ground(x,z)-.12)),positions:number[]=[],indices:number[]=[]
 for(const [x,z] of ring)positions.push(x,.38,z)
 ring.forEach(([x,z],i)=>positions.push(x,bottom[i]!,z));positions.push(0,.38,0,0,Math.min(...bottom)-.02,0)
 for(let i=0;i<count;i++){const j=(i+1)%count;indices.push(count*2,j,i,i,j,j+count,i,j+count,i+count,count*2+1,i+count,j+count)}
 const geometry=new THREE.BufferGeometry();geometry.name='terrain-foundation';geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}
