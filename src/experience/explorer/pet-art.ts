import * as THREE from 'three'
import type { ArtKit, ArtColor } from './art-kit.ts'
import type { WorldPet } from './types.ts'
import type { PetWalker } from './population.ts'
import { mergeCharacterParts } from './character-mesh.ts'

/** Original cartoon pets: articulated paws, oversized faces and expressive tails. */
export function createPetArt(kit:ArtKit,pet:WorldPet){
    const avatar=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group(),tail=new THREE.Group(),legs:THREE.Group[]=[],buckets=new Map<THREE.Object3D,THREE.Mesh[]>()
    avatar.add(body);body.add(head,tail);kit.scene.add(avatar)
    const dog=pet.species==='dog',coat:ArtColor=dog?'gold':'navy'
    function part(geometry:THREE.BufferGeometry,color:ArtColor,p:[number,number,number],s:[number,number,number],parent:THREE.Object3D){const mesh=kit.mesh(geometry,color,p,s,parent,true,false),bucket=buckets.get(parent)??[];bucket.push(mesh);buckets.set(parent,bucket);return mesh}
    part(kit.rounded,coat,[0,.43,0],[.42,.4,.7],body)
    part(kit.rounded,'cream',[0,.38,.25],[.3,.3,.2],body)
    head.position.set(0,.66,.3)
    part(kit.sphere,coat,[0,0,0],[.29,.27,.27],head)
    part(kit.sphere,'cream',[0,-.08,.18],[.19,.12,.15],head)
    part(kit.sphere,'navy',[0,-.02,.29],[.07,.05,.04],head)
    for(const side of [-1,1]){
        part(kit.sphere,'cream',[side*.12,.06,.22],[.07,.09,.035],head)
        part(kit.sphere,'navy',[side*.12,.065,.247],[.031,.05,.017],head)
        const ear=part(dog?kit.rounded:kit.cone,dog?'wood':'navy',[side*.22,dog ? .02 : .22,dog?-.015:0],dog?[.15,.32,.13]:[.12,.24,.12],head);ear.rotation.z=side*(dog ? .2 : -.18)
        if(!dog)part(kit.cone,'coral',[side*.22,.22,.04],[.065,.14,.04],head).rotation.z=-side*.18
    }
    part(kit.rounded,dog?'coral':'mint',[0,-.2,-.015],[.39,.07,.35],head)
    part(kit.sphere,'gold',[0,-.23,.19],[.05,.05,.025],head)
    for(const x of [-.145,.145])for(const z of [-.24,.23]){
        const leg=new THREE.Group();leg.position.set(x,.35,z);body.add(leg);legs.push(leg)
        part(kit.rounded,coat,[0,-.1,0],[.13,.26,.14],leg);part(kit.rounded,'cream',[0,-.26,.035],[.15,.12,.21],leg)
    }
    tail.position.set(0,.52,-.32)
    if(dog){const t=part(kit.rounded,'gold',[0,.12,-.12],[.13,.15,.35],tail);t.rotation.x=.6;part(kit.sphere,'cream',[0,.2,-.24],[.09,.09,.09],tail)}
    else{
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.05,.17,-.2),new THREE.Vector3(.1,.42,-.23),new THREE.Vector3(.02,.5,-.2)]),geometry=new THREE.TubeGeometry(curve,12,.055,7,false);kit.geometries.push(geometry);part(geometry,'navy',[0,0,0],[1,1,1],tail)
    }
    buckets.forEach((parts,parent)=>mergeCharacterParts(kit,parts,parent))
    let gait=0
    return{avatar,update(dt:number,state:PetWalker,reduced:boolean,elapsed:number){
        gait+=state.speed*dt*7
        legs.forEach((leg,i)=>{leg.rotation.x=reduced?0:Math.sin(gait+(i===0||i===3?0:Math.PI))*.5*Math.min(1,state.speed)})
        body.position.y=reduced?0:state.playing?Math.abs(Math.sin(state.reaction*8))*.28:Math.abs(Math.sin(gait))*.025*Math.min(1,state.speed)
        head.rotation.z=reduced?0:state.reaction>0?Math.sin(elapsed*7)*.12:state.mode==='chatting' ? .1 : 0
        tail.rotation.y=reduced?0:Math.sin(elapsed*(state.reaction>0?19:7))*((state.mode==='chatting'||state.following) ? .6 : .16)
        body.rotation.z=reduced?0:state.reaction>0&&!dog?Math.sin(elapsed*6)*.08:0
    }}
}
