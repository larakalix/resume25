import * as THREE from 'three'
import type { ArtKit, ArtColor } from './art-kit.ts'
import type { Point2 } from './types.ts'
import { naturePlacements } from './scenery-layout.ts'
import { mergeCharacterParts } from './character-mesh.ts'

/** Original solid-color planting: no alpha cards, bitmap foliage or external scene asset. */
export function createNatureArt(kit: ArtKit) {
    const placements=naturePlacements()
    function tree(point:Point2,index:number){
        const root=kit.surface(point.x,point.z),height=2.7+index%3*.4,parts:THREE.Mesh[]=[],canopy=new THREE.Group()
        root.rotateY(index*2.39996);root.add(canopy)
        kit.mesh(kit.cylinder,'wood',[0,height*.48,0],[.14,height*.96,.14],root)
        for(const side of [-1,1]){const branch=kit.mesh(kit.cylinder,'wood',[side*.27,height*.69,0],[.07,.8,.07],root);branch.rotation.z=side*-.65}
        const color:ArtColor=index%7===0?'coral':index%3?'green':'mint'
        for(let i=0;i<7;i++){
            const angle=i*2.39996,y=height+.25+(i%3)*.24
            parts.push(kit.mesh(kit.sphere,i===3?'grass':color,[Math.sin(angle)*.65,y,Math.cos(angle)*.55],[.94,.77,.85],canopy,true,false))
        }
        // A few large leaf marks, rather than hundreds of noisy cutout leaves.
        for(let i=0;i<5;i++)parts.push(kit.mesh(kit.leaf,index%3?'mint':'cream',[Math.sin(i*2.4)*.6,height+.8,Math.cos(i*2.4)*.55],[.13,.035,.2],canopy,true,false))
        mergeCharacterParts(kit,parts,canopy)
        const meshes:THREE.Mesh[]=[],materials:THREE.Material[]=[]
        canopy.traverse(object=>{if(object instanceof THREE.Mesh){const material=object.material as THREE.Material;material.transparent=true;meshes.push(object);materials.push(material)}})
        kit.occluders.push({meshes,materials})
    }
    for(const [i,point] of placements.entries()){
        const root=kit.surface(point.x,point.z,.035);root.rotateY(point.yaw)
        if(point.kind==='rock'){
            kit.mesh(kit.leaf,'pale',[0,.2,0],[point.scale*.9,point.scale*.55,point.scale*.7],root)
            kit.mesh(kit.box,'cream',[-.08,.33,.04],[.12,.025,.08],root)
        }else if(point.kind==='shrub'){
            for(let j=0;j<3;j++)kit.mesh(kit.sphere,j%2?'mint':'green',[(j-1)*.25,.22,Math.sin(j*2)*.12],[.34,.28,.3],root)
            for(let j=0;j<3;j++)kit.mesh(kit.sphere,i%3?'cream':'coral',[(j-1)*.24,.44,.1],[.075,.06,.075],root)
        }else{
            for(let j=0;j<3;j++){const blade=kit.mesh(kit.leaf,'green',[(j-1)*.1,.22,0],[.075,.28,.045],root);blade.rotation.z=(j-1)*-.35}
        }
    }
    return {tree,placementCount:placements.length}
}
