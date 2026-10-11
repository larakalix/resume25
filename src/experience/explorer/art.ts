import * as THREE from 'three'
import { createArtKit } from './art-kit'
import { createProceduralPlayer } from './character'
import { createRiggedCharacter } from './rigged-character'
import { residentAppearances } from './character-appearance'
import { disposeCharacterAsset } from './character-asset'
import { createNatureArt } from './nature-art'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createLandscape } from './landscape'
import { createObjectArt } from './object-art'
import { buildVillage } from './village-buildings'
import { residents, pets } from './world-data'
import { createPetArt } from './pet-art'

/** Original procedural village. Supporting models share the same geometry/material kit. */
export function createWorldArt(scene: THREE.Scene, characterAsset?: GLTF) {
    const kit=createArtKit(scene), nature=createNatureArt(kit), landscape=createLandscape(kit,nature), village=buildVillage(kit), objects=createObjectArt(kit)
    kit.batch(kit.staticMeshes)
    const player=characterAsset?createRiggedCharacter(kit,characterAsset):createProceduralPlayer(kit)
    const villagers=residents.map((person,index)=>{
        const appearance=residentAppearances[person.id]
        const model=characterAsset?createRiggedCharacter(kit,characterAsset,{resident:true,appearance,phase:index*.31+.15}):createProceduralPlayer(kit,{compact:true,glasses:appearance.glasses,coat:appearance.coat,skin:appearance.skin,trousers:appearance.trousers})
        return {person,model}
    })
    const companions=pets.map(pet=>({pet,...createPetArt(kit,pet)}))
    const playMeshes=Array.from({length:9},(_,i)=>kit.mesh(i%3?kit.sphere:kit.rounded,i%3===0?'blue':i%3===1?'coral':'gold',[0,0,0],[.32,.32,.32],scene,true,false))
    const birds=Array.from({length:5},()=>{const root=new THREE.Group();scene.add(root);for(const side of [-1,1]){const wing=kit.mesh(kit.cone,'cream',[side*.18,0,0],[.12,.48,.08],root,true,false);wing.rotation.z=side*1.1}return root})
    function glow(matrices: THREE.Matrix4[], round=false){
        const material=new THREE.MeshBasicMaterial({color:0xffd58a,transparent:true,opacity:0,depthWrite:false}), mesh=new THREE.InstancedMesh(round?kit.sphere:kit.box,material,matrices.length)
        matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));scene.add(mesh);kit.extras.push(material);kit.instances.push(mesh);return material
    }
    const windows=glow(village.windows), lamps=glow(village.lamps), bridgeLamps=glow(landscape.bridgeLamps,true)
    return {...player,...landscape,...village,...objects,villagers,companions,playMeshes,birds,nature,windowGlow:windows,lampGlow:lamps,bridgeGlow:bridgeLamps,occluders:kit.occluders,dispose(){player.dispose();villagers.forEach(villager=>villager.model.dispose());if(characterAsset)disposeCharacterAsset(characterAsset);kit.dispose()}}
}
