import * as THREE from 'three'

/** Original hipped tile roof: a long ridge, shallow slopes and lightly lifted corners. */
export function japanRoofRings(width:number,depth:number,rise=.95,overhang=.55){
 const halfX=width/2+overhang,halfZ=depth/2+overhang,ridgeX=Math.max(.18,width*.30),ridgeZ=.07
 return[0,.20,.44,.70,1].map(t=>{
  const x=THREE.MathUtils.lerp(halfX,ridgeX,t),z=THREE.MathUtils.lerp(halfZ,ridgeZ,t),y=.06+rise*Math.pow(t,.82),corner=.14*Math.pow(1-t,4)
  return[[-x,y+corner,-z],[0,y,-z],[x,y+corner,-z],[x,y,0],[x,y+corner,z],[0,y,z],[-x,y+corner,z],[-x,y,0]] as [number,number,number][]
 })
}

/** Solid underside overlaps the wall by10cm, avoiding the former wall/roof gap. */
export function createJapaneseRoof(width:number,depth:number,rise=.95,overhang=.55){
 const rings=japanRoofRings(width,depth,rise,overhang),positions=rings.flat(2),indices:number[]=[],topStart=(rings.length-1)*8,bottomStart=rings.length*8
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<8;i++){const next=(i+1)%8,a=row*8+i,b=row*8+next,c=(row+1)*8+i,d=(row+1)*8+next;indices.push(a,c,b,b,c,d)}
 for(let i=1;i<7;i++)indices.push(topStart,topStart+i,topStart+i+1)
 for(const [x,,z] of rings[0]!)positions.push(x,-.10,z)
 for(let i=0;i<8;i++){const next=(i+1)%8;indices.push(i,next,bottomStart+i,next,bottomStart+next,bottomStart+i)}
 for(let i=1;i<7;i++)indices.push(bottomStart,bottomStart+i+1,bottomStart+i)
 const geometry=new THREE.BufferGeometry();geometry.name='japanese-hipped-roof';geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.userData={width,depth,rise,overhang};return geometry
}
