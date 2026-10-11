import * as THREE from 'three'
import { mergeCharacterParts } from './character-mesh.ts'
import type { ArtKit, ArtColor } from './art-kit'
import type { HatId } from './seasonal-hats'

/** Original procedural accessories, built only when first selected. */
export function createHatWardrobe(kit: ArtKit, head: THREE.Object3D) {
    const cache = new Map<HatId, THREE.Group>()
    const dome = new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI/2)
    kit.geometries.push(dome)
    let active: THREE.Group | undefined
    function build(id: HatId) {
        const group=new THREE.Group(), pieces:THREE.Mesh[]=[];head.add(group)
        const part=(geometry:THREE.BufferGeometry,color:ArtColor,position:[number,number,number],scale:[number,number,number])=>{
            const value=kit.mesh(geometry,color,position,scale,group,true,false);pieces.push(value);return value
        }
        const band=(color:ArtColor,width=.29)=>part(kit.cylinder,color,[0,.2,-.015],[width,.075,.255])
        if(id==='everyday') {
            part(dome,'blue',[0,.2,-.025],[.29,.2,.255]);band('blue')
            part(kit.rounded,'blue',[0,.205,.24],[.4,.045,.26]).rotation.x=-.1
            part(kit.rounded,'gold',[0,.295,.215],[.075,.055,.02])
        } else if(id==='birthday') {
            part(kit.cone,'gold',[0,.49,-.015],[.28,.62,.26]);band('coral')
            part(kit.sphere,'coral',[0,.815,-.015],[.075,.075,.075])
            for(const [x,y,z] of [[-.12,.37,.17],[.08,.5,.12],[-.02,.66,.06]])part(kit.sphere,'blue',[x!,y!,z!],[.04,.04,.015])
        } else if(id==='christmas') {
            const shape=new THREE.LatheGeometry([new THREE.Vector2(.275,0),new THREE.Vector2(.24,.15),new THREE.Vector2(.15,.35),new THREE.Vector2(.07,.5),new THREE.Vector2(.01,.57)],16)
            const positions=shape.getAttribute('position')
            for(let i=0;i<positions.count;i++){const y=positions.getY(i);positions.setX(i,positions.getX(i)+y*y*.65)}
            shape.computeVertexNormals();kit.geometries.push(shape)
            part(shape,'red',[0,.22,-.015],[1,1,1]);band('cream',.305)
            part(kit.sphere,'cream',[.225,.77,-.015],[.105,.105,.105])
        } else if(id==='halloween') {
            part(kit.cylinder,'violet',[0,.205,-.015],[.43,.05,.36])
            part(kit.cone,'violet',[-.04,.49,-.015],[.285,.62,.25]).rotation.z=.15
            band('coral');part(kit.rounded,'gold',[0,.27,.238],[.12,.09,.035])
            part(kit.cone,'violet',[-.12,.79,-.015],[.1,.25,.085]).rotation.z=.8
        } else {
            part(dome,'wood',[0,.2,-.025],[.295,.22,.26]);band('gold')
            for(let i=0;i<5;i++){
                const angle=(i-2)*.4
                part(kit.sphere,i%2?'coral':'gold',[Math.sin(angle)*.31,.36+Math.cos(angle)*.23,-.2],[.09,.24,.035]).rotation.z=-angle
            }
            for(const x of [-.08,.08])part(kit.sphere,'navy',[x,.32,.23],[.025,.035,.02])
            part(kit.cone,'coral',[0,.26,.28],[.055,.12,.065]).rotation.x=Math.PI/2
        }
        mergeCharacterParts(kit,pieces,group);cache.set(id,group);return group
    }
    return {set(id:HatId){if(active)active.visible=false;active=cache.get(id)??build(id);active.visible=true}}
}
