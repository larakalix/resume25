import * as THREE from 'three'
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type {GlobeArtist} from './art-kit.ts'
import {shipPosition,shipYaw} from './harbor.ts'
import {WATER} from './terrain.ts'

export const cruiseProfile={length:13,beam:3.8,draft:.75,freeboard:.95,height:4.4}
const outline:[number,number][]=[[6.5,0],[5.8,.93],[4.5,1.62],[2.8,1.9],[-4.8,1.9],[-5.9,1.50],[-6.35,.82],[-6.5,0],[-6.35,-.82],[-5.9,-1.50],[-4.8,-1.9],[2.8,-1.9],[4.5,-1.62],[5.8,-.93]]

function ringGeometry(rings:{y:number;x:number;z:number}[]){
 const points:number[]=[],indices:number[]=[],count=outline.length
 for(const ring of rings)for(const [x,z] of outline)points.push(x*ring.x,ring.y,z*ring.z)
 for(let layer=0;layer<rings.length-1;layer++)for(let i=0;i<count;i++){const j=(i+1)%count,a=layer*count,b=(layer+1)*count;indices.push(a+i,b+i,a+j,a+j,b+i,b+j)}
 const bottom=points.length/3,top=bottom+1;points.push(0,rings[0]!.y,0,0,rings.at(-1)!.y,0)
 for(let i=0;i<count;i++){const j=(i+1)%count,last=(rings.length-1)*count;indices.push(bottom,i,j,top,last+j,last+i)}
 const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(points,3));indexed.setIndex(indices);const geometry=indexed.toNonIndexed();indexed.dispose();geometry.computeVertexNormals();return geometry
}

/** Closed, tapered hull: a full rounded stern, a raked bow and a submerged narrower keel. */
export function cruiseHullGeometry(){const geometry=ringGeometry([{y:-cruiseProfile.draft,x:.92,z:.58},{y:-.2,x:.99,z:.94},{y:cruiseProfile.freeboard,x:1,z:1}]);geometry.name='cruise-hull';return geometry}

/** Local vertex-colour batching keeps the floating ship at two draws instead of moving hundreds of parts. */
export function createCruiseShip(a:GlobeArtist){
 const root=a.root(shipPosition.x,shipPosition.z,0,WATER),body=new THREE.Group();root.name='cruise-ship';root.rotateY(shipYaw);root.add(body);body.name='cruise-body'
 const parts:THREE.BufferGeometry[]=[],bases:THREE.BufferGeometry[]=[],matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),size=new THREE.Vector3(),colors=new THREE.Color(),up=new THREE.Vector3(0,1,0)
 const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,6),sphere=new THREE.SphereGeometry(1,12,6);bases.push(box,cylinder,sphere)
 function piece(base:THREE.BufferGeometry,color:number,p:[number,number,number],scale:[number,number,number],rotation?:THREE.Quaternion){
  const geometry=base.index?base.toNonIndexed():base.clone();geometry.deleteAttribute('uv');position.set(...p);size.set(...scale);matrix.compose(position,rotation??new THREE.Quaternion(),size);geometry.applyMatrix4(matrix)
  colors.setHex(color);const tint=new Float32Array(geometry.attributes.position!.count*3);for(let i=0;i<tint.length;i+=3){tint[i]=colors.r;tint[i+1]=colors.g;tint[i+2]=colors.b}geometry.setAttribute('color',new THREE.BufferAttribute(tint,3));parts.push(geometry)
 }
 const paint={white:0xf7f5e9,navy:a.kit.palette.navy,teal:0x42858d,coral:a.kit.palette.coral,gold:a.kit.palette.gold,wood:a.kit.palette.wood}
 function rounded(color:number,p:[number,number,number],scale:[number,number,number],radius=.10){const geometry=new RoundedBoxGeometry(...scale,2,radius);bases.push(geometry);piece(geometry,color,p,[1,1,1])}
 function beam(start:THREE.Vector3,end:THREE.Vector3,radius:number,color:number){const direction=end.clone().sub(start),length=direction.length();quaternion.setFromUnitVectors(up,direction.multiplyScalar(1/length));piece(cylinder,color,start.clone().lerp(end,.5).toArray() as [number,number,number],[radius,length,radius],quaternion)}
 function deck(y:number,length:number,width:number,hullShape=false){if(!hullShape){rounded(paint.white,[0,y-.055,0],[length,.11,width],.04);return}const geometry=ringGeometry([{y:y-.11,x:length/13,z:width/3.8},{y,x:length/13,z:width/3.8}]);bases.push(geometry);piece(geometry,paint.white,[0,0,0],[1,1,1])}
 function rails(y:number,length:number,width:number,height=.36,hullShape=false){
  const x=length/2,z=width/2,c=.23,rectangle:[number,number][]=[[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c],[-x+c,-z],[x-c,-z],[x,-z+c]],path=hullShape?outline.map(([px,pz])=>new THREE.Vector3(px*length/13,y,pz*width/3.8)):rectangle.map(([px,pz])=>new THREE.Vector3(px,y,pz))
  for(let i=0;i<path.length;i++){
   const start=path[i]!,end=path[(i+1)%path.length]!,steps=Math.ceil(start.distanceTo(end)/1.05)
   beam(start.clone().addScaledVector(up,height),end.clone().addScaledVector(up,height),.022,paint.white);beam(start.clone().addScaledVector(up,height*.48),end.clone().addScaledVector(up,height*.48),.014,paint.white)
   for(let j=0;j<steps;j++){const foot=start.clone().lerp(end,j/steps);beam(foot,foot.clone().addScaledVector(up,height),.021,paint.white)}
  }
 }
 const hull=cruiseHullGeometry();bases.push(hull);piece(hull,paint.navy,[0,0,0],[1,1,1]);deck(1.045,13,3.8,true)
 rounded(paint.white,[-.35,1.54,0],[9.4,.98,3.10]);deck(2.10,10.25,3.5);rails(1.05,12.75,3.7,.36,true)
 rounded(paint.white,[-.10,2.49,0],[7.6,.81,2.83]);deck(2.96,8.7,3.17);rails(2.11,10.0,3.38)
 rounded(paint.white,[.20,3.28,0],[6.15,.65,2.40]);deck(3.68,6.9,2.75);rails(2.97,8.45,3.05);rails(3.69,6.65,2.62,.27)
 // Coral rescue boats sit in the side recesses, leaving the promenade silhouette open.
 for(const side of [-1,1])for(const x of [-2.65,-.25,2.15]){piece(sphere,paint.coral,[x,1.99,side*1.68],[.76,.18,.19]);rounded(paint.white,[x,2.13,side*1.68],[1.22,.075,.29],.03)}
 rounded(paint.coral,[-1.1,4.00,0],[.95,.72,.72],.11);rounded(paint.navy,[-1.1,4.39,0],[1.03,.13,.79],.05);rounded(paint.gold,[-1.1,4.15,0],[.98,.10,.75],.025)
 beam(new THREE.Vector3(2.20,3.70,0),new THREE.Vector3(2.20,4.39,0),.025,paint.white)
 const flag=new THREE.BufferGeometry();flag.setAttribute('position',new THREE.Float32BufferAttribute([2.22,4.36,0,2.80,4.20,.06,2.22,4.09,0,2.22,4.36,.015,2.22,4.09,.015,2.80,4.20,.075],3));flag.computeVertexNormals();bases.push(flag);piece(flag,paint.coral,[0,0,0],[1,1,1])
 // The aft plunge pool and two sun loungers read from the harbor without tiny text or textures.
 piece(cylinder,paint.white,[-5.28,1.085,0],[.68,.075,.47]);piece(cylinder,paint.teal,[-5.28,1.128,0],[.57,.018,.37]);for(const side of [-1,1])rounded(paint.wood,[-5.20,1.12,side*1.08],[.92,.08,.35],.035)
 const geometry=mergeGeometries(parts)!,material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0});geometry.name='cruise-structure';parts.forEach(part=>part.dispose());bases.forEach(base=>base.dispose());a.kit.geometries.push(geometry);a.kit.extras.push(material)
 const structure=new THREE.Mesh(geometry,material);structure.name='cruise-structure';structure.castShadow=structure.receiveShadow=true;body.add(structure)
 const panes:{p:[number,number,number];s:[number,number,number];front?:boolean}[]=[]
 function windowRow(x0:number,x1:number,y:number,z:number,width:number,height:number,step=.68){for(let x=x0;x<=x1+.001;x+=step)for(const side of [-1,1])panes.push({p:[x,y,side*z],s:[width,height,.035]})}
 windowRow(-4.7,2.75,.48,1.88,.22,.22,.68);windowRow(-4.45,3.75,1.58,1.568,.43,.42);windowRow(-3.55,3.30,2.51,1.432,.43,.38);windowRow(-2.65,2.75,3.30,1.217,.42,.32)
 for(const z of [-.75,0,.75])panes.push({p:[3.287,3.29,z],s:[.53,.34,.04],front:true})
 const paneGeometry=new THREE.BoxGeometry(1,1,1),paneMaterial=new THREE.MeshStandardMaterial({color:0x326c79,roughness:.27,metalness:.12,emissive:0xffce7c,emissiveIntensity:0}),windows=new THREE.InstancedMesh(paneGeometry,paneMaterial,panes.length);windows.name='cruise-windows'
 panes.forEach((pane,index)=>{position.set(...pane.p);size.set(...pane.s);quaternion.setFromAxisAngle(up,pane.front?Math.PI/2:0);matrix.compose(position,quaternion,size);windows.setMatrixAt(index,matrix)});windows.instanceMatrix.needsUpdate=true;body.add(windows);a.kit.geometries.push(paneGeometry);a.kit.extras.push(paneMaterial);a.kit.instances.push(windows)
 return{root,body,windows,geometry,update(time:number,reduced:boolean,day:number){const t=Number.isFinite(time)?time:0,light=Number.isFinite(day)?THREE.MathUtils.clamp(day,0,1):1;body.position.y=reduced?0:Math.sin(t*.70)*.035;body.rotation.x=reduced?0:Math.sin(t*.48+.7)*.004;paneMaterial.emissiveIntensity=(1-light)*.85}}
}
