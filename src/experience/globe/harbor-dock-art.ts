import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {harbor,harborRails,shipBasis} from './harbor.ts'
import {RADIUS,WATER} from './terrain.ts'
import {mergeCharacterParts} from '../explorer/character-mesh.ts'

/** A substantial timber marina, built on exactly the flat deck and rail footprint used for walking. */
export function buildHarborDock(a:GlobeArtist){
 const d=harbor,{kit,mesh,beam}=a,group=a.root(d.x,d.z,0,d.level);group.name='harbor-dock'
 const timbers=[0xa7815a,0xb68e63,0x9e7954,0xad8660].map(color=>{const material=kit.materials.wood.clone();material.color.setHex(color);kit.extras.push(material);return material})
 const smallSphere=new THREE.SphereGeometry(1,12,8),nailHead=new THREE.CircleGeometry(1,8);kit.geometries.push(smallSphere,nailHead)
 function box(name:string,color:'wood'|'sand'|'navy'|'cream'|'blue',p:[number,number,number],s:[number,number,number]){const value=mesh(kit.box,color,p,s,group);value.name=name;return value}
 function boards(x0:number,x1:number,halfWidth:number){
  const count=Math.ceil((x1-x0)/.29),step=(x1-x0)/count
  box('harbor-underdeck','wood',[(x0+x1)/2,-d.thickness-.015,0],[x1-x0,.07,halfWidth*2])
  for(let i=0;i<count;i++){
   const x=x0+(i+.5)*step,plank=box('harbor-plank','wood',[x,-d.thickness/2,0],[step-.01,d.thickness,halfWidth*2]);plank.material=timbers[i%timbers.length]!
   for(const side of [-1,1])mesh(nailHead,'navy',[x,.002,side*(halfWidth-.19)],[.014,.014,.014],group).rotation.x=-Math.PI/2
   if(i%4===1)box('harbor-woodgrain','sand',[x-step*.18,.001,-halfWidth*.12],[.008,.002,halfWidth*.95])
  }
 }
 boards(d.apronStart,d.apronEnd,d.apronHalfWidth);boards(d.apronEnd,d.headStart,d.halfWidth);boards(d.headStart,d.headEnd,d.headHalfWidth)
 for(const side of [-1,1]){
  box('harbor-support-beam','wood',[(d.apronStart+d.headStart)/2,-d.thickness-.12,side*.96],[d.headStart-d.apronStart,.28,.24])
  box('harbor-support-beam','wood',[(d.headStart+d.headEnd)/2,-d.thickness-.12,side*3.25],[d.headEnd-d.headStart,.28,.24])
 }
 for(const x of [d.headStart+.28,d.headEnd-.28])box('harbor-crossbeam','wood',[x,-d.thickness-.15,0],[.28,.34,d.headHalfWidth*2])

 function rope(name:string,points:THREE.Vector3[],radius=.033,color:'wood'|'sand'='wood'){
  const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,radius,5,false);kit.geometries.push(geometry)
  const value=mesh(geometry,color,[0,0,0],[1,1,1],group);value.name=name;return value
 }
 const posts=new Map<string,{x:number;z:number}>()
 for(const [railIndex,rail] of harborRails.entries()){
  const alongX=rail.x1-rail.x0>rail.z1-rail.z0,x0=alongX?rail.x0+d.railWidth/2:(rail.x0+rail.x1)/2,x1=alongX?rail.x1-d.railWidth/2:x0,z0=alongX?(rail.z0+rail.z1)/2:rail.z0+d.railWidth/2,z1=alongX?z0:rail.z1-d.railWidth/2,count=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/1.55))
  box('harbor-fascia','wood',[(rail.x0+rail.x1)/2,-.15,(rail.z0+rail.z1)/2],[rail.x1-rail.x0,.30,rail.z1-rail.z0])
  for(let i=0;i<=count;i++){
   const t=i/count,x=THREE.MathUtils.lerp(x0,x1,t),z=THREE.MathUtils.lerp(z0,z1,t);posts.set(`${x.toFixed(3)},${z.toFixed(3)}`,{x,z})
   if(i===count)continue
   const next=(i+1)/count,xx=THREE.MathUtils.lerp(x0,x1,next),zz=THREE.MathUtils.lerp(z0,z1,next)
   for(const [height,sag] of [[d.railHeight-.08,.115],[.43,.075]]){
    const value=rope('harbor-rope-rail',[new THREE.Vector3(x,height,z),new THREE.Vector3((x+xx)/2,height!-sag!,(z+zz)/2),new THREE.Vector3(xx,height,zz)]);value.userData.rail=railIndex
   }
  }
 }
 for(const {x,z} of posts.values()){
  const bottom=-3.4,top=.22,pile=mesh(kit.cylinder,'wood',[x,(top+bottom)/2,z],[.12,top-bottom,.12],group);pile.name='harbor-pile'
  mesh(kit.cylinder,'cream',[x,.58,z],[.086,.84,.086],group).name='harbor-white-post'
  mesh(kit.cylinder,'navy',[x,.18,z],[.096,.055,.096],group)
  mesh(smallSphere,'cream',[x,1.005,z],[.115,.075,.115],group)
 }
 for(const side of [-1,1]){
  beam(new THREE.Vector3(d.headStart+.12,-1.35,side*4.1),new THREE.Vector3(d.headEnd-.2,-.35,side*4.1),.085,'wood',group).name='harbor-brace'
  beam(new THREE.Vector3(d.headStart+.12,-.35,side*4.1),new THREE.Vector3(d.headEnd-.2,-1.35,side*4.1),.085,'wood',group).name='harbor-brace'
 }

 // The four outer lamps share a single emissive material and instanced draw, with no point-light cost.
 const lampMaterial=new THREE.MeshStandardMaterial({color:0xf3d8a0,emissive:0xffcd7d,emissiveIntensity:.025,roughness:.45}),lamps=new THREE.InstancedMesh(smallSphere,lampMaterial,4),lampMatrix=new THREE.Matrix4(),lampScale=new THREE.Vector3(.145,.19,.145),lampRotation=new THREE.Quaternion(),lampPosition=new THREE.Vector3();let lampIndex=0
 kit.extras.push(lampMaterial);kit.instances.push(lamps);group.add(lamps);lamps.name='harbor-lamp-globes'
 for(const x of [d.headStart+d.railWidth/2,d.headEnd-d.railWidth/2])for(const side of [-1,1]){
  const z=side*(d.headHalfWidth-d.railWidth/2)
  mesh(kit.cylinder,'navy',[x,1.45,z],[.045,.88,.045],group)
  mesh(kit.cylinder,'navy',[x,1.89,z],[.13,.055,.13],group)
  mesh(kit.cone,'navy',[x,2.15,z],[.19,.11,.19],group)
  lampPosition.set(x,2.015,z);lampMatrix.compose(lampPosition,lampRotation,lampScale);lamps.setMatrixAt(lampIndex++,lampMatrix)
 }
 lamps.instanceMatrix.needsUpdate=true

 // Life rings and cleats stay on the already-blocked edge, outside the clear promenade.
 const ringGeometry=new THREE.TorusGeometry(.28,.063,6,20),stripeGeometry=new THREE.TorusGeometry(.28,.065,6,4,Math.PI/5);kit.geometries.push(ringGeometry,stripeGeometry)
 for(const [x,side] of [[d.headStart+.7,1],[d.headEnd-.6,-1]]){
  const z=side!*(d.headHalfWidth+.045),ring=mesh(ringGeometry,'cream',[x!,.52,z],[1,1,1],group);ring.name='harbor-life-ring'
  for(let i=0;i<4;i++)mesh(stripeGeometry,'coral',[x!,.52,z],[1,1,1],group).rotation.z=i*Math.PI/2-Math.PI/10
 }
 const moorings=[{dockX:d.headStart+.35,shipX:-4},{dockX:d.headEnd-.3,shipX:4}],inverse=group.matrix.clone().invert()
 for(const {dockX,shipX} of moorings){
  const z=-d.headHalfWidth+d.railWidth/2
  box('harbor-cleat-base','navy',[dockX,.025,z],[.34,.05,.15]);mesh(kit.cylinder,'navy',[dockX,.10,z],[.045,.15,.045],group);box('harbor-cleat','navy',[dockX,.18,z],[.40,.065,.095])
  const end=new THREE.Vector3(shipBasis.up.x,shipBasis.up.y,shipBasis.up.z).multiplyScalar(RADIUS+WATER+.95).addScaledVector(new THREE.Vector3(shipBasis.east.x,shipBasis.east.y,shipBasis.east.z),shipX).addScaledVector(new THREE.Vector3(shipBasis.south.x,shipBasis.south.y,shipBasis.south.z),1.8).applyMatrix4(inverse),start=new THREE.Vector3(dockX,.17,z),middle=start.clone().lerp(end,.5);middle.y-=.30
  rope('harbor-mooring',[start,middle,end],.038,'sand')
 }

 // A high, legible marker faces the promenade, while its uprights occupy a protected rail band.
 for(const x of [.12,1.88])box('harbor-sign-post','navy',[x,1.25,d.halfWidth-.08],[.085,1.25,.085])
 box('harbor-sign-frame','blue',[1,1.78,d.halfWidth-.035],[2.05,.63,.10]);a.sign('Harbor',[1,1.78,d.halfWidth+.025],1.85,group)
 const bell=new THREE.Group();bell.name='harbor-bell';bell.position.set((d.headStart+d.headEnd)/2,1.97,d.headHalfWidth-.08);group.add(bell)
 for(const side of [-1,1])box('harbor-bell-upright','cream',[(d.headStart+d.headEnd)/2+side*.55,1.1,d.headHalfWidth-.08],[.10,2.2,.12])
 box('harbor-bell-crossbar','navy',[(d.headStart+d.headEnd)/2,2.22,d.headHalfWidth-.08],[1.25,.12,.15])
 const profile=[[0,.04],[.08,.04],[.11,0],[.13,-.14],[.19,-.27],[.29,-.33],[.30,-.38],[.245,-.38],[.24,-.34],[.15,-.25],[.09,-.12],[.07,0],[0,0]].map(([r,y])=>new THREE.Vector2(r!,y!)),bellGeometry=new THREE.LatheGeometry(profile,20);bellGeometry.name='harbor-brass-bell';kit.geometries.push(bellGeometry)
 const bellParts=[mesh(bellGeometry,'gold',[0,0,0],[1,1,1],bell,true),mesh(kit.cylinder,'wood',[0,-.28,0],[.025,.22,.025],bell,true),mesh(smallSphere,'wood',[0,-.405,0],[.065,.065,.065],bell,true)]
 mergeCharacterParts(kit,bellParts,bell)
 let lastBell=0,ringAt=-Infinity
 return{group,bell,lamps,update(time:number,reduced:boolean,day:number,bellCount:number){
  lampMaterial.emissiveIntensity=THREE.MathUtils.lerp(1.65,.025,THREE.MathUtils.clamp(day,0,1))
  if(bellCount>lastBell)ringAt=time;else if(bellCount<lastBell)ringAt=-Infinity;lastBell=bellCount
  const age=time-ringAt;bell.rotation.z=reduced||age<0||age>2.4?0:Math.sin(age*13)*Math.exp(-age*2.1)*.34
 }}
}
