import type {GlobeArtist} from './art-kit.ts'
import {duckDock,dockRails} from './duck-dock.ts'

/** The deck top is the exact tangent plane published by dockHeight, rather than a spherical approximation. */
export function buildDuckDock(a:GlobeArtist){
 const d=duckDock,group=a.root(d.x,d.z,0,d.level),{kit,mesh,block}=a;group.name='duck-dock'
 function box(name:string,color:'wood'|'sand'|'navy',position:[number,number,number],scale:[number,number,number]){const value=mesh(kit.box,color,position,scale,group);value.name=name;return value}
 function boards(x0:number,x1:number,halfWidth:number){
  const count=Math.ceil((x1-x0)/.27),step=(x1-x0)/count
  // An overlapping dark backing keeps water out of the fine plank joints.
  box('dock-underdeck','wood',[(x0+x1)/2,-d.thickness-.025,0],[x1-x0,.07,halfWidth*2])
  for(let i=0;i<count;i++){
   const x=x0+(i+.5)*step
   box('dock-plank','wood',[x,-d.thickness/2,0],[step-.009,d.thickness,halfWidth*2])
   for(const side of [-1,1])mesh(kit.cylinder,'navy',[x,.002,side*(halfWidth-.20)],[.014,.005,.014],group)
   if(i%2===0)box('dock-grain','sand',[x,-.001,halfWidth*.13],[step*.05,.003,halfWidth*1.05])
  }
 }
 boards(d.apronEnd,d.x1,d.halfWidth);boards(d.apronStart,d.apronEnd,d.apronHalfWidth)
 for(const side of [-1,1])block('wood',[(d.apronStart+d.x1)/2,-.25,side*.55],[d.x1-d.apronStart+.08,.20,.16],group).name='dock-beam'
 const near=d.railStart+d.railWidth/2,far=d.x1-d.railWidth/2,z=d.halfWidth-d.railWidth/2,bottom=-1.70,top=d.railHeight+.1
 for(const x of [near,far])for(const side of [-1,1]){
  const pile=mesh(kit.cylinder,'wood',[x,(top+bottom)/2,side*z],[d.railWidth/2,top-bottom,d.railWidth/2],group);pile.name='dock-pile'
  mesh(kit.cylinder,'sand',[x,top,side*z],[.095,.07,.095],group)
  mesh(kit.torus,'gold',[x,d.railHeight-.12,side*z],[.087,.087,.087],group).rotation.x=Math.PI/2
 }
 for(const rail of dockRails){
  for(const [height,thickness] of [[d.railHeight-.065,.13],[.28,.075]]){
   const value=block('wood',[(rail.x0+rail.x1)/2,height!,(rail.z0+rail.z1)/2],[rail.x1-rail.x0,thickness!,rail.z1-rail.z0],group);value.name='dock-rail'
  }
 }
 // A small life ring adds a readable waterside detail without occupying the walking area.
 const ring=mesh(kit.torus,'cream',[d.x1+.06,.28,.39],[.20,.20,.20],group);ring.rotation.y=Math.PI/2
 mesh(kit.torus,'coral',[d.x1+.065,.28,.39],[.13,.13,.13],group).rotation.y=Math.PI/2
 return group
}
