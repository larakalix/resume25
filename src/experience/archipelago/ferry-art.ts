import * as THREE from 'three'
import type {GlobeArtist} from '../globe/art-kit.ts'

export const FERRY_RIDER_OFFSET=.52
export const FERRY_CANOPY_HEIGHT=3.8

/** A small original passenger launch, owned by the world's art kit. */
export function createIslandFerry(a:GlobeArtist){
 const root=new THREE.Group();root.name='Orchard ferry';a.scene.add(root)
 const hull=a.mesh(a.kit.sphere,'blue',[0,.1,0],[1.45,.47,3],root,true)
 hull.name='ferry hull'
 a.block('cream',[0,.35,0],[2.6,.15,4.8],root,true)
 for(const side of [-1,1]){
  a.block('blue',[side*1.28,.65,0],[.15,.5,4.2],root,true)
  for(const z of [-1.2,1.4])a.mesh(a.kit.cylinder,'cream',[side*1.05,(FERRY_CANOPY_HEIGHT+.35)/2,z],[.045,FERRY_CANOPY_HEIGHT-.35,.045],root,true)
 }
 const canopy=a.block('coral',[0,FERRY_CANOPY_HEIGHT,.2],[2.6,.15,3.4],root,true);canopy.name='ferry canopy'
 const canopyMaterial=canopy.material.clone();canopyMaterial.transparent=true;a.kit.extras.push(canopyMaterial);canopy.material=canopyMaterial
 a.block('wood',[0,.62,1.25],[1.9,.2,.6],root,true)
 a.block('navy',[0,.85,-1.7],[1.0,.85,.5],root,true)
 const ring=a.mesh(a.kit.torus,'cream',[1.39,.77,.7],[.27,.27,.27],root,true);ring.rotation.y=Math.PI/2
 const pennant=a.mesh(a.kit.cone,'gold',[-.9,FERRY_CANOPY_HEIGHT+.35,.8],[.18,.4,.04],root,true);pennant.rotation.z=-Math.PI/2
 return{root,update(time:number,reduced:boolean,aboard=false){root.children[0]!.rotation.z=reduced?0:Math.sin(time*.8)*.012;canopyMaterial.opacity=aboard?.22:1;canopyMaterial.depthWrite=!aboard;canopy.castShadow=!aboard}}
}
