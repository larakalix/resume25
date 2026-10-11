import * as THREE from 'three'
import type { ArtColor, ArtKit } from './art-kit'
import { mergeCharacterParts } from './character-mesh.ts'
import { createHatWardrobe } from './character-hats.ts'
import type { CharacterMotionInput } from './character-motion.ts'

/** Original illustrated engineer: relaxed tailoring, human proportions and articulated limbs. */
export function createCharacter(kit: ArtKit, options: { coat?: ArtColor; skin?: ArtColor; trousers?: ArtColor; glasses?: boolean; compact?: boolean } = {}) {
    const { mesh, rounded, sphere, torus, box } = kit
    const avatar=new THREE.Group(),torso=new THREE.Group(),head=new THREE.Group(),eyes=new THREE.Group()
    avatar.add(torso);torso.add(head);head.add(eyes);kit.scene.add(avatar);head.position.set(0,2.27,0)
    const buckets=new Map<THREE.Object3D,THREE.Mesh[]>(),compactParts:THREE.Mesh[]=[]
    function part(geometry:THREE.BufferGeometry,color:ArtColor,position:[number,number,number],scale:[number,number,number],parent:THREE.Object3D,animated=false) {
        const value=mesh(geometry,color,position,scale,parent,true,false)
        if(options.compact&&!animated)compactParts.push(value)
        else {const bucket=buckets.get(parent)??[];bucket.push(value);buckets.set(parent,bucket)}
        return value
    }
    const coat=options.coat??'blue',skin=options.skin??'skin',trousers=options.trousers??'navy'
    // Open overshirt, dropped shoulders and a small cross-body tool satchel.
    part(rounded,coat,[0,1.58,0],[.66,.75,.36],torso)
    part(rounded,'cream',[0,1.62,.19],[.18,.56,.04],torso)
    for(const side of [-1,1]) {
        part(rounded,coat,[side*.13,1.91,.19],[.18,.16,.06],torso).rotation.z=side*.32
        part(rounded,'gold',[side*.19,1.65,.205],[.03,.025,.025],torso)
    }
    part(rounded,skin,[0,2.025,0],[.18,.2,.18],torso)
    part(rounded,'coral',[-.33,1.31,-.01],[.3,.36,.22],torso)
    part(rounded,'wood',[-.33,1.44,.11],[.31,.09,.035],torso)
    part(rounded,'gold',[-.33,1.35,.13],[.05,.045,.025],torso)
    part(box,'wood',[.015,1.63,.225],[.045,.83,.025],torso).rotation.z=-.61
    part(box,'wood',[.015,1.63,-.205],[.045,.83,.025],torso).rotation.z=.61
    // Tapered face, projecting nose, ears, brows and an irregular hair silhouette.
    part(sphere,skin,[0,0,0],[.235,.29,.225],head)
    part(sphere,skin,[0,-.155,.035],[.16,.135,.16],head)
    for(const side of [-1,1]) {
        part(sphere,skin,[side*.228,-.015,0],[.045,.075,.045],head)
        part(sphere,'cream',[side*.095,.035,.207],[.068,.045,.018],eyes,!!options.compact)
        part(sphere,'navy',[side*.093,.035,.225],[.027,.035,.013],eyes,!!options.compact)
        part(rounded,'hair',[side*.095,.115,.201],[.105,.025,.025],head).rotation.z=side*.08
        if(options.glasses!==false)part(torus,'navy',[side*.103,.04,.235],[.092,.07,.045],head)
    }
    if(options.glasses!==false)part(box,'navy',[0,.04,.243],[.06,.018,.02],head)
    part(sphere,skin,[0,-.035,.225],[.045,.065,.065],head)
    part(rounded,'wood',[0,-.135,.202],[.07,.012,.012],head)
    const hairCap=new THREE.SphereGeometry(1,14,9,0,Math.PI*2,0,Math.PI*.55);kit.geometries.push(hairCap)
    part(hairCap,'hair',[0,.065,-.025],[.25,.25,.235],head)
    for(const [x,y,z,angle] of [[-.16,.15,.13,-.4],[0,.2,.18,.2],[.15,.18,.13,.55]])part(rounded,'hair',[x!,y!,z!],[.14,.12,.095],head).rotation.z=angle!
    for(const side of [-1,1])part(rounded,'hair',[side*.211,.015,-.025],[.05,.15,.15],head)
    const arms:THREE.Group[]=[],legs:THREE.Group[]=[],knees:THREE.Group[]=[]
    for(const side of [-1,1]) {
        const arm=new THREE.Group();arm.position.set(side*.39,1.87,0);torso.add(arm)
        part(rounded,coat,[0,-.25,0],[.22,.58,.25],arm,true)
        part(rounded,'cream',[0,-.53,0],[.2,.075,.23],arm,true)
        part(sphere,skin,[0,-.66,.015],[.085,.15,.075],arm,true)
        part(sphere,skin,[-side*.075,-.62,.045],[.035,.075,.04],arm,true)
        arms.push(arm)
        const leg=new THREE.Group(),knee=new THREE.Group();leg.position.set(side*.18,1.18,0);knee.position.y=-.5;leg.add(knee);avatar.add(leg)
        part(rounded,trousers,[0,-.26,0],[.32,.57,.35],leg)
        part(rounded,trousers,[0,-.23,0],[.29,.54,.31],knee)
        part(rounded,'sand',[0,-.455,0],[.29,.08,.31],knee)
        part(rounded,'gold',[0,-.54,.02],[.25,.24,.3],knee)
        part(rounded,'gold',[0,-.565,.13],[.28,.16,.38],knee)
        part(rounded,'cream',[0,-.64,.1],[.3,.08,.43],knee)
        part(box,'cream',[0,-.51,.27],[.14,.035,.025],knee)
        legs.push(leg);knees.push(knee)
    }
    buckets.forEach((parts,parent)=>mergeCharacterParts(kit,parts,parent))
    if(options.compact)mergeCharacterParts(kit,compactParts,avatar)
    const hats=options.compact?undefined:createHatWardrobe(kit,head);hats?.set('everyday')
    return {avatar,torso,head,eyes,arms,legs,knees,hats}
}

/** Offline recovery and residents keep the original procedural art path. */
export function createProceduralPlayer(kit: ArtKit, options: Parameters<typeof createCharacter>[1] = {}) {
    const player = createCharacter(kit, options)
    let gait = 0, walking = 0, elapsed = 0
    const motion = { state: 'idle', update(dt: number, input: CharacterMotionInput) {
        elapsed += dt; gait += input.speed * dt * 2.9
        walking += (Math.min(1, input.speed / 3.6) - walking) * (1 - Math.exp(-dt * 14))
        const step = input.reduced ? 0 : Math.sin(gait) * .62 * walking
        player.legs[0]!.rotation.x = step; player.legs[1]!.rotation.x = -step
        player.knees[0]!.rotation.x = input.reduced ? 0 : Math.max(0, -Math.sin(gait)) * .65 * walking
        player.knees[1]!.rotation.x = input.reduced ? 0 : Math.max(0, Math.sin(gait)) * .65 * walking
        player.arms[0]!.rotation.x = -step * .7; player.arms[1]!.rotation.x = step * .7
        player.arms[1]!.rotation.z = input.waving ? -1.9 + (input.reduced ? 0 : Math.sin(elapsed * 11) * .18) : input.y > .1 ? -.6 : -.08
        player.arms[0]!.rotation.z = input.y > .1 ? .6 : .08
        player.torso.position.y = input.reduced ? 0 : Math.abs(Math.sin(gait)) * .045 * walking
        player.head.rotation.z = input.reduced ? 0 : input.waving ? -.1 : Math.sin(gait) * .012 * walking
        motion.state = input.y > 0 ? 'jumpAir' : input.speed > 4 ? 'run' : input.speed > .05 ? 'walk' : 'idle'
    } }
    return { avatar: player.avatar, hats: player.hats, motion, source: 'procedural-recovery' as const, dispose() {} }
}
