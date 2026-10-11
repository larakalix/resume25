import * as THREE from 'three'
import type {CompiledWorld} from '../archipelago/compile.ts'
import type {GlobeArtist} from './art-kit.ts'
import {random,wet as legacyWet,pathDistance as legacyPathDistance} from './geography.ts'
import {bridge,bridgeFootprint} from './bridge.ts'
import {dockFootprint} from './duck-dock.ts'

export function createNatureDetails(a:GlobeArtist,world?:CompiledWorld){
 const frameAt=a.frameAt,wet=world?.wet??legacyWet,pathDistance=world?.pathDistance??legacyPathDistance
 const {kit,scene,mesh,root}=a,rng=random(4718),shape=new THREE.Shape()
 shape.moveTo(0,0);shape.bezierCurveTo(.12,.28,.29,.23,.22,.06);shape.bezierCurveTo(.28,-.11,.08,-.18,0,0)
 const wingGeometry=new THREE.ShapeGeometry(shape,8),wingMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,side:THREE.DoubleSide});kit.geometries.push(wingGeometry);kit.extras.push(wingMaterial)
 const wings=new THREE.InstancedMesh(wingGeometry,wingMaterial,24),bodies=new THREE.InstancedMesh(kit.sphere,kit.materials.navy,12),matrix=new THREE.Matrix4(),local=new THREE.Matrix4(),wingLocal=new THREE.Matrix4(),rotation=new THREE.Matrix4(),scale=new THREE.Matrix4()
 for(let i=0;i<24;i++)wings.setColorAt(i,new THREE.Color([0xe8bc62,0xe78a70,0x9282ad,0x7bc8cb][Math.floor(i/2)%4]!));scene.add(wings,bodies);kit.instances.push(wings,bodies)
 const clover=new THREE.InstancedMesh(kit.sphere,kit.materials.mint,360);let leaves=0
 for(let i=0;i<160&&leaves<360;i++){const p={x:(rng()-.5)*48,z:(rng()-.5)*44};if(world?(world.surfaceAt(p)!=='grass'||world.blocked(p)):(wet(p)||dockFootprint(p,.3)||bridgeFootprint(p,bridge.vegetationMargin)||pathDistance(p)<1.8))continue;matrix.copy(frameAt(p.x,p.z));for(let j=0;j<3;j++){local.makeScale(.10,.025,.08);local.setPosition(Math.cos(j*2.1)*.07,.035,Math.sin(j*2.1)*.07);wingLocal.multiplyMatrices(matrix,local);clover.setMatrixAt(leaves++,wingLocal)}}
 clover.count=leaves;clover.receiveShadow=true;scene.add(clover);kit.instances.push(clover)
 for(let i=0;i<42;i++){const angle=i/42*Math.PI*2,p={x:(world?.pond.x??21)+Math.cos(angle)*(4.7+rng()*.4),z:(world?.pond.z??5)+Math.sin(angle)*(4.8+rng()*.4)};if(wet(p)||dockFootprint(p,.4)||pathDistance(p)<1.5)continue;const rock=root(p.x,p.z);mesh(kit.sphere,i%3?'sand':'cream',[0,.06,0],[.12+rng()*.15,.08+rng()*.08,.10+rng()*.13],rock)}
 const patches=world?world.treeSites.slice(0,4):[{x:-13,z:14},{x:12,z:-15},{x:13,z:8},{x:0,z:24}]
 return{update(time:number,reduced:boolean,count:number,day:number){
  const t=reduced?0:time;wings.visible=bodies.visible=day>.35;wings.count=count*2;bodies.count=count
  for(let i=0;i<count;i++){const patch=patches[i%patches.length]!,x=patch.x+Math.sin(t*.5+i*2.2)*1.1,z=patch.z+Math.cos(t*.4+i*2.2)*.8;matrix.copy(frameAt(x,z));local.makeTranslation(0,1.0+(reduced?0:Math.sin(t*1.1+i)*.18),0);matrix.multiply(local);rotation.makeRotationY(t*.5+i);matrix.multiply(rotation)
   local.makeScale(.022,.022,.105);wingLocal.multiplyMatrices(matrix,local);bodies.setMatrixAt(i,wingLocal)
   for(const side of [-1,1]){rotation.makeRotationZ(side*(reduced?.45:Math.sin(t*17+i)*.9));local.makeRotationX(-Math.PI/2);rotation.multiply(local);scale.makeScale(side,1,1);rotation.multiply(scale);wingLocal.multiplyMatrices(matrix,rotation);wings.setMatrixAt(i*2+(side===1?1:0),wingLocal)}
  }wings.instanceMatrix.needsUpdate=bodies.instanceMatrix.needsUpdate=true
 }}
}
