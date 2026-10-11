import * as THREE from 'three'
import type { ArtKit, ArtColor } from './art-kit.ts'
import type { CharacterAppearance } from './character-appearance.ts'
import { characterSocket } from './character-sockets.ts'
import { mergeCharacterParts } from './character-mesh.ts'

/** Original garment volumes replace the source anatomy, while its rig supplies continuous motion. */
export function createCharacterGarments(kit:ArtKit,model:THREE.Object3D,appearance:CharacterAppearance){
    const groups=new Map<THREE.Object3D,THREE.Mesh[]>(),style=appearance.style
    function part(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:ArtColor,p:[number,number,number],s:[number,number,number]){
        const mesh=kit.mesh(geometry,color,p,s,parent,true,false),parts=groups.get(parent)??[];parts.push(mesh);groups.set(parent,parts);return mesh
    }
    function at(name:string,point:THREE.Vector3){return characterSocket(model.getObjectByName(name)!,point)}
    const chest=at('spine_03',new THREE.Vector3(0,1.8,0))
    if(style==='bob'){
        const poncho=new THREE.CylinderGeometry(.29,.5,.78,8);kit.geometries.push(poncho)
        part(chest,poncho,appearance.coat,[0,-.04,0],[1,1,.62])
        part(chest,kit.rounded,'cream',[0,.27,.21],[.26,.1,.05])
        part(chest,kit.rounded,'gold',[0,-.35,.26],[.73,.045,.025])
    }else if(style==='beanie'){
        part(chest,kit.rounded,'cream',[0,0,0],[.78,.65,.44])
        part(chest,kit.rounded,appearance.coat,[-.2,-.02,.055],[.39,.72,.49])
        part(chest,kit.rounded,appearance.coat,[.2,-.02,.055],[.39,.72,.49])
        for(const side of [-1,1])part(chest,kit.rounded,'wood',[side*.2,-.18,.31],[.2,.15,.025])
    }else{
        part(chest,kit.rounded,appearance.coat,[0,-.04,0],[style==='puff'?.72:.82,.76,.47])
        part(chest,kit.rounded,'cream',[0,.27,.245],[.19,.1,.035])
        if(style==='puff'){
            part(chest,kit.rounded,'sand',[0,-.22,.255],[.5,.53,.04])
            part(chest,kit.rounded,'wood',[0,-.29,.282],[.27,.17,.025])
        }else for(let i=0;i<3;i++)part(chest,kit.sphere,'cream',[.1,.11-i*.15,.248],[.018,.018,.012])
    }
    part(chest,kit.cylinder,appearance.skin,[0,.31,0],[.12,.23,.12])
    function limb(from:string,to:string,color:ArtColor,width:number,depth=width){
        const a=model.getObjectByName(from)!.getWorldPosition(new THREE.Vector3()),b=model.getObjectByName(to)!.getWorldPosition(new THREE.Vector3()),direction=b.clone().sub(a),length=direction.length()
        const root=at(from,a.clone().lerp(b,.5)),mesh=part(root,kit.rounded,color,[0,0,0],[width,length+.07,depth])
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize())
    }
    for(const side of ['l','r']){
        const arm=style==='beanie'?'cream':appearance.coat
        limb('upperarm_'+side,'lowerarm_'+side,arm,style==='bob'?.34:.3,.3)
        limb('lowerarm_'+side,'hand_'+side,style==='puff'||style==='beanie'?appearance.skin:appearance.coat,.23,.24)
        const handBone=model.getObjectByName('hand_'+side)!,handPosition=handBone.getWorldPosition(new THREE.Vector3()),sign=side==='l'?1:-1
        handPosition.x+=sign*.065
        const hand=at('hand_'+side,handPosition)
        part(hand,kit.rounded,appearance.skin,[0,0,0],[.19,.22,.19])
        part(hand,kit.sphere,appearance.skin,[0,-.08,.07],[.06,.07,.06])
        const legWidth=style==='beanie'?.38:style==='bob'?.34:.31
        limb('thigh_'+side,'calf_'+side,appearance.trousers,legWidth,.35)
        limb('calf_'+side,'foot_'+side,appearance.trousers,legWidth-.035,.32)
        const foot=model.getObjectByName('foot_'+side)!.getWorldPosition(new THREE.Vector3()),shoe=at('foot_'+side,new THREE.Vector3(foot.x,.14,.035))
        part(shoe,kit.rounded,'gold',[0,0,0],[.33,.23,.49])
        part(shoe,kit.rounded,'cream',[0,-.095,.01],[.35,.065,.51])
        for(let i=0;i<2;i++)part(shoe,kit.rounded,'cream',[0,.12,.04+i*.065],[.17,.02,.025])
    }
    groups.forEach((parts,parent)=>mergeCharacterParts(kit,parts,parent))
}
