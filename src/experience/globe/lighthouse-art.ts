import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import type {LighthouseAsset} from './lighthouse-asset.ts'
import {lighthouse as legacyLighthouse} from './lighthouse.ts'

import {buildingMapPoint} from './building-footprint.ts'
import {buildBuildingSign} from './building-signs.ts'
import data from './assets/lighthouse.json' with {type:'json'}

export function buildLighthouse(a:GlobeArtist,asset:LighthouseAsset,location?:{x:number;z:number}){
 const lighthouse={...legacyLighthouse,...location},heightAt=a.heightAt
 let level=heightAt(lighthouse)
 for(let i=0;i<24;i++){const angle=i*Math.PI/12;level=Math.max(level,heightAt(buildingMapPoint(lighthouse,Math.cos(angle)*lighthouse.radius,Math.sin(angle)*lighthouse.radius)))}
 const root=a.root(lighthouse.x,lighthouse.z,0,level+.025);root.name=lighthouse.id
 asset.scene.scale.setScalar(lighthouse.scale);root.add(asset.scene);root.userData.source=data.source
 for(const mesh of asset.meshes){mesh.castShadow=mesh.receiveShadow=true;mesh.geometry.computeBoundingSphere()}
 const foundation=new THREE.CylinderGeometry(lighthouse.radius,lighthouse.radius,.9,24);a.kit.geometries.push(foundation);a.mesh(foundation,'cream',[0,-.45,0],[1,1,1],root)
 const glass=asset.meshes.find(mesh=>mesh.name==='lighthouse_glass')!,lamp=asset.meshes.find(mesh=>mesh.name===data.beacon.mesh)!
 // Authored geometry and its texture stay intact; the glass and lamp receive local lighting treatment.
 const glassMaterial=glass.material as THREE.MeshStandardMaterial;glassMaterial.transparent=true;glassMaterial.opacity=.28;glassMaterial.depthWrite=false;glass.castShadow=false
 const pivot=new THREE.Group();pivot.position.fromArray(data.beacon.center).multiplyScalar(lighthouse.scale);root.add(pivot)
 const rayGeometry=new THREE.ConeGeometry(1.1,7,20,1,true),rayMaterial=new THREE.MeshBasicMaterial({color:0xffe7ac,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});a.kit.geometries.push(rayGeometry);a.kit.extras.push(rayMaterial)
 const beam=new THREE.Mesh(rayGeometry,rayMaterial);beam.name='lighthouse-night-beam';beam.rotation.x=-Math.PI/2;beam.position.z=3.5;beam.visible=false;pivot.add(beam)
 const body=asset.meshes.find(mesh=>mesh.name==='lighthouse_01')!,surface=new THREE.Mesh(body.geometry,body.material);surface.scale.setScalar(lighthouse.scale);surface.updateMatrixWorld(true)
 const signX=pivot.position.x,hit=new THREE.Raycaster(new THREE.Vector3(signX,2.4,5),new THREE.Vector3(0,0,-1)).intersectObject(surface)[0]
 buildBuildingSign(a,'Bluebird Lighthouse',{position:[signX,2.4,(hit?.point.z??lighthouse.radius)+.14],width:2.1,theme:'navy'},root)
 a.fadeable(lighthouse.id,root,asset.meshes)
 return{root,beam,pivot,update(time:number,reduced:boolean,daylight:number){
  const dark=1-THREE.MathUtils.clamp(daylight,0,1)
  ;(lamp.material as THREE.MeshStandardMaterial).emissive.setHex(0xffdc86);(lamp.material as THREE.MeshStandardMaterial).emissiveIntensity=.08+dark*2
  ;(glass.material as THREE.MeshStandardMaterial).emissive.setHex(0xffd785);(glass.material as THREE.MeshStandardMaterial).emissiveIntensity=dark*.26
  beam.visible=dark>.25;pivot.rotation.y=reduced?.4:time*.24
 },dispose:asset.dispose}
}
