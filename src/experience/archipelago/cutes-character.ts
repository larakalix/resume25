import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { ArtKit } from '../explorer/art-kit.ts'
import { createHatWardrobe } from '../explorer/character-hats.ts'
import { characterSocket } from '../explorer/character-sockets.ts'
import type { HatId } from '../explorer/seasonal-hats.ts'
import type { CutesFamily, CutesVariant } from './cutes-assets.ts'
import { createCutesMotion } from './cutes-motion.ts'
import { addCutesPortrait, applyIvanOutfit } from './cutes-portrait.ts'

export interface CutesCharacterOptions { variant?: CutesVariant; scale?: number; phase?: number; seasonal?: boolean }

/** Real J-Toastie geometry/atlas and independent skinned rigs for the visitor and every resident. */
export function createCutesCharacter(kit: ArtKit, family: CutesFamily, options: CutesCharacterOptions = {}) {
    const variant = options.variant ?? 'visitor', source = family.get(variant), avatar = new THREE.Group(), normalizer = new THREE.Group(), model = clone(source.scene)
    avatar.name = variant === 'ivan' ? 'Ivan' : variant
    avatar.userData.characterFamily = 'cutes'; avatar.add(normalizer); normalizer.add(model); kit.scene.add(avatar)
    avatar.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(model), sourceHeight = bounds.max.y - bounds.min.y
    if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) { avatar.removeFromParent(); throw new Error('Invalid CUTES character dimensions') }
    const scale = 1.9 / sourceHeight
    normalizer.scale.setScalar(scale); normalizer.position.y = -bounds.min.y * scale
    avatar.updateMatrixWorld(true)
    const head = model.getObjectByName('Head')!, materials = new Set<THREE.Material>(), skeletons = new Set<THREE.Skeleton>(), ownGeometry: THREE.BufferGeometry[] = []
    model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        const originals = Array.isArray(object.material) ? object.material : [object.material]
        const replacements = originals.map(value => {
            const original = value as THREE.MeshStandardMaterial
            // The original gradient atlas supplies every authored colour. Toon lighting adds bands,
            // without flattening the model into an unrelated single-colour replacement material.
            const material = new THREE.MeshToonMaterial({ name: original.name, color: original.color, map: original.map, gradientMap: kit.ramp, side: original.side, transparent: original.transparent, opacity: original.opacity, alphaTest: original.alphaTest })
            materials.add(material)
            if (variant === 'ivan' && object instanceof THREE.SkinnedMesh) {
                const geometry = applyIvanOutfit(object, material)
                if (geometry) ownGeometry.push(geometry)
            }
            return material
        })
        object.material = Array.isArray(object.material) ? replacements : replacements[0]!
        object.castShadow = object.receiveShadow = true; object.frustumCulled = false
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
    })
    if (variant === 'ivan') addCutesPortrait(kit, head, 1.9)
    const hatSocket = characterSocket(head, new THREE.Vector3(0, 1.66, .03), 1.7)
    hatSocket.name = 'seasonal-hat'; hatSocket.scale.y *= .71
    const seasonal = options.seasonal ?? (variant === 'visitor' || variant === 'ivan'), wardrobe = seasonal ? createHatWardrobe(kit, hatSocket) : undefined
    hatSocket.visible = seasonal && variant === 'visitor'
    wardrobe?.set('everyday')
    const actorScale = options.scale ?? 1
    avatar.scale.setScalar(actorScale)
    const motion = createCutesMotion(model, source.animations, { scale: scale * actorScale, phase: options.phase, resident: variant !== 'visitor' })
    let disposed = false
    return {
        avatar, head, hatSocket, motion, clips: motion.clips, source: 'cutes' as const, isCutes: true as const,
        hats: { set(id: HatId) { hatSocket.visible = seasonal && (id !== 'everyday' || variant === 'visitor'); wardrobe?.set(id) } },
        posture(blend: number) { if (!disposed) motion.posture(blend) },
        express(_dt: number, _reduced: boolean) { /* The supplied idle/head animation owns expression. */ },
        dispose() {
            if (disposed) return
            disposed = true; motion.dispose(); materials.forEach(material => material.dispose()); skeletons.forEach(skeleton => skeleton.dispose()); ownGeometry.forEach(geometry => geometry.dispose()); avatar.removeFromParent()
        },
    }
}
export type CutesCharacter = ReturnType<typeof createCutesCharacter>
