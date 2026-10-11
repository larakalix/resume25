import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {buildBuildingSign} from './building-signs.ts'
import {expansionObstacles} from './world-expansion-obstacles.ts'
import {worldPlaces} from './world-expansion.ts'

/** Four small destinations, built in the same radial frame and shared art kit as the town. */
export function buildWorldExpansion(a:GlobeArtist){
 const {kit,root,mesh,block,beam}=a,groups:THREE.Group[]=[],flags:THREE.Group[]=[],stars:THREE.Mesh[]=[]
 const starMaterial=new THREE.MeshStandardMaterial({color:0xffdc81,emissive:0xffc35a,emissiveIntensity:.12,roughness:.8});kit.extras.push(starMaterial)
 function rod(parent:THREE.Object3D,from:number[],to:number[],radius=.06,color:'wood'|'navy'|'cream'|'gold'='wood'){
  return beam(new THREE.Vector3(from[0]!,from[1]!,from[2]!),new THREE.Vector3(to[0]!,to[1]!,to[2]!),radius,color,parent)
 }
 function fruit(parent:THREE.Object3D,x:number,y:number,z:number,color:'coral'|'gold'='coral'){
  mesh(kit.leaf,color,[x,y,z],[.17,.19,.17],parent);rod(parent,[x,y+.13,z],[x+.03,y+.28,z],.025)
  const leaf=mesh(kit.leaf,'green',[x+.09,y+.26,z],[.12,.035,.055],parent);leaf.rotation.z=.3
 }
 function planter(parent:THREE.Object3D,x:number,z:number,color:'coral'|'violet'|'gold'){
  mesh(kit.cylinder,'cream',[x,.22,z],[.4,.44,.4],parent)
  mesh(kit.cylinder,'wood',[x,.448,z],[.33,.012,.33],parent)
  for(let i=0;i<5;i++){
   const angle=i*Math.PI*.4,xx=x+Math.cos(angle)*.16,zz=z+Math.sin(angle)*.16
   rod(parent,[xx,.45,zz],[xx,.82+(i%2)*.13,zz],.025,'wood')
   for(let j=0;j<5;j++){const turn=j*Math.PI*.4;mesh(kit.leaf,color,[xx+Math.cos(turn)*.075,.86+(i%2)*.13,zz+Math.sin(turn)*.075],[.085,.055,.085],parent)}
   mesh(kit.leaf,'gold',[xx,.88+(i%2)*.13,zz],[.055,.05,.055],parent)
  }
 }
 for(const prop of expansionObstacles){
  const g=root(prop.x,prop.z);g.name=prop.id;g.userData.landmark=prop.place;groups.push(g)
  if(prop.variant==='fruit-tree'){
   mesh(kit.cylinder,'wood',[0,1.35,0],[.26,2.7,.26],g)
   rod(g,[0,1.5,0],[-.85,2.5,.05],.13);rod(g,[0,1.7,0],[.85,2.7,.1],.12)
   for(const [x,y,z,scale,color] of [[-.8,2.8,0,1.15,'green'],[.65,3,.1,1.24,'grass'],[0,3.7,0,1.1,'mint']] as const)mesh(kit.sphere,color,[x,y,z],[scale,scale*.95,scale],g)
   for(let i=0;i<13;i++){const angle=i*2.4,y=2.3+(i%4)*.34,radius=.95+(i%2)*.15;fruit(g,Math.sin(angle)*radius,y,Math.cos(angle)*radius,i%3?'coral':'gold')}
   mesh(kit.cylinder,'sand',[0,.045,0],[1.3,.09,1.3],g)
  }
  if(prop.variant==='harvest-cart'){
   for(const side of [-1,1]){
    const wheel=mesh(kit.cylinder,'navy',[side*.92,.36,0],[.35,.12,.35],g);wheel.rotation.z=Math.PI/2
    const hub=mesh(kit.cylinder,'gold',[side*1.0,.36,0],[.1,.14,.1],g);hub.rotation.z=Math.PI/2
    rod(g,[side*.66,.5,.5],[side*.66,.62,1.35],.065)
   }
   block('wood',[0,.55,0],[1.85,.17,1.1],g)
   for(const y of [.75,.96]){
    block('sand',[0,y,-.55],[1.9,.16,.07],g);block('sand',[0,y,.55],[1.9,.16,.07],g)
    for(const side of [-1,1])block('sand',[side*.91,y,0],[.07,.16,1.1],g)
   }
   for(let row=0;row<3;row++)for(let col=0;col<5;col++)fruit(g,(col-2)*.30,.76+(col%2)*.13,(row-1)*.29,(row+col)%3?'coral':'gold')
   for(const side of [-1,1])rod(g,[side*.87,.5,-.5],[side*.87,2,-.5],.06)
   const awning=new THREE.Group();awning.position.set(0,2.03,-.05);g.add(awning)
   for(let i=0;i<7;i++){const strip=block(i%2?'cream':'coral',[-1.02+(i+.5)*2.04/7,0,0],[2.04/7+.01,.1,1.4],awning);strip.rotation.x=.08}
   buildBuildingSign(a,'Sunlit Orchard',{position:[0,1.64,.69],width:2.2,theme:'cream'},g)
  }
  if(prop.variant==='observatory'){
   mesh(kit.cylinder,'cream',[0,.17,0],[1.75,.34,1.75],g)
   mesh(kit.cylinder,'sand',[0,1.1,0],[1.48,1.9,1.48],g)
   const domeGeometry=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2);kit.geometries.push(domeGeometry)
   mesh(domeGeometry,'violet',[0,2.02,0],[1.6,1.6,1.6],g)
   const rim=mesh(kit.torus,'gold',[0,2.05,0],[1.59,1.59,1.59],g);rim.rotation.x=Math.PI/2
   const cap=mesh(kit.torus,'navy',[0,2.7,1.25],[.36,.36,.36],g);cap.rotation.x=.25
   const lens=mesh(kit.cylinder,'pale',[0,2.67,1.30],[.31,.05,.31],g);lens.rotation.x=Math.PI/2+.25
   block('navy',[0,.97,1.47],[.82,1.59,.12],g);block('wood',[0,.93,1.55],[.61,1.42,.07],g)
   for(const side of [-1,1]){block('navy',[side*.93,1.18,1.13],[.43,.55,.1],g);block('gold',[side*.93,1.18,1.19],[.31,.43,.04],g)}
   mesh(kit.leaf,'gold',[.17,.91,1.61],[.055,.055,.035],g)
   buildBuildingSign(a,'Star Garden',{position:[0,1.89,1.66],width:2.2,theme:'navy'},g)
   for(let i=0;i<5;i++){
    const star=mesh(kit.leaf,'gold',[(i-2)*.45,3.9+Math.sin(i*.8)*.24,.2],[.1,.18,.08],g,true);star.material=starMaterial;star.rotation.z=i*.63;stars.push(star)
   }
  }
  if(prop.variant==='telescope'){
   mesh(kit.cylinder,'sand',[0,.08,0],[.7,.16,.7],g)
   for(let i=0;i<3;i++){const angle=i*Math.PI*2/3;rod(g,[Math.sin(angle)*.5,.12,Math.cos(angle)*.5],[0,1.3,0],.055,'navy')}
   const telescope=new THREE.Group();telescope.position.set(0,1.45,0);telescope.rotation.z=.48;g.add(telescope)
   mesh(kit.cylinder,'blue',[0,0,0],[.22,1.4,.22],telescope);mesh(kit.cylinder,'gold',[0,.65,0],[.27,.16,.27],telescope);mesh(kit.cylinder,'navy',[0,-.72,0],[.12,.21,.12],telescope);mesh(kit.cylinder,'pale',[0,.74,0],[.20,.025,.20],telescope)
   block('wood',[0,.18,1.2],[.8,.3,.5],g)
  }
  if(prop.variant==='cairn'){
   for(const [x,y,z,s] of [[0,.3,0,.8],[.13,.8,0,.59],[-.1,1.18,.05,.44],[.06,1.48,0,.30]] as const)mesh(kit.leaf,y<1?'cream':'sand',[x,y,z],[s,s*.65,s*.85],g)
   buildBuildingSign(a,'Northwind Lookout',{position:[0,.65,.91],width:2.4,theme:'navy'},g)
   const compass=mesh(kit.cylinder,'gold',[0,1.74,0],[.35,.08,.35],g);compass.rotation.z=.05
   block('navy',[0,1.80,0],[.10,.04,.52],g)
  }
  if(prop.variant==='trail-flag'){
   mesh(kit.cylinder,'sand',[0,.11,0],[.48,.22,.48],g);rod(g,[0,.1,0],[0,3.6,0],.07,'cream')
   const flag=new THREE.Group();flag.position.set(0,3.35,0);g.add(flag);flags.push(flag)
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1.25,-.14,0,0,-.65,0],3));geometry.computeVertexNormals();kit.geometries.push(geometry)
   const material=new THREE.MeshStandardMaterial({color:0xe78a70,roughness:.9,side:THREE.DoubleSide});kit.extras.push(material)
   const cloth=new THREE.Mesh(geometry,material);cloth.name='northwind-trail-flag';flag.add(cloth)
   mesh(kit.sphere,'gold',[0,3.68,0],[.12,.12,.12],g)
  }
  if(prop.variant==='pergola'){
   block('sand',[0,.08,0],[3.1,.16,2.5],g)
   for(const x of [-1.35,1.35])for(const z of [-1.0,1.0])block('cream',[x,1.45,z],[.16,2.8,.16],g)
   for(const z of [-1.05,1.05])block('wood',[0,2.83,z],[3.3,.18,.18],g)
   for(let i=0;i<7;i++)block('cream',[-1.5+i*.5,2.97,0],[.14,.12,2.8],g)
   for(let i=0;i<11;i++){
    const angle=i*.6;mesh(kit.leaf,i%3?'green':'mint',[Math.sin(angle)*1.42,2.88+(i%2)*.18,Math.cos(angle)*1.12],[.44,.24,.36],g)
    if(i%2)mesh(kit.leaf,'violet',[Math.sin(angle)*1.45,2.65,Math.cos(angle)*1.14],[.13,.24,.13],g)
   }
   for(const side of [-1,1])planter(g,side*1.04,.82,side===1?'violet':'coral')
   buildBuildingSign(a,'Cloudtop Garden',{position:[0,2.43,1.14],width:2.5,theme:'cream'},g)
  }
  if(prop.variant==='garden-bench'){
   for(const side of [-1,1]){
    block('navy',[side*.88,.38,0],[.13,.76,.55],g);block('wood',[side*1.05,.80,.04],[.12,.14,.8],g)
   }
   for(let i=0;i<4;i++)block('sand',[0,.63,-.24+i*.16],[2.4,.12,.13],g)
   for(let i=0;i<3;i++)block('wood',[0,.93+i*.17,-.30],[2.4,.13,.10],g)
   planter(g,-1.65,.05,'gold');planter(g,1.65,.05,'violet')
  }
  a.fadeable(prop.id,g)
 }
 // Discreet direction markers stay beside the path rather than across its walking line.
 for(const place of worldPlaces){
  const prop=expansionObstacles.find(value=>value.place===place.id)!,g=groups.find(value=>value.name===prop.id)!
  g.userData.destination=place.name
 }
 return{groups,update(time:number,reduced:boolean,daylight=1){
  for(const flag of flags)flag.rotation.y=reduced?.18:.18+Math.sin(time*1.1)*.13
  starMaterial.emissiveIntensity=.12+(1-THREE.MathUtils.clamp(daylight,0,1))*.7
  for(const [i,star] of stars.entries()){
   const pulse=reduced?1:1+Math.sin(time*.8+i)*.08;star.scale.set(.1*pulse,.18*pulse,.08*pulse)
   // Occlusion owns material copies; update the material currently drawn by the star.
   ;(star.material as THREE.MeshStandardMaterial).emissiveIntensity=starMaterial.emissiveIntensity
  }
 }}
}
