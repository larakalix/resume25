import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ArtKit } from './art-kit.ts'
import { createHatWardrobe } from './character-hats.ts'
import { mergeCharacterParts } from './character-mesh.ts'
import { createCharacterMotion } from './character-motion.ts'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { applyCharacterAppearance, playerAppearance } from './character-appearance.ts'
import { characterSocket as socket } from './character-sockets.ts'
import { createCharacterGarments } from './character-garments.ts'
import type { CharacterAppearance } from './character-appearance.ts'

/** Borrow shared geometry/textures; every actor owns its skeleton, materials and playback. */
export function createRiggedCharacter(kit: ArtKit, asset: GLTF, options: { appearance?: CharacterAppearance; resident?: boolean; phase?: number } = {}) {
    const avatar = new THREE.Group(), model = clone(asset.scene), appearance = options.appearance ?? playerAppearance
    avatar.add(model); kit.scene.add(avatar); avatar.updateMatrixWorld(true)
    const head = model.getObjectByName('Head')!, spine = model.getObjectByName('spine_03')!
    const replacement = new Map<THREE.Material, THREE.MeshToonMaterial>(), skeletons = new Set<THREE.Skeleton>()
    model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        const original = object.material as THREE.MeshStandardMaterial
        let material = replacement.get(original)
        if (!material) {
            material = new THREE.MeshToonMaterial({ color: original.color, map: original.map, vertexColors: !!object.geometry.attributes.color, gradientMap: kit.ramp, side: THREE.DoubleSide })
            if (original.name === 'MI_Superhero_Male') applyCharacterAppearance(material, kit, appearance)
            if (original.name === 'Engineer_Hair' || original.name === 'MI_Hair_1') { material.color.set(kit.palette[appearance.hair]); object.visible = appearance.style === 'parted' }
            replacement.set(original, material)
        }
        object.material = material; object.castShadow = object.receiveShadow = true; object.frustumCulled = false
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
    })
    const outlined: THREE.SkinnedMesh[]=[]
    model.traverse(object=>{if(object instanceof THREE.SkinnedMesh&&object.visible)outlined.push(object)})
    const inkMaterials: THREE.Material[]=[]
    for(const source of outlined){
        const ink=new THREE.MeshBasicMaterial({color:kit.palette.navy,side:THREE.BackSide})
        ink.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normal*.009;')}
        ink.customProgramCacheKey=()=> 'cartoon-skinned-ink-1';inkMaterials.push(ink)
        const hull=new THREE.SkinnedMesh(source.geometry,ink);hull.bind(source.skeleton,source.bindMatrix);hull.frustumCulled=false;hull.position.copy(source.position);hull.quaternion.copy(source.quaternion);hull.scale.copy(source.scale);source.parent!.add(hull)
    }
    const hatSocket = socket(head, new THREE.Vector3(0, 2.376, -.015), .65), hats = options.resident ? undefined : createHatWardrobe(kit, hatSocket)
    hats?.set('everyday')
    const details: THREE.Mesh[] = []
    // Large, untextured eyes remain legible at game scale, with an original friendly face.
    for (const side of [-1, 1]) {
        details.push(kit.mesh(kit.sphere, 'cream', [side * .108, .055, .245], [.075, .095, .045], hatSocket, true, false))
        details.push(kit.mesh(kit.sphere, 'hair', [side * .108, .05, .282], [.032, .05, .025], hatSocket, true, false))
        const brow=kit.mesh(kit.rounded,appearance.hair,[side*.108,.173,.245],[.11,.025,.035],hatSocket,true,false);brow.rotation.z=-side*.12;details.push(brow)
    }
    details.push(kit.mesh(kit.sphere, appearance.skin, [0, -.04, .29], [.055, .045, .055], hatSocket, true, false))
    const smileGeometry=new THREE.TorusGeometry(.065,.012,4,12,Math.PI);kit.geometries.push(smileGeometry)
    const smile=kit.mesh(smileGeometry,'hair',[0,-.105,.259],[1,1,1],hatSocket,true,false);smile.rotation.z=Math.PI;details.push(smile)
    if (appearance.style !== 'parted') {
        details.push(kit.mesh(kit.sphere,appearance.hair,[0,.23,-.04],[.29,.19,.25],hatSocket,true,false))
        if(appearance.style==='bob')for(const side of [-1,1])details.push(kit.mesh(kit.rounded,appearance.hair,[side*.235,.03,-.04],[.14,.38,.31],hatSocket,true,false))
        if(appearance.style==='puff')for(let i=0;i<7;i++)details.push(kit.mesh(kit.sphere,appearance.hair,[Math.sin(i*2.4)*.22,.27+i%2*.055,Math.cos(i*2.4)*.18],[.14,.14,.14],hatSocket,true,false))
        if(appearance.style==='beanie') { details.push(kit.mesh(kit.sphere,'coral',[0,.27,-.02],[.31,.24,.28],hatSocket,true,false));details.push(kit.mesh(kit.rounded,'coral',[0,.16,.02],[.6,.13,.48],hatSocket,true,false));details.push(kit.mesh(kit.sphere,'cream',[0,.49,-.02],[.075,.075,.075],hatSocket,true,false)) }
    }
    if (appearance.glasses) {
        for (const side of [-1, 1]) details.push(kit.mesh(kit.torus, 'navy', [side * .103, .04, .235], [.092, .07, .045], hatSocket, true, false))
        details.push(kit.mesh(kit.box, 'navy', [0, .04, .243], [.06, .018, .02], hatSocket, true, false))
    }
    mergeCharacterParts(kit, details, hatSocket)
    const satchel = socket(spine, new THREE.Vector3(0, 1.86, 0)), bag: THREE.Mesh[] = []
    if (appearance.satchel) {
    bag.push(kit.mesh(kit.rounded, 'coral', [-.36, -.46, 0], [.3, .38, .24], satchel, true, false))
    bag.push(kit.mesh(kit.rounded, 'wood', [-.36, -.33, .13], [.31, .1, .035], satchel, true, false))
    bag.push(kit.mesh(kit.rounded, 'gold', [-.36, -.43, .155], [.06, .055, .03], satchel, true, false))
    const strap = kit.mesh(kit.box, 'wood', [.015, -.1, .22], [.045, .95, .025], satchel, true, false); strap.rotation.z = -.65; bag.push(strap)
    }
    mergeCharacterParts(kit, bag, satchel)
    createCharacterGarments(kit,model,appearance)
    // A modest illustrated proportion keeps the face and seasonal silhouettes readable in the wide camera.
    head.scale.multiplyScalar(1.55)
    avatar.scale.set(appearance.width,appearance.height,appearance.width)
    const motion = createCharacterMotion(model, asset.animations, options.phase)
    return { avatar, hats, hatSocket, motion, source: 'quaternius' as const, dispose() { motion.dispose(); replacement.forEach(material => material.dispose());inkMaterials.forEach(material=>material.dispose()); skeletons.forEach(skeleton => skeleton.dispose()); avatar.removeFromParent() } }
}
